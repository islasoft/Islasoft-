import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Copy, ExternalLink, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function StripePaymentLinkDialog({ client, onClose }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);

  const handleGenerate = async () => {
    if (!amount || !description) {
      toast.error('Please enter amount and description');
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('createStripePaymentLink', {
        client_id: client.id,
        client_name: client.company_name || client.name,
        client_email: client.email,
        description,
        amount: parseFloat(amount),
      });
      setPaymentLink(res.data.payment_link_url);
      toast.success('Stripe Payment Link generated!');
    } catch (err) {
      toast.error('Failed to generate payment link: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Send Stripe Payment Link
          </DialogTitle>
          <p className="text-sm text-slate-500">
            For <span className="font-medium">{client.company_name || client.name}</span>
            {client.email && <> · {client.email}</>}
          </p>
        </DialogHeader>

        {!paymentLink ? (
          <div className="space-y-4">
            <div>
              <Label>Amount (USD) *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.50"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                placeholder="e.g., Tax Preparation Services 2024, Monthly Bookkeeping..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Payment Link Generated!</p>
                <p className="text-sm text-green-600 mt-0.5">Share this link with your client to collect payment.</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Stripe Payment Link</p>
              <p className="text-sm font-mono text-blue-700 break-all">{paymentLink}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(paymentLink); toast.success('Copied!'); }}>
                <Copy className="w-4 h-4 mr-2" />Copy
              </Button>
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => window.open(paymentLink, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />Open
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {!paymentLink ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={loading || !amount || !description} className="bg-indigo-600 hover:bg-indigo-700">
                {loading ? 'Generating...' : 'Generate Link'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose} className="w-full">Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}