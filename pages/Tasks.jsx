import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ListTodo, Sparkles, TrendingUp, Users, FileText, Calendar, GitBranch } from 'lucide-react';
import PageHeader from '../components/mobile/PageHeader';
import PullToRefresh from '../components/mobile/PullToRefresh';
import AITaskGenerator from '../components/tasks/AITaskGenerator';
import TaskPriorityAnalyzer from '../components/tasks/TaskPriorityAnalyzer';
import TaskAssignmentSuggester from '../components/tasks/TaskAssignmentSuggester';
import TaskSummaryGenerator from '../components/tasks/TaskSummaryGenerator';
import KanbanBoard from '../components/tasks/KanbanBoard';
import TaskDetailsDialog from '../components/tasks/TaskDetailsDialog';
import DependencyPathView from '../components/tasks/DependencyPathView';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function Tasks() {
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedTask, setSelectedTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      try {
        return await base44.entities.Task.list('-created_date');
      } catch (error) {
        console.error('Error loading tasks:', error);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        return await base44.entities.Client.list();
      } catch (error) {
        console.error('Error loading clients:', error);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        return await base44.entities.Project.list('-created_date');
      } catch (error) {
        console.error('Error loading projects:', error);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch (error) {
        console.error('Error loading team members:', error);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: async () => {
      try {
        return await base44.entities.TimeEntry.list();
      } catch (error) {
        console.error('Error loading time entries:', error);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);
      
      queryClient.setQueryData(['tasks'], (old = []) =>
        old.map((task) => (task.id === id ? { ...task, ...data } : task))
      );
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tasks'], context.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousProjects = queryClient.getQueryData(['projects']);
      
      queryClient.setQueryData(['projects'], (old = []) =>
        old.map((project) => (project.id === id ? { ...project, ...data } : project))
      );
      
      return { previousProjects };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['projects'], context.previousProjects);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onSuccess: () => {
      toast.success('Project status updated');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);
      
      queryClient.setQueryData(['tasks'], (old = []) =>
        old.filter((task) => task.id !== id)
      );
      
      return { previousTasks };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['tasks'], context.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onSuccess: () => {
      toast.success('Task deleted');
    },
  });

  const handleDataRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
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

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-600',
      in_progress: 'bg-blue-600',
      todo: 'bg-gray-600',
      waiting: 'bg-yellow-600'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-600';
  };

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    waiting: tasks.filter(t => t.status === 'waiting'),
    completed: tasks.filter(t => t.status === 'completed')
  };

  // Filter projects that have tasks or time entries
  const userProjects = projects.filter(p => {
    const hasTasks = tasks.some(t => t.project_id === p.id);
    const hasTimeEntries = timeEntries.some(te => te.project_id === p.id);
    return hasTasks || hasTimeEntries;
  });

  const projectsByStatus = {
    not_started: userProjects.filter(p => p.status === 'not_started'),
    in_progress: userProjects.filter(p => p.status === 'in_progress'),
    waiting: userProjects.filter(p => p.status === 'waiting'),
    completed: userProjects.filter(p => p.status === 'completed')
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    await queryClient.invalidateQueries({ queryKey: ['projects'] });
    await queryClient.invalidateQueries({ queryKey: ['clients'] });
    await queryClient.invalidateQueries({ queryKey: ['team'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <PageHeader title="Tasks" showBack={true} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 hidden md:block">Task Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base hidden md:block">AI-powered task tracking and management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-gray-700">{projectsByStatus.not_started.length}</p>
            <p className="text-sm text-gray-600">Not Started</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-600">{projectsByStatus.in_progress.length}</p>
            <p className="text-sm text-gray-600">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-yellow-600">{projectsByStatus.waiting.length}</p>
            <p className="text-sm text-gray-600">Waiting</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{projectsByStatus.completed.length}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="projects">
            <FileText className="w-4 h-4 mr-2" />
            My Projects
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ListTodo className="w-4 h-4 mr-2" />
            Tasks List
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <TrendingUp className="w-4 h-4 mr-2" />
            Kanban Board
          </TabsTrigger>
          <TabsTrigger value="dependencies">
            <GitBranch className="w-4 h-4 mr-2" />
            Dependency Path
          </TabsTrigger>
          <TabsTrigger value="ai-tools">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
          {!currentUser ? (
            <div className="text-center py-12">Loading...</div>
          ) : userProjects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No projects assigned to you yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {['not_started', 'in_progress', 'waiting', 'completed'].map((status) => (
                <div key={status} className="space-y-4">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <h3 className="font-semibold capitalize flex items-center justify-between">
                      {status.replace('_', ' ')}
                      <Badge className={getStatusColor(status)}>{projectsByStatus[status].length}</Badge>
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {projectsByStatus[status].map(project => (
                      <Card key={project.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">{project.client_name}</CardTitle>
                          <p className="text-xs text-gray-600 mt-1">
                            {project.project_type?.replace(/_/g, ' ')}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {project.due_date && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Calendar className="w-3 h-3" />
                              Due: {formatDate(project.due_date)}
                            </div>
                          )}
                          {project.assigned_to_name && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Users className="w-3 h-3" />
                              {project.assigned_to_name}
                            </div>
                          )}
                          <div className="flex gap-1 flex-wrap pt-2">
                            {['not_started', 'in_progress', 'waiting', 'completed'].map(newStatus => (
                              newStatus !== status && (
                                <Button
                                  key={newStatus}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    updateProjectMutation.mutate({
                                      id: project.id,
                                      data: { status: newStatus }
                                    });
                                  }}
                                >
                                  → {newStatus.replace('_', ' ')}
                                </Button>
                              )
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <KanbanBoard 
            tasks={tasks}
            onTaskClick={setSelectedTask}
            onCreateTask={(status) => toast.info('Use AI Tools to create tasks')}
          />
          {selectedTask && (
            <TaskDetailsDialog
              task={selectedTask}
              allTasks={tasks}
              onClose={() => setSelectedTask(null)}
              onEdit={() => setSelectedTask(null)}
            />
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          {isLoading ? (
            <div className="text-center py-12">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tasks yet. Use AI Tools to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                statusTasks.length > 0 && (
                  <div key={status}>
                    <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                      {status.replace('_', ' ')}
                      <Badge className={getStatusColor(status)}>{statusTasks.length}</Badge>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {statusTasks.map(task => (
                        <Card key={task.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <Checkbox
                                checked={task.status === 'completed'}
                                onCheckedChange={(checked) => {
                                  updateTaskMutation.mutate({
                                    id: task.id,
                                    data: { status: checked ? 'completed' : 'todo' }
                                  });
                                }}
                              />
                              <div className="flex-1">
                                <CardTitle className="text-base">{task.title}</CardTitle>
                                {task.client_name && (
                                  <p className="text-xs text-gray-500 mt-1">{task.client_name}</p>
                                )}
                              </div>
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {task.description && (
                              <p className="text-sm text-gray-600">{task.description}</p>
                            )}
                            <div className="space-y-2">
                              {task.assigned_to_name && (
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Users className="w-3 h-3" />
                                  {task.assigned_to_name}
                                </div>
                              )}
                              {task.due_date && (
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Calendar className="w-3 h-3" />
                                  Due: {formatDate(task.due_date)}
                                </div>
                              )}
                            </div>
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {task.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {task.source !== 'manual' && (
                              <Badge variant="outline" className="text-xs">
                                {task.source === 'ai_generated' ? 'AI Generated' : 
                                 task.source === 'email' ? 'From Email' : 'From Message'}
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTaskMutation.mutate(task.id)}
                              className="w-full text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dependencies" className="mt-6">
          <DependencyPathView tasks={tasks} />
        </TabsContent>

        <TabsContent value="ai-tools" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AITaskGenerator
              clients={clients}
              projects={projects}
              teamMembers={teamMembers}
              onTasksCreated={handleDataRefresh}
            />
            <TaskPriorityAnalyzer
              tasks={tasks}
              onPrioritiesUpdated={handleDataRefresh}
            />
            <TaskAssignmentSuggester
              tasks={tasks}
              teamMembers={teamMembers}
              onAssignmentsUpdated={handleDataRefresh}
            />
            <TaskSummaryGenerator
              tasks={tasks}
              currentUser={currentUser}
            />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </PullToRefresh>
  );
}