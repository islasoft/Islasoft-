import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const FEATURE_CONFIG = {
  partnership_1065: {
    title: 'Partnership Tax Module — $10/mo',
    description: 'This module covers Form 1065 preparation and K-1 distribution. Activate it for $10 per partnership per month.',
    price: 10,
  },
  equity_split_pro: {
    title: 'EquitySplit Pro — $10/mo',
    description: 'Full equity split and K-1 computation module for partnership clients. Activate it for $10 per firm per month.',
    price: 10,
  },
};

export default function FeatureGateModal({ feature, onActivated, onClose }) {
  const queryClient = useQueryClient();
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [validatedPromo, setValidatedPromo] = useState(null);

  const { data: settings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const list = await base44.entities.CompanySettings.list();
      return list[0] || null;
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ amountPaid, promoCodeUsed }) => {
      const user = await base44.auth.me();
      await base44.entities.FeatureAddon.create({
        tenant_id: settings.id,
        feature,
        activated_at: new Date().toISOString(),
        amount_paid: amountPaid,
        promo_code_used: promoCodeUsed || '',
        status: 'active',
        activated_by_id: user.id,
      });
      if (promoCodeUsed && validatedPromo) {
        await base44.entities.PromoCode.update(validatedPromo.id, {
          times_used: (validatedPromo.times_used || 0) + 1,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureAddons', feature] });
      toast.success('Module activated! You can now create this project.');
      onActivated();
    },
    onError: () => toast.error('Activation failed. Please try again.'),
  });

  const validatePromo = async () => {
    setPromoError('');
    if (!promoCode.trim()) return;
    const codes = await base44.entities.PromoCode.filter({ code: promoCode.trim().toUpperCase(), feature, is_active: true });
    const code = codes[0];
    if (!code) { setPromoError('Invalid or inactive promo code.'); return; }
    if (code.expires_at && new Date(code.expires_at) < new Date()) { setPromoError('This promo code has expired.'); return; }
    if (code.max_uses > 0 && code.times_used >= code.max_uses) { setPromoError('This promo code has reached its usage limit.'); return; }
    setValidatedPromo(code);
  };

  const getPrice = () => {
    const base = FEATURE_CONFIG[feature].price;
    if (!validatedPromo) return base;
    if (validatedPromo.discount_type === 'free') return 0;
    if (validatedPromo.discount_type === 'percent') return +(base * (1 - validatedPromo.discount_value / 100)).toFixed(2);
    if (validatedPromo.discount_type === 'fixed') return Math.max(0, base - validatedPromo.discount_value);
    return base;
  };

  const config = FEATURE_CONFIG[feature];
  const price = getPrice();
  const isFree = validatedPromo?.discount_type === 'free';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600">{config.description}</p>

          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Tag className="w-3 h-3" /> Promo Code <span className="text-slate-400 font-normal">(optional)</span></Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter promo code..."
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setValidatedPromo(null); setPromoError(''); }}
              />
              <Button variant="outline" size="sm" onClick={validatePromo} disabled={!promoCode.trim()}>Apply</Button>
            </div>
            {promoError && <p className="text-xs text-red-500">{promoError}</p>}
            {validatedPromo && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {isFree ? 'Free activation!' : `Discount applied — final price: $${price}`}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-sky-600 hover:bg-sky-700"
              onClick={() => activateMutation.mutate({ amountPaid: price, promoCodeUsed: validatedPromo?.code })}
              disabled={activateMutation.isPending || !settings}
            >
              {activateMutation.isPending ? 'Activating...' : isFree ? 'Apply Code & Activate Free' : `Activate for $${price}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}