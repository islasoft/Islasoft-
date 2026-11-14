import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileInput, Loader2, Copy, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function DataCollectionFormGenerator({ client, onClose }) {
  const [formType, setFormType] = useState('');
  const [services, setServices] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState(null);
  const [sending, setSending] = useState(false);

  const serviceOptions = [
    'Bookkeeping', 'Tax Preparation', 'Payroll', 'CFO Services',
    'Tax Planning', 'Audit', 'Entity Formation'
  ];

  const generateForm = async () => {
    if (!formType || services.length === 0) {
      toast.error('Please select form type and services');
      return;
    }

    setGenerating(true);
    try {
      const prompt = `Create a comprehensive client data collection form for Isla Accompting Corp.

CLIENT: ${client.company_name}
FORM TYPE: ${formType}
SERVICES: ${services.join(', ')}

Generate a professional data collection form with:
1. Introduction explaining why this information is needed
2. Organized sections with clear field labels
3. All necessary fields for the selected services
4. Instructions for each section
5. Required documents list
6. Next steps after submission

Make it comprehensive yet easy to understand. Include all compliance-related fields.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            form_title: { type: 'string' },
            introduction: { type: 'string' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  section_name: { type: 'string' },
                  description: { type: 'string' },
                  fields: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string' },
                        field_type: { type: 'string' },
                        required: { type: 'boolean' },
                        options: {
                          type: 'array',
                          items: { type: 'string' }
                        },
                        help_text: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            required_documents: {
              type: 'array',
              items: { type: 'string' }
            },
            next_steps: { type: 'string' }
          }
        }
      });

      setForm(result);
      toast.success('Data collection form generated');
    } catch (error) {
      toast.error('Failed to generate form');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const copyForm = () => {
    if (!form) return;
    
    let text = `${form.form_title}\n${'='.repeat(50)}\n\n`;
    text += `${form.introduction}\n\n`;
    
    form.sections.forEach((section, idx) => {
      text += `${idx + 1}. ${section.section_name}\n`;
      text += `${section.description}\n\n`;
      section.fields.forEach(field => {
        text += `   ${field.required ? '* ' : '  '}${field.label}`;
        if (field.help_text) text += ` (${field.help_text})`;
        text += '\n';
        if (field.options) {
          field.options.forEach(opt => text += `      - ${opt}\n`);
        }
        text += '\n';
      });
      text += '\n';
    });
    
    if (form.required_documents?.length > 0) {
      text += 'REQUIRED DOCUMENTS:\n';
      form.required_documents.forEach(doc => text += `  - ${doc}\n`);
      text += '\n';
    }
    
    text += `NEXT STEPS:\n${form.next_steps}\n`;
    
    navigator.clipboard.writeText(text);
    toast.success('Form copied to clipboard');
  };

  const sendFormToClient = async () => {
    if (!form || !client.email) return;
    
    setSending(true);
    try {
      let emailBody = `Dear ${client.contact_person || client.company_name},\n\n`;
      emailBody += `Welcome to Isla Accompting Corp! To get started with your onboarding, please complete the following data collection form.\n\n`;
      emailBody += `${form.form_title}\n${'─'.repeat(50)}\n\n`;
      emailBody += `${form.introduction}\n\n`;
      
      form.sections.forEach((section, idx) => {
        emailBody += `${idx + 1}. ${section.section_name}\n`;
        emailBody += `${section.description}\n\n`;
        section.fields.forEach(field => {
          emailBody += `   ${field.required ? '* ' : '  '}${field.label}`;
          if (field.help_text) emailBody += ` (${field.help_text})`;
          emailBody += '\n   _____________________________________\n\n';
        });
        emailBody += '\n';
      });
      
      if (form.required_documents?.length > 0) {
        emailBody += 'REQUIRED DOCUMENTS:\n';
        form.required_documents.forEach(doc => emailBody += `  - ${doc}\n`);
        emailBody += '\n';
      }
      
      emailBody += `NEXT STEPS:\n${form.next_steps}\n\n`;
      emailBody += `Please reply to this email with the completed information or call us at (305) 290-1145 if you have any questions.\n\n`;
      emailBody += `Best regards,\nIsla Accompting Corp Team`;

      await base44.integrations.Core.SendEmail({
        to: client.email,
        subject: `Client Onboarding - ${form.form_title}`,
        body: emailBody,
        from_name: 'Isla Accompting Corp'
      });

      // Track email
      const currentUser = await base44.auth.me();
      await base44.entities.EmailTracking.create({
        client_id: client.id,
        client_name: client.company_name,
        recipient_email: client.email,
        subject: `Client Onboarding - ${form.form_title}`,
        email_type: 'engagement_letter',
        related_id: client.id,
        sent_date: new Date().toISOString(),
        sent_by_id: currentUser?.id,
        sent_by_name: currentUser?.full_name,
        status: 'sent',
      });

      toast.success('Form sent to client');
    } catch (error) {
      toast.error('Failed to send form');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center gap-2">
            <FileInput className="w-5 h-5 text-blue-600" />
            Generate Data Collection Form - {client.company_name}
          </CardTitle>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {!form ? (
            <>
              <div className="space-y-2">
                <Label>Form Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select form type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_intake">Initial Client Intake</SelectItem>
                    <SelectItem value="tax_organizer">Tax Organizer</SelectItem>
                    <SelectItem value="bookkeeping_setup">Bookkeeping Setup</SelectItem>
                    <SelectItem value="payroll_setup">Payroll Setup</SelectItem>
                    <SelectItem value="entity_formation">Entity Formation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Services Included</Label>
                <div className="grid grid-cols-2 gap-3">
                  {serviceOptions.map(service => (
                    <div key={service} className="flex items-center gap-2">
                      <Checkbox
                        checked={services.includes(service)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setServices([...services, service]);
                          } else {
                            setServices(services.filter(s => s !== service));
                          }
                        }}
                      />
                      <Label className="cursor-pointer">{service}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateForm}
                disabled={generating || !formType || services.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileInput className="w-4 h-4 mr-2" />
                )}
                Generate Form
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyForm}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  onClick={sendFormToClient}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Email to Client
                </Button>
                <Button variant="outline" onClick={() => setForm(null)}>
                  Generate New
                </Button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg">{form.form_title}</h3>
                <p className="text-sm text-gray-700 mt-2">{form.introduction}</p>
              </div>

              {form.sections?.map((section, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg">{section.section_name}</CardTitle>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {section.fields.map((field, fieldIdx) => (
                      <div key={fieldIdx} className="space-y-1">
                        <Label className="flex items-center gap-2">
                          {field.label}
                          {field.required && <Badge className="bg-red-600 text-xs">Required</Badge>}
                        </Label>
                        {field.help_text && (
                          <p className="text-xs text-gray-500">{field.help_text}</p>
                        )}
                        {field.field_type === 'select' && field.options && (
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue placeholder="Select option..." />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((opt, i) => (
                                <SelectItem key={i} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {field.field_type !== 'select' && (
                          <Input placeholder={`Enter ${field.label.toLowerCase()}`} disabled />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              {form.required_documents?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Required Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {form.required_documents.map((doc, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-medium text-green-900">Next Steps</p>
                <p className="text-sm text-green-800 mt-1">{form.next_steps}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}