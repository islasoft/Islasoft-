import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, AlertCircle, Plus, Calendar, Lock } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'waiting', title: 'Waiting', color: 'bg-yellow-100' },
  { id: 'completed', title: 'Completed', color: 'bg-green-100' },
];

const PRIORITY_COLORS = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

export default function KanbanBoard({ tasks, onTaskClick, onCreateTask }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
    },
  });

  const isTaskBlocked = (task) => {
    if (!task.blocked_by_ids?.length) return false;
    return task.blocked_by_ids.some(id => {
      const dep = tasks.find(t => t.id === id);
      return dep && dep.status !== 'completed';
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;

    // Block moving to in_progress if dependencies aren't done
    if (newStatus === 'in_progress') {
      const task = tasks.find(t => t.id === taskId);
      if (task && isTaskBlocked(task)) {
        toast.error('Cannot start task — it has incomplete dependencies. Complete the blocking tasks first.');
        return;
      }
    }
    
    updateMutation.mutate({
      id: taskId,
      data: { status: newStatus }
    });
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status && !task.parent_task_id);
  };

  const getSubtaskCount = (taskId) => {
    return tasks.filter(t => t.parent_task_id === taskId).length;
  };

  const getCompletedSubtasks = (taskId) => {
    return tasks.filter(t => t.parent_task_id === taskId && t.status === 'completed').length;
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((column) => (
          <Card key={column.id} className={column.color}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{column.title}</span>
                <Badge variant="secondary">{getTasksByStatus(column.id).length}</Badge>
              </CardTitle>
            </CardHeader>
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <CardContent
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 min-h-[400px] ${
                    snapshot.isDraggingOver ? 'bg-blue-50' : ''
                  }`}
                >
                  {getTasksByStatus(column.id).map((task, index) => {
                    const subtaskCount = getSubtaskCount(task.id);
                    const completedSubtasks = getCompletedSubtasks(task.id);
                    
                    const blocked = isTaskBlocked(task);
                    return (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`cursor-pointer hover:shadow-md transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                            } ${blocked ? 'border-orange-300 bg-orange-50' : ''}`}
                            onClick={() => onTaskClick(task)}
                          >
                            <CardContent className="p-3 space-y-2">
                              {/* Dependency warning banner */}
                              {blocked && (
                                <div className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-100 border border-orange-200 rounded px-2 py-1">
                                  <Lock className="w-3 h-3 flex-shrink-0" />
                                  <span className="font-medium">Blocked by dependencies</span>
                                </div>
                              )}
                              {/* Priority Indicator */}
                              <div className="flex items-start justify-between gap-2">
                                <div className={`w-1 h-full ${PRIORITY_COLORS[task.priority]} rounded`} />
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
                                  {task.client_name && (
                                    <p className="text-xs text-gray-600 mt-1">{task.client_name}</p>
                                  )}
                                </div>
                                {task.priority === 'urgent' && (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                )}
                              </div>

                              {/* Subtasks Progress */}
                              {subtaskCount > 0 && (
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-blue-600 h-1.5 rounded-full"
                                      style={{ width: `${(completedSubtasks / subtaskCount) * 100}%` }}
                                    />
                                  </div>
                                  <span>{completedSubtasks}/{subtaskCount}</span>
                                </div>
                              )}

                              {/* Footer Info */}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                {task.assigned_to_name && (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    <span className="truncate max-w-[100px]">{task.assigned_to_name}</span>
                                  </div>
                                )}
                                {task.due_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{format(new Date(task.due_date), 'MMM d')}</span>
                                  </div>
                                )}
                              </div>

                              {/* Time Logged */}
                              {task.time_logged && task.time_logged > 0 && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Clock className="w-3 h-3" />
                                  <span>{task.time_logged.toFixed(1)}h logged</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  
                  {/* Add Task Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full border-2 border-dashed"
                    onClick={() => onCreateTask(column.id)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </CardContent>
              )}
            </Droppable>
          </Card>
        ))}
      </div>
    </DragDropContext>
  );
}