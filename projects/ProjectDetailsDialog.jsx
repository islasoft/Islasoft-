import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Edit, Trash2, Calendar, Clock, User, DollarSign, TrendingUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import ProjectComments from './ProjectComments';
import ProjectTasks from './ProjectTasks';

export default function ProjectDetailsDialog({ project, onClose, onEdit, onDelete, currentUser, users }) {
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['projectTimeEntries', project.id],
    queryFn: () => base44.entities.TimeEntry.filter({ project_id: project.id }),
  });

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-green-100 text-green-800',
    waiting: 'bg-orange-100 text-orange-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  // Calculate actual hours and cost
  const actualHours = timeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const budgetUtilization = project.budget_hours ? (actualHours / project.budget_hours) * 100 : 0;

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{project.client_name}</CardTitle>
            <p className="text-gray-600 mt-1">{project.project_type?.replace(/_/g, ' ')}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusColors[project.status]}>
            {project.status?.replace(/_/g, ' ')}
          </Badge>
          {project.priority && (
            <Badge className={priorityColors[project.priority]}>
              {project.priority} priority
            </Badge>
          )}
          <Badge variant="outline">{project.project_category?.replace(/_/g, ' ')}</Badge>
        </div>

        {project.description && (
          <div>
            <p className="text-sm text-gray-600">{project.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          {project.assigned_to_name && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Assigned To</p>
                <p className="text-sm font-medium">{project.assigned_to_name}</p>
              </div>
            </div>
          )}

          {project.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm font-medium">
                  {formatDate(project.start_date)}
                </p>
              </div>
            </div>
          )}

          {project.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Due Date</p>
                <p className="text-sm font-medium">
                  {formatDate(project.due_date)}
                </p>
              </div>
            </div>
          )}

          {project.budget_amount && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Budget</p>
                <p className="text-sm font-medium">${project.budget_amount.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Section */}
        {(project.budget_hours || project.completion_percentage !== undefined) && (
          <div className="space-y-3 pt-4 border-t">
            {project.budget_hours && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Hours Progress</span>
                  <span className="font-medium">{actualHours.toFixed(1)} / {project.budget_hours} hrs</span>
                </div>
                <Progress value={Math.min(budgetUtilization, 100)} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">{budgetUtilization.toFixed(0)}% utilized</p>
              </div>
            )}

            {project.completion_percentage !== undefined && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Overall Completion</span>
                  <span className="font-medium">{project.completion_percentage}%</span>
                </div>
                <Progress value={project.completion_percentage} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Comments and Tasks */}
        <div className="space-y-4 pt-4 border-t">
          <ProjectTasks project={project} users={users} />
          <ProjectComments project={project} currentUser={currentUser} users={users} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {onDelete && (
          <Button onClick={() => onDelete(project.id)} variant="destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        )}
        <Button onClick={() => onEdit(project)} className="bg-blue-600 hover:bg-blue-700">
          <Edit className="w-4 h-4 mr-2" />
          Edit Project
        </Button>
      </CardFooter>
    </Card>
  );
}