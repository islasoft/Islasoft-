import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Send, Clock, Mail } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function InvoiceReminderDialog({ invoice, onClose }) {
  const [reminderType, setReminderType] = useState('overdue');
  const [customMessage, setCustomMessage] = useState('');
  const queryClient = useQueryClient();

  const daysOverdue = invoice.due_date 
    ? differenceInDays(new Date(), new Date(invoice.due_date))
    : 0;

  const reminderTemplates = {
    pre_due: {
      label: 'Pre-Due Reminder (3 days before)',
      subject: `Upcoming Invoice Payment - ${invoice.invoice_number}`,
      message: `This is a friendly reminder that your invoice is due soon.\n\nInvoice #${invoice.invoice_number}\nDue Date: ${invoice.due_date ? format(new Date(invoice.due_date), 'MMMM d, yyyy') : 'Upon Receipt'}\nAmount: $${invoice.total?.toFixed(2)}\n\nPlease ensure payment is made by the due date to avoid any late fees.`
    },
    overdue: {
      label: 'Overdue Reminder',
      subject: `Payment Reminder - Invoice ${invoice.invoice_number} is Overdue`,
      message: `We noticed that payment for the following invoice is now overdue.\n\nInvoice #${invoice.invoice_number}\nDue Date: ${invoice.due_date ? format(new Date(invoice.due_date), 'MMMM d, yyyy') : 'Upon Receipt'}\nAmount Due: $${invoice.total?.toFixed(2)}\nDays Overdue: ${daysOverdue}\n\nPlease arrange payment at your earliest convenience.`
    },
    final_notice: {
      label: 'Final Notice',
      subject: `FINAL NOTICE - Invoice ${invoice.invoice_number} Payment Required`,
      message: `This is a final notice regarding your overdue invoice.\n\nInvoice #${invoice.invoice_number}\nOriginal Due Date: ${invoice.due_date ? format(new Date(invoice.due_date), 'MMMM d, yyyy') : 'Upon Receipt'}\nAmount Due: $${invoice.total?.toFixed(2)}\nDays Overdue: ${daysOverdue}\n\nImmediate payment is required to avoid further action. Please contact us if you need to discuss payment arrangements.`
    },
    gentle: {
      label: 'Gentle Reminder',
      subject: `Friendly Payment Reminder - Invoice ${invoice.invoice_number}`,
      message: `Just a friendly reminder about your outstanding invoice.\n\nInvoice #${invoice.invoice_number}\nDue Date: ${invoice.due_date ? format(new Date(invoice.due_date), 'MMMM d, yyyy') : 'Upon Receipt'}\nAmount Due: $${invoice.total?.toFixed(2)}\n\nWe understand that things can slip through the cracks. If you have any questions or concerns, please don't hesitate to reach out.`
    }
  };

  const selectedTemplate = reminderTemplates[reminderType];

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      const template = reminderTemplates[reminderType];
      
      const emailBody = `
Dear ${invoice.client_name},

${customMessage || template.message}

INVOICE DETAILS
Invoice Number: ${invoice.invoice_number}
Invoice Date: ${format(new Date(invoice.issue_date), 'MMMM d, yyyy')}
Due Date: ${invoice.due_date ? format(new Date(invoice.due_date), 'MMMM d, yyyy') : 'Upon Receipt'}
Amount Due: $${invoice.total?.toFixed(2)}

PAYMENT OPTIONS:

1. Pay Online (Credit Card/ACH):
https://secure.cpacharge.com/pages/islaaccomptingcorp/payments

2. Check:
Made payable to: Isla Accompting Corp
Mail to: 2325 Wiley St, Hollywood, FL 33020
Please include Invoice #${invoice.invoice_number} in the memo

3. Zelle:
Email: info@islaccounting.com
Please include Invoice #${invoice.invoice_number} as reference.

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,

Isla Accompting Corp
2325 Wiley St
Hollywood, FL 33020
Phone: (305) 290-1145
Email: info@islaccounting.com
      `.trim();

      // Send email
      await base44.integrations.Core.SendEmail({
        to: invoice.client_email,
        subject: template.subject,
        body: emailBody,
        from_name: 'Isla Accompting Corp'
      });

      // Update invoice with reminder info
      const reminderHistory = invoice.reminder_history || [];
      reminderHistory.push({
        sent_date: new Date().toISOString(),
        sent_by: currentUser?.full_name || 'System',
        reminder_type: template.label
      });

      await base44.entities.Invoice.update(invoice.id, {
        last_reminder_sent: new Date().toISOString(),
        reminder_count: (invoice.reminder_count || 0) + 1,
        reminder_history: reminderHistory
      });

      // Track email
      await base44.entities.EmailTracking.create({
        client_id: invoice.client_id,
        client_name: invoice.client_name,
        recipient_email: invoice.client_email,
        subject: template.subject,
        email_type: 'invoice',
        related_id: invoice.id,
        sent_date: new Date().toISOString(),
        sent_by_id: currentUser?.id,
        sent_by_name: currentUser?.full_name,
        status: 'sent',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Reminder sent successfully!');
      onClose();
    },
    onError: () => {
      toast.error('Failed to send reminder');
    },
  });

  return (
    <Card className="border-2 max-w-2xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Send Invoice Reminder</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Invoice #{invoice.invoice_number} - {invoice.client_name}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invoice Status */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Amount Due:</span>
            <span className="font-semibold">${invoice.total?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Due Date:</span>
            <span>{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'Upon Receipt'}</span>
          </div>
          {daysOverdue > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Days Overdue:</span>
              <Badge variant="destructive">{daysOverdue} days</Badge>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Reminders Sent:</span>
            <span>{invoice.reminder_count || 0}</span>
          </div>
          {invoice.last_reminder_sent && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Reminder:</span>
              <span>{format(new Date(invoice.last_reminder_sent), 'MMM d, yyyy h:mm a')}</span>
            </div>
          )}
        </div>

        {/* Reminder History */}
        {invoice.reminder_history && invoice.reminder_history.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Reminder History</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {invoice.reminder_history.map((reminder, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded">
                  <Mail className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-600">{reminder.reminder_type}</span>
                  <span className="text-gray-500">by {reminder.sent_by}</span>
                  <span className="text-gray-400 ml-auto">{format(new Date(reminder.sent_date), 'MMM d, h:mm a')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reminder Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="reminderType">Reminder Type</Label>
          <Select value={reminderType} onValueChange={setReminderType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(reminderTemplates).map(([key, template]) => (
                <SelectItem key={key} value={key}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Template Preview */}
        <div className="space-y-2">
          <Label>Email Preview</Label>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <div>
              <span className="font-semibold">Subject:</span>
              <p className="text-gray-700 mt-1">{selectedTemplate.subject}</p>
            </div>
            <div>
              <span className="font-semibold">Message:</span>
              <p className="text-gray-700 mt-1 whitespace-pre-line">{selectedTemplate.message}</p>
            </div>
          </div>
        </div>

        {/* Custom Message */}
        <div className="space-y-2">
          <Label htmlFor="customMessage">Custom Message (Optional)</Label>
          <Textarea
            id="customMessage"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add a custom message to override the template..."
            rows={4}
          />
          <p className="text-xs text-gray-500">
            Leave empty to use the template message, or add your own custom message
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={() => sendReminderMutation.mutate()}
          disabled={sendReminderMutation.isPending || !invoice.client_email}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="w-4 h-4 mr-2" />
          {sendReminderMutation.isPending ? 'Sending...' : 'Send Reminder'}
        </Button>
      </CardFooter>
    </Card>
  );
}