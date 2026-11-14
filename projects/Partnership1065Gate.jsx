import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tag, DollarSign, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function Partnership1065Gate({ open, onActivated, onCancel }) {
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null); // { valid, free, discount, codeRecord }
  const [promoError, setPromoError] = useState('');
  const [validating, setValidating] = useState(false);
  const [activating, setActivating] = useState(false);

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setValidating(true);
    setPromoError('');
    setPromoResult(null);
    try {
      const codes = await base44.entities.PromoCode.filter({
        code: promoCode.trim().toUpperCase(),
        is_active: true,
        feature: 'partnership_1065',
      });
      const code = codes[0];
      if (!code) {
        setPromoError('Invalid or inactive promo code.');
        setValidating(false);
        return;
      }
      if (code.expires_at && new Date(code.expires_at) < new Date()) {
        setPromoError('This promo code has expired.');
        setValidating(false);
        return;
      }
      if (code.max_uses > 0 && code.times_used >= code.max_uses) {
        setPromoError('This promo code has reached its maximum uses.');
        setValidating(false);
        return;
      }
      const isFree = code.discount_type === 'free';
      let finalPrice = 10;
      if (code.discount_type === 'percent') finalPrice = Math.max(0, 10 - (10 * code.discount_value / 100));
      if (code.discount_type === 'fixed') finalPrice = Math.max(0, 10 - code.discount_value);
      setPromoResult({ valid: true, free: isFree || finalPrice === 0, finalPrice, codeRecord: code });
    } catch (e) {
      setPromoError('Error validating code. Please try again.');
    }
    setValidating(false);
  };

  const activate = async (withPromo = false) => {
    setActivating(true);
    try {
      const user = await base44.auth.me();
      const tenantId = user?.tenant_id || user?.id || 'unknown';
      const amountPaid = withPromo && promoResult ? promoResult.finalPrice : 10;
      const promoUsed = withPromo && promoResult ? promoResult.codeRecord.code : null;

      await base44.entities.FeatureAddon.create({
        tenant_id: tenantId,
        feature: 'partnership_1065',
        activated_at: new Date().toISOString(),
        amount_paid: amountPaid,
        promo_code_used: promoUsed || '',
        status: 'active',
        activated_by_id: user?.id || '',
      });

      // Increment promo usage
      if (withPromo && promoResult?.codeRecord) {
        await base44.entities.PromoCode.update(promoResult.codeRecord.id, {
          times_used: (promoResult.codeRecord.times_used || 0) + 1,
        });
      }

      onActivated();
    } catch (e) {
      setPromoError('Activation failed. Please try again.');
    }
    setActivating(false);
  };

  const handleClose = () => {
    setPromoCode('');
    setPromoResult(null);
    setPromoError('');
    onCancel();
  };

  const canActivateFree = promoResult?.valid && promoResult?.free;
  const canActivatePaid = promoResult?.valid && !promoResult?.free;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-sky-600" />
            Partnership Tax Module — $10/mo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600">
            This module covers <strong>Form 1065 preparation</strong> and K-1 distribution.
            Activate it for <strong>$10 per partnership per month</strong>.
          </p>

          <div className="bg-sky-50 rounded-lg p-3 text-sm text-sky-800 border border-sky-100">
            <ul className="space-y-1 list-disc list-inside">
              <li>Form 1065 Partnership Tax Return projects</li>
              <li>K-1 preparation &amp; partner distribution tracking</li>
              <li>Full project workflow support</li>
            </ul>
          </div>

          {/* Promo Code Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Promo Code <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter code..."
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); setPromoError(''); }}
                onKeyDown={e => e.key === 'Enter' && validatePromo()}
                className="font-mono uppercase"
              />
              <Button variant="outline" onClick={validatePromo} disabled={!promoCode.trim() || validating}>
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
              </Button>
            </div>

            {promoError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {promoError}
              </p>
            )}

            {promoResult?.valid && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-md px-3 py-2 border border-green-200">
                <CheckCircle className="w-4 h-4" />
                {promoResult.free
                  ? <span>Code applied — <strong>FREE activation!</strong></span>
                  : <span>Code applied — price reduced to <strong>${promoResult.finalPrice.toFixed(2)}</strong></span>
                }
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={handleClose} disabled={activating}>
            Cancel
          </Button>
          {canActivateFree ? (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => activate(true)}
              disabled={activating}
            >
              {activating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Apply Code & Activate Free
            </Button>
          ) : canActivatePaid ? (
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={() => activate(true)}
              disabled={activating}
            >
              {activating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
              Activate for ${promoResult.finalPrice.toFixed(2)}
            </Button>
          ) : (
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={() => activate(false)}
              disabled={activating}
            >
              {activating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
              Activate for $10
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}