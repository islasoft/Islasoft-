import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, Calendar, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '../components/mobile/PageHeader';
import ProjectComments from '../components/projects/ProjectComments';
import ProjectTasks from '../components/projects/ProjectTasks';
import { toast } from 'sonner';

export default function ProjectDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['projectTimeEntries', projectId],
    queryFn: () => base44.entities.TimeEntry.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
      navigate(-1);
    },
    onError: () => {
      toast.error('Failed to delete project');
    },
  });

  if (isLoading || !project) {
    return (
      <div className="space-y-6">
        <PageHeader title="Project Details" showBack={true} />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

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

  const actualHours = timeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const budgetUtilization = project.budget_hours ? (actualHours / project.budget_hours) * 100 : 0;

  const handleEdit = () => {
    navigate(`/Projects?editProject=${project.id}`);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteMutation.mutate(project.id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Project Details" showBack={true} />
      
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-xl md:text-2xl">{project.client_name}</CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">{project.project_type?.replace(/_/g, ' ')}</p>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
            {project.assigned_to_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Assigned To</p>
                  <p className="text-sm font-medium">{project.assigned_to_name}</p>
                </div>
              </div>
            )}

            {project.start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                  <p className="text-sm font-medium">
                    {format(new Date(project.start_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {project.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                  <p className="text-sm font-medium">
                    {format(new Date(project.due_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {project.budget_amount && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                  <p className="text-sm font-medium">${project.budget_amount.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {(project.budget_hours || project.completion_percentage !== undefined) && (
            <div className="space-y-3 pt-4 border-t dark:border-gray-700">
              {project.budget_hours && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Hours Progress</span>
                    <span className="font-medium">{actualHours.toFixed(1)} / {project.budget_hours} hrs</span>
                  </div>
                  <Progress value={Math.min(budgetUtilization, 100)} className="h-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{budgetUtilization.toFixed(0)}% utilized</p>
                </div>
              )}

              {project.completion_percentage !== undefined && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Overall Completion</span>
                    <span className="font-medium">{project.completion_percentage}%</span>
                  </div>
                  <Progress value={project.completion_percentage} className="h-2" />
                </div>
              )}
            </div>
          )}

          <div className="space-y-4 pt-4 border-t dark:border-gray-700">
            <ProjectTasks project={project} users={users} />
            <ProjectComments project={project} currentUser={currentUser} users={users} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <Button onClick={handleDelete} variant="destructive" className="w-full sm:w-auto">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            <Edit className="w-4 h-4 mr-2" />
            Edit Project
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}