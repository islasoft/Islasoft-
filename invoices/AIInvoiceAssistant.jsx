import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AIInvoiceAssistant({ 
  selectedClient, 
  lineItems, 
  onApplySuggestion,
  invoices = [],
  projects = []
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const analyzeInvoice = async () => {
    if (!selectedClient || lineItems.length === 0) {
      toast.error('Select a client and add line items first');
      return;
    }

    setAnalyzing(true);
    try {
      // Get client's invoice history
      const clientInvoices = invoices.filter(inv => inv.client_id === selectedClient.id);
      const clientProjects = projects.filter(proj => proj.client_id === selectedClient.id);

      // Calculate payment statistics
      const paidOnTime = clientInvoices.filter(inv => 
        inv.status === 'paid' && 
        inv.due_date && 
        new Date(inv.created_date) <= new Date(inv.due_date)
      ).length;
      const totalPaid = clientInvoices.filter(inv => inv.status === 'paid').length;
      const overdueCount = clientInvoices.filter(inv => inv.status === 'overdue').length;

      const prompt = `Analyze this invoice and provide insights:

CLIENT PROFILE:
- Name: ${selectedClient.company_name}
- Total Invoices: ${clientInvoices.length}
- Paid On Time: ${paidOnTime}/${totalPaid}
- Overdue Invoices: ${overdueCount}
- Active Projects: ${clientProjects.length}
- Client Type: ${selectedClient.incorporated_as || 'Individual'}

CURRENT LINE ITEMS:
${lineItems.map((item, i) => `${i + 1}. ${item.project_name} - $${item.final_amount.toFixed(2)} (${item.total_hours}hrs)`).join('\n')}

PAST INVOICES:
${clientInvoices.slice(0, 5).map(inv => `- ${inv.invoice_number}: $${inv.total} (${inv.status})`).join('\n')}

Provide:
1. Categorize each line item (tax_service, bookkeeping, advisory, audit, payroll, compliance, consulting)
2. Suggest 2-3 relevant discounts or add-ons based on client history and current items
3. Predict late payment risk (low/medium/high) with reasoning`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            line_item_categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'number' },
                  category: { type: 'string' },
                  confidence: { type: 'string' }
                }
              }
            },
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  amount: { type: 'number' },
                  reasoning: { type: 'string' }
                }
              }
            },
            late_payment_risk: {
              type: 'object',
              properties: {
                level: { type: 'string' },
                percentage: { type: 'number' },
                reasoning: { type: 'string' },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setSuggestions(response);
      toast.success('AI analysis complete');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to analyze invoice');
    } finally {
      setAnalyzing(false);
    }
  };

  const riskColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              AI Invoice Assistant
            </CardTitle>
            <Button
              onClick={analyzeInvoice}
              disabled={analyzing || !selectedClient || lineItems.length === 0}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Invoice
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {suggestions && (
          <CardContent className="space-y-4">
            {/* Line Item Categories */}
            {suggestions.line_item_categories?.length > 0 && (
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4" />
                  Categorized Line Items
                </h4>
                <div className="space-y-2">
                  {suggestions.line_item_categories.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        {lineItems[cat.index]?.project_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{cat.category}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {cat.confidence}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.suggestions?.length > 0 && (
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Recommendations
                </h4>
                <div className="space-y-2">
                  {suggestions.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={suggestion.type === 'discount' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                              {suggestion.type}
                            </Badge>
                            <span className="font-medium">{suggestion.title}</span>
                          </div>
                          <p className="text-sm text-gray-600">{suggestion.description}</p>
                        </div>
                        <span className="font-bold text-lg">
                          {suggestion.type === 'discount' ? '-' : '+'}${Math.abs(suggestion.amount).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        💡 {suggestion.reasoning}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onApplySuggestion?.(suggestion)}
                      >
                        Apply {suggestion.type === 'discount' ? 'Discount' : 'Add-on'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Late Payment Risk */}
            {suggestions.late_payment_risk && (
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Payment Risk Analysis
                </h4>
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Risk Level:</span>
                    <Badge className={riskColors[suggestions.late_payment_risk.level.toLowerCase()]}>
                      {suggestions.late_payment_risk.level.toUpperCase()} - {suggestions.late_payment_risk.percentage}%
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Analysis:</strong> {suggestions.late_payment_risk.reasoning}
                    </p>
                  </div>

                  {suggestions.late_payment_risk.recommendations?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Recommendations:</p>
                      <ul className="space-y-1">
                        {suggestions.late_payment_risk.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}