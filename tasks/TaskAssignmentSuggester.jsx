import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, UserCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TaskAssignmentSuggester({ tasks, teamMembers, onAssignmentsUpdated }) {
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const suggestAssignments = async () => {
    if (!tasks || tasks.length === 0) {
      toast.error('No unassigned tasks to analyze');
      return;
    }

    setSuggesting(true);
    try {
      const unassignedTasks = tasks.filter(t => !t.assigned_to_id);
      
      const teamSummary = teamMembers.map(m => ({
        id: m.id,
        name: m.full_name,
        role: m.team_category,
        current_task_count: tasks.filter(t => t.assigned_to_id === m.id && t.status !== 'completed').length
      }));

      const taskSummary = unassignedTasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        due_date: t.due_date,
        client: t.client_name,
        tags: t.tags
      }));

      const prompt = `You are assigning tasks for a CPA firm. Suggest optimal team member assignments.

TEAM MEMBERS:
${JSON.stringify(teamSummary, null, 2)}

UNASSIGNED TASKS:
${JSON.stringify(taskSummary, null, 2)}

For each task, suggest:
1. Best team member to assign (by ID)
2. Reason for assignment
3. Match score (0-100)
4. Alternative assignee if needed

Consider:
- Role expertise (CPA for complex tax, senior staff for reviews, staff for routine)
- Current workload balance
- Task complexity and priority
- Specialization areas`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            assignments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task_id: { type: 'string' },
                  task_title: { type: 'string' },
                  suggested_assignee_id: { type: 'string' },
                  suggested_assignee_name: { type: 'string' },
                  match_score: { type: 'number' },
                  reason: { type: 'string' },
                  alternative_assignee_id: { type: 'string' },
                  alternative_assignee_name: { type: 'string' }
                }
              }
            },
            workload_summary: { type: 'string' }
          }
        }
      });

      setSuggestions(result);
      toast.success('Assignment suggestions generated');
    } catch (error) {
      toast.error('Failed to generate suggestions');
      console.error(error);
    } finally {
      setSuggesting(false);
    }
  };

  const applyAssignment = async (taskId, assigneeId, assigneeName) => {
    try {
      await base44.entities.Task.update(taskId, {
        assigned_to_id: assigneeId,
        assigned_to_name: assigneeName
      });
      toast.success('Task assigned');
      if (onAssignmentsUpdated) onAssignmentsUpdated();
    } catch (error) {
      toast.error('Failed to assign task');
    }
  };

  const applyAllAssignments = async () => {
    if (!suggestions?.assignments) return;
    
    for (const assignment of suggestions.assignments) {
      await applyAssignment(
        assignment.task_id,
        assignment.suggested_assignee_id,
        assignment.suggested_assignee_name
      );
    }
  };

  const getMatchColor = (score) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-blue-600';
    if (score >= 40) return 'bg-yellow-600';
    return 'bg-orange-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          AI Task Assignment Suggester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={suggestAssignments}
          disabled={suggesting || !tasks || tasks.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {suggesting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <UserCheck className="w-4 h-4 mr-2" />
          )}
          Suggest Task Assignments
        </Button>

        {suggestions && (
          <div className="space-y-4 pt-4 border-t">
            {suggestions.workload_summary && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900">
                <p className="font-medium mb-1">Workload Analysis:</p>
                <p>{suggestions.workload_summary}</p>
              </div>
            )}

            {suggestions.assignments?.length > 0 ? (
              <>
                <div className="flex justify-between items-center">
                  <p className="font-medium">
                    {suggestions.assignments.length} Assignment Suggestions
                  </p>
                  <Button onClick={applyAllAssignments} size="sm">
                    Assign All
                  </Button>
                </div>

                {suggestions.assignments.map((assignment, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <h4 className="font-semibold">{assignment.task_title}</h4>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Badge className="bg-blue-600">
                          {assignment.suggested_assignee_name}
                        </Badge>
                        <Badge className={getMatchColor(assignment.match_score)}>
                          Match: {assignment.match_score}%
                        </Badge>
                      </div>

                      <div className="text-sm space-y-2">
                        <div>
                          <p className="font-medium text-gray-700">Reason:</p>
                          <p className="text-gray-600">{assignment.reason}</p>
                        </div>
                        {assignment.alternative_assignee_name && (
                          <div>
                            <p className="font-medium text-gray-700">Alternative:</p>
                            <p className="text-gray-600">{assignment.alternative_assignee_name}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => applyAssignment(
                            assignment.task_id,
                            assignment.suggested_assignee_id,
                            assignment.suggested_assignee_name
                          )}
                          size="sm"
                          variant="outline"
                        >
                          Assign to {assignment.suggested_assignee_name.split(' ')[0]}
                        </Button>
                        {assignment.alternative_assignee_id && (
                          <Button
                            onClick={() => applyAssignment(
                              assignment.task_id,
                              assignment.alternative_assignee_id,
                              assignment.alternative_assignee_name
                            )}
                            size="sm"
                            variant="outline"
                          >
                            Assign to {assignment.alternative_assignee_name.split(' ')[0]}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No unassigned tasks found.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}