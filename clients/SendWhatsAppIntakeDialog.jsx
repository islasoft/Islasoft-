import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Mail, Send, Loader2, Link } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SendWhatsAppIntakeDialog({ open, onOpenChange, client }) {
  const [email, setEmail] = useState(client?.email || '');
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState(client?.registration_token || '');
  const [loadingToken, setLoadingToken] = useState(false);

  const displayName = client?.company_name || `${client?.name || ''} ${client?.last_name || ''}`.trim() || 'Client';
  const onboardingURL = `https://cpa-practice-manager-isla.base44.app/ClientOnboarding?token=${token}`;

  useEffect(() => {
    if (!open || !client) return;
    setEmail(client.email || '');
    if (client.registration_token) {
      setToken(client.registration_token);
    } else {
      setLoadingToken(true);
      base44.functions.invoke('ensureClientToken', { clientId: client.id })
        .then(res => {
          if (res.data?.token) setToken(res.data.token);
          else toast.error('Could not generate onboarding link');
        })
        .catch(() => toast.error('Could not generate onboarding link'))
        .finally(() => setLoadingToken(false));
    }
  }, [open, client]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(onboardingURL);
    toast.success('Link copied to clipboard!');
  };

  const handleSendEmail = async () => {
    if (!email) { toast.error('Please enter an email address'); return; }
    setSending(true);
    try {
      const firstName = displayName.split(' ')[0];
      const res = await base44.functions.invoke('sendClientEmail', {
        to: email,
        subject: 'Action Required: Complete Your Client Data Intake Form — Isla Accounting Corp',
        body: `Hi ${firstName},\n\nPlease complete your onboarding form with Isla Accounting Corp by clicking the link below:\n\n<a href="${onboardingURL}">Client Data Intake</a>\n\nThis form is secure and takes just a few minutes to complete.\n\nThank you,\nIsla Accounting Corp`
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success('Intake form link sent via email!');
      onOpenChange(false);
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[520px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-blue-600" />
            Send Intake Form
          </DialogTitle>
          <DialogDescription>
            Send the client onboarding form link via email or copy it to share manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Client Name */}
          <div className="space-y-1.5">
            <Label>Client</Label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 font-medium">
              {displayName}
            </div>
          </div>

          {/* Onboarding URL */}
          <div className="space-y-1.5">
            <Label>Onboarding Form Link</Label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              {loadingToken
                ? <span className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="w-3 h-3 animate-spin" />Generating link...</span>
                : (
                  <a
                    href={onboardingURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm font-medium flex-1"
                  >
                    Client Data Intake
                  </a>
                )
              }
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleSendEmail}
              disabled={!email || sending || loadingToken}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {sending ? 'Sending...' : 'Send via Email'}
            </Button>

            <Button
              onClick={handleCopyLink}
              variant="outline"
              disabled={loadingToken}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}