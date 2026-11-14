import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, Copy, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TaskSummaryGenerator({ tasks, currentUser }) {
  const [period, setPeriod] = useState('daily');
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [sending, setSending] = useState(false);

  const generateSummary = async () => {
    if (!tasks || tasks.length === 0) {
      toast.error('No tasks to summarize');
      return;
    }

    setGenerating(true);
    try {
      const userTasks = tasks.filter(t => 
        t.assigned_to_id === currentUser?.id || !t.assigned_to_id
      );

      const tasksByStatus = {
        completed: userTasks.filter(t => t.status === 'completed'),
        in_progress: userTasks.filter(t => t.status === 'in_progress'),
        todo: userTasks.filter(t => t.status === 'todo'),
        waiting: userTasks.filter(t => t.status === 'waiting')
      };

      const today = new Date().toISOString().split('T')[0];

      const prompt = `Generate a professional ${period} task summary for ${currentUser?.full_name} at Isla Accompting Corp.

TODAY: ${today}

TASK BREAKDOWN:
- Completed: ${tasksByStatus.completed.length}
- In Progress: ${tasksByStatus.in_progress.length}
- To Do: ${tasksByStatus.todo.length}
- Waiting: ${tasksByStatus.waiting.length}

TASKS DETAIL:
${JSON.stringify(userTasks.map(t => ({
  title: t.title,
  status: t.status,
  priority: t.priority,
  due_date: t.due_date,
  client: t.client_name,
  tags: t.tags
})), null, 2)}

Create a summary with:
1. Executive overview of ${period} progress
2. Key accomplishments
3. High priority items requiring attention
4. Upcoming deadlines
5. Blockers or waiting items
6. Productivity insights
7. Recommendations for ${period === 'daily' ? 'tomorrow' : 'next week'}

Make it professional, actionable, and motivating.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            period_label: { type: 'string' },
            executive_summary: { type: 'string' },
            key_accomplishments: {
              type: 'array',
              items: { type: 'string' }
            },
            high_priority_items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task: { type: 'string' },
                  reason: { type: 'string' }
                }
              }
            },
            upcoming_deadlines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task: { type: 'string' },
                  due_date: { type: 'string' }
                }
              }
            },
            blockers: {
              type: 'array',
              items: { type: 'string' }
            },
            productivity_insights: { type: 'string' },
            recommendations: { type: 'string' }
          }
        }
      });

      setSummary(result);
      toast.success('Summary generated');
    } catch (error) {
      toast.error('Failed to generate summary');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const copySummary = () => {
    if (!summary) return;
    
    let text = `${summary.period_label}\n${'='.repeat(50)}\n\n`;
    text += `EXECUTIVE SUMMARY\n${summary.executive_summary}\n\n`;
    
    if (summary.key_accomplishments?.length > 0) {
      text += `KEY ACCOMPLISHMENTS\n`;
      summary.key_accomplishments.forEach(item => text += `✓ ${item}\n`);
      text += '\n';
    }
    
    if (summary.high_priority_items?.length > 0) {
      text += `HIGH PRIORITY ITEMS\n`;
      summary.high_priority_items.forEach(item => {
        text += `• ${item.task}\n  ${item.reason}\n`;
      });
      text += '\n';
    }
    
    if (summary.upcoming_deadlines?.length > 0) {
      text += `UPCOMING DEADLINES\n`;
      summary.upcoming_deadlines.forEach(item => {
        text += `• ${item.task} - Due: ${item.due_date}\n`;
      });
      text += '\n';
    }
    
    if (summary.blockers?.length > 0) {
      text += `BLOCKERS/WAITING\n`;
      summary.blockers.forEach(item => text += `⚠ ${item}\n`);
      text += '\n';
    }
    
    text += `PRODUCTIVITY INSIGHTS\n${summary.productivity_insights}\n\n`;
    text += `RECOMMENDATIONS\n${summary.recommendations}\n`;
    
    navigator.clipboard.writeText(text);
    toast.success('Summary copied to clipboard');
  };

  const emailSummary = async () => {
    if (!summary || !currentUser?.email) return;
    
    setSending(true);
    try {
      let emailBody = `${summary.period_label}\n${'─'.repeat(50)}\n\n`;
      emailBody += `EXECUTIVE SUMMARY\n${summary.executive_summary}\n\n`;
      
      if (summary.key_accomplishments?.length > 0) {
        emailBody += `KEY ACCOMPLISHMENTS\n`;
        summary.key_accomplishments.forEach(item => emailBody += `✓ ${item}\n`);
        emailBody += '\n';
      }
      
      if (summary.high_priority_items?.length > 0) {
        emailBody += `HIGH PRIORITY ITEMS\n`;
        summary.high_priority_items.forEach(item => {
          emailBody += `• ${item.task}\n  ${item.reason}\n`;
        });
        emailBody += '\n';
      }
      
      if (summary.upcoming_deadlines?.length > 0) {
        emailBody += `UPCOMING DEADLINES\n`;
        summary.upcoming_deadlines.forEach(item => {
          emailBody += `• ${item.task} - Due: ${item.due_date}\n`;
        });
        emailBody += '\n';
      }
      
      if (summary.blockers?.length > 0) {
        emailBody += `BLOCKERS/WAITING\n`;
        summary.blockers.forEach(item => emailBody += `⚠ ${item}\n`);
        emailBody += '\n';
      }
      
      emailBody += `PRODUCTIVITY INSIGHTS\n${summary.productivity_insights}\n\n`;
      emailBody += `RECOMMENDATIONS\n${summary.recommendations}\n`;

      await base44.integrations.Core.SendEmail({
        to: currentUser.email,
        subject: `Task Summary - ${summary.period_label}`,
        body: emailBody,
        from_name: 'Isla Accompting Corp Task Manager'
      });

      toast.success('Summary emailed');
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          AI Task Summary Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Summary Period</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Summary</SelectItem>
              <SelectItem value="weekly">Weekly Summary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={generateSummary}
          disabled={generating || !tasks || tasks.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          Generate {period === 'daily' ? 'Daily' : 'Weekly'} Summary
        </Button>

        {summary && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copySummary}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={emailSummary} disabled={sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Email
              </Button>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-bold text-lg mb-2">{summary.period_label}</h3>
              <p className="text-sm text-gray-700">{summary.executive_summary}</p>
            </div>

            {summary.key_accomplishments?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">✓ Key Accomplishments</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {summary.key_accomplishments.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-700">• {item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {summary.high_priority_items?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    High Priority Items
                    <Badge className="bg-red-600">{summary.high_priority_items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {summary.high_priority_items.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium">{item.task}</p>
                      <p className="text-gray-600">{item.reason}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {summary.upcoming_deadlines?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {summary.upcoming_deadlines.map((item, idx) => (
                    <div key={idx} className="text-sm flex justify-between">
                      <span>{item.task}</span>
                      <Badge variant="outline">{item.due_date}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {summary.blockers?.length > 0 && (
              <Card className="border-yellow-300">
                <CardHeader>
                  <CardTitle className="text-base">⚠ Blockers & Waiting</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {summary.blockers.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-700">• {item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card className="bg-green-50">
              <CardHeader>
                <CardTitle className="text-base">Productivity Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{summary.productivity_insights}</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{summary.recommendations}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}