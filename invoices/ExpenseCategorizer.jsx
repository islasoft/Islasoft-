import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tags, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ExpenseCategorizer() {
  const [expenses, setExpenses] = useState('');
  const [categorizing, setCategorizing] = useState(false);
  const [categorizedExpenses, setCategorizedExpenses] = useState(null);

  const categorizeExpenses = async () => {
    if (!expenses.trim()) {
      toast.error('Please enter expenses to categorize');
      return;
    }

    setCategorizing(true);
    try {
      const prompt = `You are an expert CPA at Isla Accompting Corp. Categorize these business expenses into appropriate accounting categories.

EXPENSES:
${expenses}

For each expense, provide:
1. The expense description
2. Suggested category (e.g., Office Supplies, Professional Services, Travel, Meals & Entertainment, Utilities, Rent, Equipment, Software, Insurance, Marketing, etc.)
3. Amount (if mentioned)
4. Tax deductibility status (Fully Deductible, Partially Deductible, Non-Deductible)
5. Notes (any important tax considerations)

Return as JSON with an array of categorized expenses.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            categorized_expenses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  category: { type: 'string' },
                  amount: { type: 'number' },
                  tax_deductibility: { type: 'string' },
                  notes: { type: 'string' }
                }
              }
            },
            total_amount: { type: 'number' },
            summary: { type: 'string' }
          }
        }
      });

      setCategorizedExpenses(result);
      toast.success('Expenses categorized');
    } catch (error) {
      toast.error('Failed to categorize expenses');
      console.error(error);
    } finally {
      setCategorizing(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Office Supplies': 'bg-blue-100 text-blue-800',
      'Professional Services': 'bg-purple-100 text-purple-800',
      'Travel': 'bg-green-100 text-green-800',
      'Meals & Entertainment': 'bg-orange-100 text-orange-800',
      'Utilities': 'bg-yellow-100 text-yellow-800',
      'Rent': 'bg-red-100 text-red-800',
      'Equipment': 'bg-indigo-100 text-indigo-800',
      'Software': 'bg-cyan-100 text-cyan-800',
      'Insurance': 'bg-pink-100 text-pink-800',
      'Marketing': 'bg-lime-100 text-lime-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getDeductibilityColor = (status) => {
    if (status?.includes('Fully')) return 'bg-green-600';
    if (status?.includes('Partially')) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="w-5 h-5 text-blue-600" />
          AI Expense Categorizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={expenses}
          onChange={(e) => setExpenses(e.target.value)}
          placeholder="Enter expenses (one per line or paste a list):&#10;Office supplies from Staples - $150&#10;Lunch meeting with client - $85&#10;Adobe Creative Cloud subscription - $52.99&#10;..."
          rows={8}
        />

        <Button
          onClick={categorizeExpenses}
          disabled={categorizing || !expenses.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {categorizing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Tags className="w-4 h-4 mr-2" />
          )}
          Categorize Expenses
        </Button>

        {categorizedExpenses && (
          <div className="space-y-4 pt-4 border-t">
            {categorizedExpenses.summary && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900">
                <p className="font-medium">Summary:</p>
                <p>{categorizedExpenses.summary}</p>
                {categorizedExpenses.total_amount > 0 && (
                  <p className="mt-2">
                    <span className="font-semibold">Total: </span>
                    ${categorizedExpenses.total_amount.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {categorizedExpenses.categorized_expenses?.map((expense, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="font-medium">{expense.description}</p>
                        {expense.amount > 0 && (
                          <span className="font-semibold">${expense.amount.toFixed(2)}</span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={getCategoryColor(expense.category)}>
                          {expense.category}
                        </Badge>
                        <Badge className={getDeductibilityColor(expense.tax_deductibility)}>
                          {expense.tax_deductibility}
                        </Badge>
                      </div>
                      {expense.notes && (
                        <p className="text-sm text-gray-600 mt-2">{expense.notes}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}