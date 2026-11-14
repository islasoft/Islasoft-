import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

export default function TaskPriorityAnalyzer({ tasks, onPrioritiesUpdated }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzePriorities = async () => {
    if (!tasks || tasks.length === 0) {
      toast.error('No tasks to analyze');
      return;
    }

    setAnalyzing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const taskSummary = tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        current_priority: t.priority,
        due_date: t.due_date,
        client: t.client_name,
        status: t.status,
        tags: t.tags
      }));

      const prompt = `Analyze these tasks for a CPA firm and suggest priority adjustments based on:
- Due date urgency (today is ${today})
- Tax filing deadlines and compliance requirements
- Client importance
- Task dependencies and complexity
- Industry standards (tax season, quarter-end, etc.)

TASKS:
${JSON.stringify(taskSummary, null, 2)}

For each task that needs priority adjustment:
1. Explain why priority should change
2. Suggest new priority (low/medium/high/urgent)
3. Rate urgency (1-10)
4. Provide actionable recommendations

Focus on time-sensitive tax and compliance tasks.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            priority_adjustments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task_id: { type: 'string' },
                  task_title: { type: 'string' },
                  current_priority: { type: 'string' },
                  suggested_priority: { type: 'string' },
                  urgency_score: { type: 'number' },
                  reason: { type: 'string' },
                  recommendations: { type: 'string' }
                }
              }
            },
            overall_insights: { type: 'string' }
          }
        }
      });

      setAnalysis(result);
      toast.success('Priority analysis complete');
    } catch (error) {
      toast.error('Failed to analyze priorities');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const applyPriorityChange = async (taskId, newPriority) => {
    try {
      await base44.entities.Task.update(taskId, { priority: newPriority });
      toast.success('Priority updated');
      if (onPrioritiesUpdated) onPrioritiesUpdated();
    } catch (error) {
      toast.error('Failed to update priority');
    }
  };

  const applyAllChanges = async () => {
    if (!analysis?.priority_adjustments) return;
    
    for (const adjustment of analysis.priority_adjustments) {
      await applyPriorityChange(adjustment.task_id, adjustment.suggested_priority);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-600',
      high: 'bg-orange-600',
      medium: 'bg-yellow-600',
      low: 'bg-blue-600'
    };
    return colors[priority?.toLowerCase()] || 'bg-gray-600';
  };

  const getUrgencyColor = (score) => {
    if (score >= 8) return 'text-red-600';
    if (score >= 6) return 'text-orange-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-blue-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          AI Task Priority Analyzer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={analyzePriorities}
          disabled={analyzing || !tasks || tasks.length === 0}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {analyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <TrendingUp className="w-4 h-4 mr-2" />
          )}
          Analyze Task Priorities
        </Button>

        {analysis && (
          <div className="space-y-4 pt-4 border-t">
            {analysis.overall_insights && (
              <div className="bg-orange-50 p-3 rounded-lg text-sm text-orange-900">
                <p className="font-medium mb-1">Overall Insights:</p>
                <p>{analysis.overall_insights}</p>
              </div>
            )}

            {analysis.priority_adjustments?.length > 0 ? (
              <>
                <div className="flex justify-between items-center">
                  <p className="font-medium">
                    {analysis.priority_adjustments.length} Priority Adjustments Suggested
                  </p>
                  <Button onClick={applyAllChanges} size="sm">
                    Apply All
                  </Button>
                </div>

                {analysis.priority_adjustments.map((adj, idx) => (
                  <Card key={idx} className="border-orange-200">
                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <h4 className="font-semibold">{adj.task_title}</h4>
                        <div className="flex gap-2 mt-2">
                          <Badge className={getPriorityColor(adj.current_priority)}>
                            Current: {adj.current_priority}
                          </Badge>
                          <span>→</span>
                          <Badge className={getPriorityColor(adj.suggested_priority)}>
                            Suggested: {adj.suggested_priority}
                          </Badge>
                          <Badge variant="outline" className={getUrgencyColor(adj.urgency_score)}>
                            Urgency: {adj.urgency_score}/10
                          </Badge>
                        </div>
                      </div>

                      <div className="text-sm space-y-2">
                        <div>
                          <p className="font-medium text-gray-700">Reason:</p>
                          <p className="text-gray-600">{adj.reason}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Recommendations:</p>
                          <p className="text-gray-600">{adj.recommendations}</p>
                        </div>
                      </div>

                      <Button
                        onClick={() => applyPriorityChange(adj.task_id, adj.suggested_priority)}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        Apply This Change
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No priority adjustments needed. Current priorities are appropriate.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}