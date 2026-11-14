import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileSelect } from '@/components/ui/mobile-select';
import { SelectItem } from '@/components/ui/select';
import { CheckCircle2, Circle, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function ProjectTasks({ project, users }) {
  const [showDialog, setShowDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    assigned_to_id: '',
    priority: 'medium',
    due_date: '',
  });

  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks', project.id],
    queryFn: () => base44.entities.Task.filter({ project_id: project.id }),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const task = await base44.entities.Task.create(data);
      
      // Send notification to assigned user
      if (data.assigned_to_id) {
        const assignedUser = users.find(u => u.id === data.assigned_to_id);
        if (assignedUser) {
          await base44.entities.Notification.create({
            user_id: data.assigned_to_id,
            user_email: assignedUser.email,
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `${data.title} - ${project.project_type}`,
            related_id: task.id,
            related_type: 'task',
            priority: data.priority,
          });
        }
      }
      
      return task;
    },
    onMutate: async (newTask) => {
      await queryClient.cancelQueries(['projectTasks', project.id]);
      const previousTasks = queryClient.getQueryData(['projectTasks', project.id]);
      
      queryClient.setQueryData(['projectTasks', project.id], (old = []) => [
        ...old,
        { ...newTask, id: 'temp-' + Date.now(), status: 'todo' }
      ]);
      
      return { previousTasks };
    },
    onError: (err, newTask, context) => {
      queryClient.setQueryData(['projectTasks', project.id], context.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['projectTasks', project.id]);
    },
    onSuccess: () => {
      setShowDialog(false);
      setNewTask({ title: '', assigned_to_id: '', priority: 'medium', due_date: '' });
      toast.success('Task created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(['projectTasks', project.id]);
      const previousTasks = queryClient.getQueryData(['projectTasks', project.id]);
      
      queryClient.setQueryData(['projectTasks', project.id], (old = []) =>
        old.map((task) => (task.id === id ? { ...task, ...data } : task))
      );
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['projectTasks', project.id], context.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['projectTasks', project.id]);
    },
    onSuccess: () => {
      toast.success('Task updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries(['projectTasks', project.id]);
      const previousTasks = queryClient.getQueryData(['projectTasks', project.id]);
      
      queryClient.setQueryData(['projectTasks', project.id], (old = []) =>
        old.filter((task) => task.id !== id)
      );
      
      return { previousTasks };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['projectTasks', project.id], context.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['projectTasks', project.id]);
    },
    onSuccess: () => {
      toast.success('Task deleted');
    },
  });

  const handleSubmit = () => {
    if (!newTask.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    const assignedUser = users.find(u => u.id === newTask.assigned_to_id);
    
    createMutation.mutate({
      ...newTask,
      project_id: project.id,
      project_name: project.project_type,
      client_id: project.client_id,
      client_name: project.client_name,
      assigned_to_name: assignedUser?.full_name || '',
      status: 'todo',
    });
  };

  const toggleStatus = (task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    updateMutation.mutate({
      id: task.id,
      data: { status: newStatus },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Project Tasks</CardTitle>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-gray-500 text-center py-6 text-sm">No tasks yet</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                <button onClick={() => toggleStatus(task)} className="flex-shrink-0">
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.assigned_to_name && (
                      <span className="text-xs text-gray-500">→ {task.assigned_to_name}</span>
                    )}
                    {task.due_date && (
                      <span className="text-xs text-gray-500">Due: {task.due_date}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(task.id)}
                  className="flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Task Title *</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <MobileSelect
                  value={newTask.assigned_to_id}
                  onValueChange={(value) => setNewTask({ ...newTask, assigned_to_id: value })}
                  placeholder="Select team member"
                >
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </MobileSelect>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <MobileSelect
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                  placeholder="Select priority"
                >
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </MobileSelect>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}