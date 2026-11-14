import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SendEmailDialog({ client, onClose }) {
  const queryClient = useQueryClient();
  const [emailData, setEmailData] = useState({
    subject: '',
    body: '',
    email_type: 'general',
  });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!emailData.subject || !emailData.body) {
      toast.error('Please enter subject and message');
      return;
    }

    setSending(true);
    try {
      const user = await base44.auth.me();

      // Send the email via backend function (supports external recipients)
      const res = await base44.functions.invoke('sendClientEmail', {
        from_name: user.full_name || 'ISLA Accounting Corp',
        to: client.email,
        subject: emailData.subject,
        body: emailData.body,
      });
      if (res.data?.error) throw new Error(res.data.error);

      // Log email in tracking
      await base44.entities.EmailTracking.create({
        client_id: client.id,
        client_name: client.company_name,
        recipient_email: client.email,
        subject: emailData.subject,
        email_type: emailData.email_type,
        sent_by_id: user.id,
        sent_by_name: user.full_name,
        sent_date: new Date().toISOString(),
        status: 'sent',
      });

      toast.success('Email sent successfully');
      queryClient.invalidateQueries({ queryKey: ['emailTracking'] });
      onClose();
    } catch (error) {
      console.error('Email error:', error);
      toast.error('Failed to send email: ' + (error.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Email to {client.company_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <p className="text-gray-600">To: <span className="font-medium text-gray-900">{client.email}</span></p>
          </div>

          <div className="space-y-2">
            <Label>Email Type</Label>
            <Select value={emailData.email_type} onValueChange={(value) => setEmailData({ ...emailData, email_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="engagement_letter">Engagement Letter</SelectItem>
                <SelectItem value="document_share">Document Share</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              placeholder="Enter email subject"
            />
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={emailData.body}
              onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
              placeholder="Enter your message"
              rows={8}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              <Mail className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}