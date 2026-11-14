import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Clock, Play, Pause, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../components/mobile/PageHeader';
import TaskComments from '../components/tasks/TaskComments';

export default function TaskDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('id');

  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [quickLogHours, setQuickLogHours] = useState('');

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ id: taskId });
      return tasks[0];
    },
    enabled: !!taskId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => base44.entities.Task.filter({ parent_task_id: taskId }),
    enabled: !!taskId,
  });

  const { data: blockedBy = [] } = useQuery({
    queryKey: ['blockedBy', taskId],
    queryFn: async () => {
      if (!task?.blocked_by_ids?.length) return [];
      const tasks = await Promise.all(
        task.blocked_by_ids.map(id => base44.entities.Task.filter({ id }))
      );
      return tasks.flat();
    },
    enabled: !!task,
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Subtask created');
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const logTimeMutation = useMutation({
    mutationFn: async ({ hours }) => {
      const currentLogged = task.time_logged || 0;
      return base44.entities.Task.update(task.id, {
        time_logged: currentLogged + hours
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Time logged');
      setQuickLogHours('');
    },
  });

  const handleCreateSubtask = () => {
    const title = prompt('Enter subtask title:');
    if (!title) return;

    createSubtaskMutation.mutate({
      title,
      parent_task_id: task.id,
      project_id: task.project_id,
      client_id: task.client_id,
      client_name: task.client_name,
      project_name: task.project_name,
      assigned_to_id: task.assigned_to_id,
      assigned_to_name: task.assigned_to_name,
      priority: task.priority,
      status: 'todo',
    });
  };

  const handleToggleSubtask = (subtask) => {
    updateSubtaskMutation.mutate({
      id: subtask.id,
      data: { status: subtask.status === 'completed' ? 'todo' : 'completed' }
    });
  };

  const handleStartTimer = () => {
    const interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
    
    setActiveTimer({ startTime: Date.now(), intervalId: interval });
  };

  const handleStopTimer = () => {
    if (activeTimer?.intervalId) {
      clearInterval(activeTimer.intervalId);
      const hours = timerSeconds / 3600;
      logTimeMutation.mutate({ hours });
      setActiveTimer(null);
      setTimerSeconds(0);
    }
  };

  const handleQuickLog = () => {
    const hours = parseFloat(quickLogHours);
    if (isNaN(hours) || hours <= 0) {
      toast.error('Please enter valid hours');
      return;
    }
    logTimeMutation.mutate({ hours });
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (activeTimer?.intervalId) {
        clearInterval(activeTimer.intervalId);
      }
    };
  }, [activeTimer]);

  if (!task) {
    return (
      <div className="space-y-6">
        <PageHeader title="Task Details" showBack={true} />
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Task not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  const progressPercentage = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Task Details" showBack={true} />
      
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-lg md:text-xl">{task.title}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge>{task.status?.replace(/_/g, ' ')}</Badge>
              <Badge variant="outline">{task.priority} priority</Badge>
              {task.client_name && <Badge variant="secondary">{task.client_name}</Badge>}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Time Tracking */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Tracking
            </h3>
            
            <div className="space-y-3">
              {/* Timer */}
              <div className="flex items-center gap-3">
                {activeTimer ? (
                  <>
                    <div className="text-2xl font-mono font-bold">{formatTime(timerSeconds)}</div>
                    <Button onClick={handleStopTimer} variant="destructive" size="sm">
                      <Pause className="w-4 h-4 mr-2" />
                      Stop & Log
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleStartTimer} size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    Start Timer
                  </Button>
                )}
              </div>

              {/* Quick Log */}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.25"
                  placeholder="Hours"
                  value={quickLogHours}
                  onChange={(e) => setQuickLogHours(e.target.value)}
                  className="w-24"
                />
                <Button onClick={handleQuickLog} size="sm" variant="outline">
                  Quick Log
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                  Total: {(task.time_logged || 0).toFixed(2)}h
                </span>
              </div>
            </div>
          </div>

          {/* Dependencies */}
          {blockedBy.length > 0 && (
            <div className="border rounded-lg p-4 dark:border-gray-700">
              <h3 className="font-semibold mb-2">Blocked By:</h3>
              <div className="space-y-2">
                {blockedBy.map(dep => (
                  <div key={dep.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span>{dep.title}</span>
                    <Badge className={dep.status === 'completed' ? 'bg-green-600' : 'bg-gray-600'}>
                      {dep.status?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div className="border rounded-lg p-4 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Subtasks ({completedSubtasks}/{subtasks.length})</h3>
              <Button size="sm" onClick={handleCreateSubtask}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {subtasks.length > 0 && (
              <div className="mb-3">
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{progressPercentage.toFixed(0)}% complete</p>
              </div>
            )}

            <div className="space-y-2">
              {subtasks.map(subtask => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                >
                  <button
                    className="flex-shrink-0"
                    onClick={() => handleToggleSubtask(subtask)}
                  >
                    {subtask.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 rounded" />
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${
                    subtask.status === 'completed' ? 'line-through text-gray-500' : ''
                  }`}>
                    {subtask.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Task Details */}
          {task.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap select-text">{task.description}</p>
            </div>
          )}

          {/* Comments */}
          <div className="pt-4 border-t dark:border-gray-700">
            <TaskComments task={task} currentUser={currentUser} users={users} />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => navigate(`/Tasks?edit=${task.id}`)} className="flex-1">
              Edit Task
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}