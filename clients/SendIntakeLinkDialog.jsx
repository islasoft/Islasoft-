import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Mail, MessageSquare, ExternalLink, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const INTAKE_URL = `${window.location.origin}/ProspectiveIntake`;
const MASKED_LABEL = 'Client Data Intake';

export default function SendIntakeLinkDialog({ open, onOpenChange, clientName = '', clientEmail = '' }) {
  const [email, setEmail] = useState(clientEmail);
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const waMessage = encodeURIComponent(
    `Hello${clientName ? ` ${clientName}` : ''},\n\nPlease complete our secure ${MASKED_LABEL} form so we can get started:\n${INTAKE_URL}\n\nThis form is quick and takes just a few minutes. Feel free to reach out if you have questions.\n\nThank you,\nIsla Accounting Corp`
  );

  const mailtoHref = `mailto:${email}?subject=${encodeURIComponent('Action Required: Complete Your Client Data Intake — Isla Accounting Corp')}&body=${encodeURIComponent(
    `Hello${clientName ? ` ${clientName}` : ''},\n\nPlease complete our secure ${MASKED_LABEL} form so we can get started:\n\n${INTAKE_URL}\n\nThis form is quick and takes just a few minutes. Feel free to reach out if you have questions.\n\nThank you,\nIsla Accounting Corp`
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(INTAKE_URL);
    toast.success('Link copied!');
  };

  const handleSendEmail = async () => {
    if (!email) { toast.error('Enter an email address'); return; }
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendClientEmail', {
        to: email,
        subject: 'Action Required: Complete Your Client Data Intake — Isla Accounting Corp',
        body: `Hello${clientName ? ` ${clientName}` : ''},\n\nPlease complete our secure <a href="${INTAKE_URL}">Client Data Intake</a> form so we can get started.\n\nThis form is quick and takes just a few minutes. Feel free to reach out if you have questions.\n\nThank you,\nIsla Accounting Corp`,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success('Intake link sent via email!');
      onOpenChange(false);
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-sky-600" />
            Send Client Data Intake Link
          </DialogTitle>
          <DialogDescription>
            Share the secure intake form link via WhatsApp, Email, or copy it directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Masked link preview */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <a
              href={INTAKE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 underline font-medium text-sm flex-1"
            >
              {MASKED_LABEL}
            </a>
            <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 px-2 text-slate-500">
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* WhatsApp section */}
          <div className="space-y-2">
            <Label>Send via WhatsApp</Label>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="+1 (305) 555-0100"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="flex-1"
              />
              <Button
                asChild
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <a
                  href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${waMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>

          {/* Email section */}
          <div className="space-y-2">
            <Label>Send via Email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSendEmail}
                disabled={!email || sending}
                className="bg-sky-600 hover:bg-sky-700 text-white gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send
              </Button>
            </div>
          </div>

          {/* mailto fallback */}
          {email && (
            <p className="text-xs text-slate-500">
              Or open in your email app:{' '}
              <a href={mailtoHref} className="text-sky-600 underline">Open mailto</a>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}