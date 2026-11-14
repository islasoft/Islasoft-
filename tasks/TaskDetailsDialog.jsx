import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Plus, Clock, Play, Pause, CheckCircle2, Trash2, Lock, ArrowRight, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function TaskDetailsDialog({ task, onClose, onEdit, allTasks = [] }) {
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [quickLogHours, setQuickLogHours] = useState('');
  const [depSearch, setDepSearch] = useState('');
  const [showDepSearch, setShowDepSearch] = useState(false);
  const queryClient = useQueryClient();

  const { data: subtasks = [] } = useQuery({
    queryKey: ['subtasks', task.id],
    queryFn: () => base44.entities.Task.filter({ parent_task_id: task.id }),
  });

  const { data: blockedBy = [] } = useQuery({
    queryKey: ['blockedBy', task.id],
    queryFn: async () => {
      if (!task.blocked_by_ids?.length) return [];
      const results = await Promise.all(
        task.blocked_by_ids.map(id => base44.entities.Task.filter({ id }))
      );
      return results.flat();
    },
  });

  // Tasks that this task is blocking (other tasks have this task in their blocked_by_ids)
  const blockingTasks = allTasks.filter(t => (t.blocked_by_ids || []).includes(task.id));

  const updateDepMutation = useMutation({
    mutationFn: (newBlockedByIds) => base44.entities.Task.update(task.id, { blocked_by_ids: newBlockedByIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedBy', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleAddDependency = (depTask) => {
    const current = task.blocked_by_ids || [];
    if (current.includes(depTask.id)) { toast.error('Already added'); return; }
    if (depTask.id === task.id) { toast.error('Cannot depend on itself'); return; }
    updateDepMutation.mutate([...current, depTask.id]);
    setDepSearch('');
    setShowDepSearch(false);
    toast.success(`"${depTask.title}" added as a dependency`);
  };

  const handleRemoveDependency = (depId) => {
    const current = task.blocked_by_ids || [];
    updateDepMutation.mutate(current.filter(id => id !== depId));
  };

  const depSearchResults = depSearch.trim().length > 0
    ? allTasks.filter(t =>
        t.id !== task.id &&
        !(task.blocked_by_ids || []).includes(t.id) &&
        t.title.toLowerCase().includes(depSearch.toLowerCase())
      ).slice(0, 5)
    : [];

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
    setActiveTimer(Date.now());
    setTimerSeconds(0);
    
    const interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
    
    // Store interval ID
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

  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  const progressPercentage = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl">{task.title}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge>{task.status?.replace(/_/g, ' ')}</Badge>
                <Badge variant="outline">{task.priority} priority</Badge>
                {task.client_name && <Badge variant="secondary">{task.client_name}</Badge>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Time Tracking */}
          <div className="border rounded-lg p-4 bg-gray-50">
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
                <span className="text-sm text-gray-600 ml-2">
                  Total: {(task.time_logged || 0).toFixed(2)}h
                </span>
              </div>
            </div>
          </div>

          {/* Dependencies */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-500" />
                Dependencies
              </h3>
              <Button size="sm" variant="outline" onClick={() => setShowDepSearch(v => !v)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>

            {/* Search to add dependency */}
            {showDepSearch && (
              <div className="relative">
                <div className="flex items-center border rounded-lg px-3 py-2 gap-2 bg-slate-50">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    autoFocus
                    className="flex-1 bg-transparent text-sm outline-none"
                    placeholder="Search tasks to add as dependency…"
                    value={depSearch}
                    onChange={e => setDepSearch(e.target.value)}
                  />
                </div>
                {depSearchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                    {depSearchResults.map(t => (
                      <button
                        key={t.id}
                        onMouseDown={() => handleAddDependency(t)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between"
                      >
                        <span>{t.title}</span>
                        <Badge className={t.status === 'completed' ? 'bg-green-600' : 'bg-gray-500'}>
                          {t.status?.replace(/_/g, ' ')}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Blocked By */}
            {blockedBy.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Blocked By</p>
                <div className="space-y-2">
                  {blockedBy.map(dep => (
                    <div key={dep.id} className={`flex items-center justify-between text-sm p-2 rounded-lg border ${dep.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {dep.status === 'completed'
                          ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          : <Lock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        }
                        <span className={`truncate ${dep.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{dep.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <Badge className={dep.status === 'completed' ? 'bg-green-600' : 'bg-orange-600'} >
                          {dep.status?.replace(/_/g, ' ')}
                        </Badge>
                        <button onClick={() => handleRemoveDependency(dep.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blocking */}
            {blockingTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">This task is blocking</p>
                <div className="space-y-2">
                  {blockingTasks.map(bt => (
                    <div key={bt.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">{bt.title}</span>
                      </div>
                      <Badge className={bt.status === 'completed' ? 'bg-green-600' : 'bg-gray-500'}>
                        {bt.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {blockedBy.length === 0 && blockingTasks.length === 0 && !showDepSearch && (
              <p className="text-sm text-slate-400 text-center py-2">No dependencies. Click "Add" to link dependent tasks.</p>
            )}
          </div>

          {/* Subtasks */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Subtasks ({completedSubtasks}/{subtasks.length})</h3>
              <Button size="sm" onClick={handleCreateSubtask}>
                <Plus className="w-4 h-4 mr-2" />
                Add Subtask
              </Button>
            </div>

            {subtasks.length > 0 && (
              <div className="mb-3">
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-gray-600 mt-1">{progressPercentage.toFixed(0)}% complete</p>
              </div>
            )}

            <div className="space-y-2">
              {subtasks.map(subtask => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleToggleSubtask(subtask)}
                  >
                    {subtask.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 rounded" />
                    )}
                  </Button>
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
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onEdit(task)}>
              Edit Task
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}