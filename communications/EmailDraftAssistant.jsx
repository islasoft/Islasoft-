import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Wand2, Loader2, Copy, Send, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EmailDraftAssistant({ clients }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [emailType, setEmailType] = useState('');
  const [context, setContext] = useState('');
  const [draftedEmail, setDraftedEmail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const emailTemplates = [
    { value: 'appointment_reminder', label: 'Appointment Reminder' },
    { value: 'invoice_followup', label: 'Invoice Follow-up' },
    { value: 'document_request', label: 'Document Request' },
    { value: 'tax_deadline_reminder', label: 'Tax Deadline Reminder' },
    { value: 'project_update', label: 'Project Status Update' },
    { value: 'engagement_letter_followup', label: 'Engagement Letter Follow-up' },
    { value: 'meeting_confirmation', label: 'Meeting Confirmation' },
    { value: 'general_inquiry', label: 'General Inquiry Response' },
  ];

  const generateEmailDraft = async () => {
    if (!selectedClientId || !emailType) {
      toast.error('Please select a client and email type');
      return;
    }

    setGenerating(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      
      const prompt = `You are a professional CPA firm assistant at Isla Accompting Corp.

Generate a professional, friendly email for the following:
- Client: ${client.company_name}
- Contact Person: ${client.contact_person || 'Client'}
- Email Type: ${emailType.replace(/_/g, ' ')}
${context ? `- Additional Context: ${context}` : ''}

The email should:
1. Be professional but warm
2. Include appropriate subject line
3. Be concise and clear
4. Include a call-to-action if relevant
5. Sign off as "Isla Accompting Corp Team"
6. Include contact information: (305) 290-1145 | info@islaccounting.com

Return the email in this JSON format:
{
  "subject": "Email subject line",
  "body": "Email body content"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' }
          }
        }
      });

      setDraftedEmail(`Subject: ${result.subject}\n\n${result.body}`);
      toast.success('Email draft generated');
    } catch (error) {
      toast.error('Failed to generate email');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draftedEmail);
    toast.success('Email copied to clipboard');
  };

  const sendEmail = async () => {
    if (!draftedEmail || !selectedClientId) return;

    const client = clients.find(c => c.id === selectedClientId);
    if (!client?.email) {
      toast.error('Client email not found');
      return;
    }

    setSending(true);
    try {
      const lines = draftedEmail.split('\n');
      const subject = lines[0].replace('Subject: ', '');
      const body = lines.slice(2).join('\n');

      await base44.integrations.Core.SendEmail({
        to: client.email,
        subject,
        body,
        from_name: 'Isla Accompting Corp'
      });

      // Track email
      const currentUser = await base44.auth.me();
      await base44.entities.EmailTracking.create({
        client_id: client.id,
        client_name: client.company_name,
        recipient_email: client.email,
        subject,
        email_type: emailType === 'invoice_followup' ? 'invoice' : 
                   emailType === 'engagement_letter_followup' ? 'engagement_letter' : 'general',
        sent_date: new Date().toISOString(),
        sent_by_id: currentUser?.id,
        sent_by_name: currentUser?.full_name,
        status: 'sent',
      });

      toast.success(`Email sent to ${client.email}`);
      setDraftedEmail('');
      setContext('');
    } catch (error) {
      toast.error('Failed to send email');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-blue-600" />
            AI Email Draft Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Client</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClient && (
              <p className="text-sm text-gray-500">
                {selectedClient.contact_person && `Contact: ${selectedClient.contact_person} • `}
                {selectedClient.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email Type</Label>
            <Select value={emailType} onValueChange={setEmailType}>
              <SelectTrigger>
                <SelectValue placeholder="Choose email type" />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map(template => (
                  <SelectItem key={template.value} value={template.value}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Additional Context (Optional)</Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., Invoice #1234 due in 5 days, Meeting scheduled for Jan 15th, etc."
              rows={4}
            />
          </div>

          <Button
            onClick={generateEmailDraft}
            disabled={generating || !selectedClientId || !emailType}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Generate Email Draft
          </Button>
        </CardContent>
      </Card>

      {/* Generated Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Generated Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {draftedEmail ? (
            <>
              <Textarea
                value={draftedEmail}
                onChange={(e) => setDraftedEmail(e.target.value)}
                rows={16}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={sendEmail}
                  disabled={sending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Email
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Generate an email draft to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}