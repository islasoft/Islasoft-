import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AITaskGenerator({ clients, projects, teamMembers, onTasksCreated }) {
  const [generating, setGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState(null);

  const generateTasks = async () => {
    setGenerating(true);
    try {
      // Fetch recent messages and emails
      const messages = await base44.entities.Message.list('-created_date', 20);
      const emails = await base44.entities.EmailTracking.list('-sent_date', 20);
      
      const communicationContent = [
        ...messages.map(m => `MESSAGE from ${m.sender_name}: ${m.subject || ''} - ${m.content}`),
        ...emails.map(e => `EMAIL to ${e.recipient_email}: ${e.subject}`)
      ].join('\n\n');

      if (!communicationContent.trim()) {
        toast.error('No recent communications found');
        setGenerating(false);
        return;
      }

      const prompt = `You are an expert task manager at Isla Accompting Corp, a CPA firm.

Analyze these recent client communications and extract actionable tasks:

COMMUNICATIONS:
${communicationContent}

Extract and create tasks with:
1. Clear task title (action-oriented)
2. Detailed description
3. Suggested client (from context if mentioned)
4. Priority (low/medium/high/urgent based on urgency indicators)
5. Suggested due date (relative to today: ${new Date().toISOString().split('T')[0]})
6. Confidence score (0-100) for each task
7. Relevant tags

Look for:
- Action items, requests, deadlines
- Tax filing requirements, document requests
- Meeting scheduling needs
- Follow-up requirements
- Compliance deadlines

Return all identified tasks.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  client_name: { type: 'string' },
                  priority: { type: 'string' },
                  suggested_due_date: { type: 'string' },
                  confidence_score: { type: 'number' },
                  tags: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            },
            summary: { type: 'string' }
          }
        }
      });

      setGeneratedTasks(result);
      toast.success(`${result.tasks?.length || 0} tasks identified`);
    } catch (error) {
      toast.error('Failed to generate tasks');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const createTask = async (taskData) => {
    try {
      // Find matching client
      const client = clients.find(c => 
        taskData.client_name && 
        c.company_name.toLowerCase().includes(taskData.client_name.toLowerCase())
      );

      const task = await base44.entities.Task.create({
        title: taskData.title,
        description: taskData.description,
        client_id: client?.id || '',
        client_name: client?.company_name || taskData.client_name || '',
        priority: taskData.priority || 'medium',
        status: 'todo',
        due_date: taskData.suggested_due_date,
        source: 'ai_generated',
        ai_confidence_score: taskData.confidence_score,
        tags: taskData.tags || []
      });

      toast.success('Task created');
      if (onTasksCreated) onTasksCreated();
      return task;
    } catch (error) {
      toast.error('Failed to create task');
      console.error(error);
    }
  };

  const createAllTasks = async () => {
    if (!generatedTasks?.tasks) return;
    
    for (const taskData of generatedTasks.tasks) {
      await createTask(taskData);
    }
    setGeneratedTasks(null);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          AI Task Generator from Communications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          <p className="font-medium mb-2">🤖 AI Task Analyzer</p>
          <p>The AI automatically analyzes your communications and suggests tasks based on content from:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Internal messages</li>
            <li>Email tracking records</li>
            <li>Client communications</li>
          </ul>
        </div>

        <Button
          onClick={generateTasks}
          disabled={generating}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Analyze Recent Communications
        </Button>

        {generatedTasks && (
          <div className="space-y-4 pt-4 border-t">
            {generatedTasks.summary && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900">
                {generatedTasks.summary}
              </div>
            )}

            <div className="flex justify-between items-center">
              <p className="font-medium">{generatedTasks.tasks?.length || 0} Tasks Identified</p>
              <Button onClick={createAllTasks} size="sm">
                <Check className="w-4 h-4 mr-2" />
                Create All
              </Button>
            </div>

            {generatedTasks.tasks?.map((task, idx) => (
              <Card key={idx}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold">{task.title}</h4>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{task.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {task.client_name && (
                      <Badge variant="outline">{task.client_name}</Badge>
                    )}
                    {task.suggested_due_date && (
                      <Badge variant="outline">Due: {task.suggested_due_date}</Badge>
                    )}
                    {task.confidence_score && (
                      <Badge variant="outline">
                        Confidence: {task.confidence_score}%
                      </Badge>
                    )}
                    {task.tags?.map((tag, i) => (
                      <Badge key={i} variant="outline" className="bg-gray-100">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    onClick={() => createTask(task)}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    Create This Task
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}