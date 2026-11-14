import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationActions({ notification, onComplete }) {
  const [quickTime, setQuickTime] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const queryClient = useQueryClient();

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }) => {
      await base44.entities.Task.update(taskId, updates);
      await base44.entities.Notification.update(notification.id, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Task updated');
      onComplete?.();
    },
  });

  const logTimeMutation = useMutation({
    mutationFn: async ({ taskId, hours }) => {
      const tasks = await base44.entities.Task.filter({ id: taskId });
      const task = tasks[0];
      const currentLogged = task?.time_logged || 0;
      
      await base44.entities.Task.update(taskId, {
        time_logged: currentLogged + hours
      });
      await base44.entities.Notification.update(notification.id, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Time logged');
      setQuickTime('');
      onComplete?.();
    },
  });

  // Task assignment notification actions
  if (notification.type === 'task_assigned') {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateTaskMutation.mutate({ 
            taskId: notification.related_id, 
            updates: { status: 'in_progress' } 
          })}
          disabled={updateTaskMutation.isPending}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Start Task
        </Button>
        <div className="flex gap-1">
          <Input
            type="number"
            step="0.25"
            placeholder="Hours"
            value={quickTime}
            onChange={(e) => setQuickTime(e.target.value)}
            className="w-20 h-8 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const hours = parseFloat(quickTime);
              if (!isNaN(hours) && hours > 0) {
                logTimeMutation.mutate({ taskId: notification.related_id, hours });
              }
            }}
            disabled={!quickTime || logTimeMutation.isPending}
          >
            <Clock className="w-3 h-3 mr-1" />
            Log
          </Button>
        </div>
      </div>
    );
  }

  // Task status change notification
  if (notification.type === 'task_status_changed') {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        <Select value={newStatus} onValueChange={setNewStatus}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Update status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (newStatus) {
              updateTaskMutation.mutate({ 
                taskId: notification.related_id, 
                updates: { status: newStatus } 
              });
            }
          }}
          disabled={!newStatus || updateTaskMutation.isPending}
        >
          Update
        </Button>
      </div>
    );
  }

  // Deadline approaching - quick time log
  if (notification.type === 'task_overdue' || notification.type === 'deadline_approaching') {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateTaskMutation.mutate({ 
            taskId: notification.related_id, 
            updates: { status: 'completed' } 
          })}
          disabled={updateTaskMutation.isPending}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Complete
        </Button>
        <div className="flex gap-1">
          <Input
            type="number"
            step="0.25"
            placeholder="Hours"
            value={quickTime}
            onChange={(e) => setQuickTime(e.target.value)}
            className="w-20 h-8 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const hours = parseFloat(quickTime);
              if (!isNaN(hours) && hours > 0) {
                logTimeMutation.mutate({ taskId: notification.related_id, hours });
              }
            }}
            disabled={!quickTime || logTimeMutation.isPending}
          >
            <Clock className="w-3 h-3 mr-1" />
            Log Time
          </Button>
        </div>
      </div>
    );
  }

  return null;
}