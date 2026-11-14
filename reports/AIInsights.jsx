import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Sparkles, AlertTriangle, TrendingUp, Target, Lightbulb, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AIInsights({ projects = [], timeEntries = [], invoices = [], clients = [] }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      // Prepare data summary for AI analysis
      const dataSummary = {
        projects: {
          total: projects.length,
          active: projects.filter(p => p.status === 'in_progress').length,
          completed: projects.filter(p => p.status === 'completed').length,
          overdue: projects.filter(p => {
            if (!p.due_date) return false;
            const dueDate = new Date(p.due_date);
            return dueDate < new Date() && p.status !== 'completed';
          }).length,
          byCategory: projects.reduce((acc, p) => {
            acc[p.project_category] = (acc[p.project_category] || 0) + 1;
            return acc;
          }, {})
        },
        invoices: {
          total: invoices.length,
          paid: invoices.filter(i => i.status === 'paid').length,
          overdue: invoices.filter(i => i.status === 'overdue').length,
          totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0),
          outstandingAmount: invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + (i.total || 0), 0)
        },
        timeEntries: {
          total: timeEntries.length,
          totalHours: timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0),
          billableHours: timeEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.hours || 0), 0),
          utilizationRate: timeEntries.length > 0 
            ? (timeEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.hours || 0), 0) / 
               timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0)) * 100 
            : 0
        },
        clients: {
          total: clients.length,
          active: clients.filter(c => c.status === 'active').length
        }
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a business intelligence analyst for an accounting practice. Analyze the following business data and provide 4-6 actionable insights. Focus on:
1. Anomalies or concerning trends
2. Opportunities for improvement
3. Performance highlights
4. Strategic recommendations

Data Summary:
${JSON.stringify(dataSummary, null, 2)}

Return ONLY a JSON array of insights. Each insight must have:
- type: "warning" | "success" | "info" | "opportunity"
- title: Brief insight title (max 60 chars)
- description: Detailed explanation (max 150 chars)
- impact: "high" | "medium" | "low"
- metric: Related metric name

Example format:
[
  {
    "type": "warning",
    "title": "High Invoice Overdue Rate",
    "description": "15% of invoices are overdue, affecting cash flow. Consider implementing automated reminders.",
    "impact": "high",
    "metric": "Invoice Collection"
  }
]`,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["warning", "success", "info", "opportunity"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string", enum: ["high", "medium", "low"] },
                  metric: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(response.insights || []);
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projects.length > 0 || invoices.length > 0) {
      generateInsights();
    }
  }, []);

  const getInsightIcon = (type) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'success': return TrendingUp;
      case 'opportunity': return Target;
      default: return Lightbulb;
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'warning': return 'border-orange-200 bg-orange-50 dark:bg-orange-900/20';
      case 'success': return 'border-green-200 bg-green-50 dark:bg-green-900/20';
      case 'opportunity': return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
      default: return 'border-gray-200 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getImpactBadge = (impact) => {
    const colors = {
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    return colors[impact] || colors.low;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <CardTitle>AI-Powered Insights</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateInsights}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Analyzing data...</p>
          </div>
        ) : insights.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No insights available. Add data to see AI-powered recommendations.</p>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const Icon = getInsightIcon(insight.type);
              return (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-4 ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{insight.title}</h3>
                        <Badge className={`${getImpactBadge(insight.impact)} text-xs`}>
                          {insight.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{insight.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Related to: {insight.metric}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}