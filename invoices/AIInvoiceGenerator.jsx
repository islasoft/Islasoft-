import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AIInvoiceGenerator({ clients, projects, onInvoiceGenerated }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [generating, setGenerating] = useState(false);

  const generateInvoice = async () => {
    if (!selectedClientId || !workDescription.trim()) {
      toast.error('Please select a client and describe the work');
      return;
    }

    setGenerating(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const clientProjects = projects.filter(p => p.client_id === selectedClientId);

      const prompt = `You are an expert billing specialist at Isla Accompting Corp, a professional CPA firm.

Generate a draft invoice based on this work description:
${workDescription}

CLIENT INFORMATION:
- Name: ${client.company_name}
- Email: ${client.email}
${clientProjects.length > 0 ? `- Active Projects: ${clientProjects.map(p => p.description).join(', ')}` : ''}

ANALYZE THE WORK and generate:
1. Appropriate project selection (from active projects or suggest "General Services")
2. Line items breaking down the work (description, hours, hourly rate based on complexity)
3. Recommended hourly rate ($150-$300 based on service complexity)
4. Total hours estimate
5. Invoice due date (typically 30 days from issue)

Standard rates:
- Basic bookkeeping: $150/hr
- Tax preparation: $200/hr
- Complex tax planning: $250/hr
- CFO/Advisory: $300/hr

Return as JSON with invoice details.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            project_name: { type: 'string' },
            line_items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  project_name: { type: 'string' },
                  description: { type: 'string' },
                  hours: { type: 'number' },
                  rate: { type: 'number' },
                  amount: { type: 'number' }
                }
              }
            },
            total_hours: { type: 'number' },
            hourly_rate: { type: 'number' },
            subtotal: { type: 'number' },
            notes: { type: 'string' },
            due_date_days: { type: 'number' }
          }
        }
      });

      // Find or use the suggested project
      let project = clientProjects.find(p => 
        p.description?.toLowerCase().includes(result.project_name?.toLowerCase()) ||
        result.project_name?.toLowerCase().includes(p.description?.toLowerCase())
      );

      // Calculate dates
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (result.due_date_days || 30));

      // Calculate merchant fee (3%)
      const merchantFee = result.subtotal * 0.03;
      const total = result.subtotal + merchantFee;

      // Generate invoice number
      const invoiceNumber = `INV-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000)}`;

      const invoiceData = {
        invoice_number: invoiceNumber,
        client_id: client.id,
        client_name: client.company_name,
        client_email: client.email,
        project_id: project?.id || '',
        project_name: result.project_name || 'General Services',
        issue_date: format(issueDate, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        line_items: result.line_items,
        total_hours: result.total_hours,
        hourly_rate: result.hourly_rate,
        subtotal: result.subtotal,
        merchant_fee: merchantFee,
        tax_rate: 0,
        tax_amount: 0,
        total: total,
        status: 'draft',
        notes: result.notes,
      };

      if (onInvoiceGenerated) {
        onInvoiceGenerated(invoiceData);
      }

      toast.success('Draft invoice generated');
    } catch (error) {
      toast.error('Failed to generate invoice');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          AI Invoice Generator
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
        </div>

        <div className="space-y-2">
          <Label>Describe the Work Completed</Label>
          <Textarea
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            placeholder="Describe the services provided:&#10;&#10;Example:&#10;- Completed Q4 2025 bookkeeping&#10;- Prepared and filed quarterly payroll taxes&#10;- Bank reconciliation for 3 accounts&#10;- Generated financial statements"
            rows={8}
          />
        </div>

        <Button
          onClick={generateInvoice}
          disabled={generating || !selectedClientId || !workDescription.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Generate Draft Invoice
        </Button>

        <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
          <p className="font-medium mb-1">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>AI analyzes the work description</li>
            <li>Suggests appropriate billing rates</li>
            <li>Breaks down work into line items</li>
            <li>Creates a draft invoice for review</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}