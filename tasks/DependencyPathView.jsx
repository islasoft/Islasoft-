import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, ArrowRight, Lock, AlertTriangle, GitBranch } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, iconColor: 'text-green-500', dot: 'bg-green-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock, iconColor: 'text-blue-500', dot: 'bg-blue-500' },
  todo: { label: 'To Do', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Circle, iconColor: 'text-gray-400', dot: 'bg-gray-400' },
  waiting: { label: 'Waiting', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle, iconColor: 'text-yellow-500', dot: 'bg-yellow-500' },
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-400',
};

function TaskNode({ task, allTasks, depth = 0, visited = new Set() }) {
  if (visited.has(task.id)) return null;
  visited.add(task.id);

  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const Icon = cfg.icon;
  const isBlocked = (task.blocked_by_ids || []).some(id => {
    const dep = allTasks.find(t => t.id === id);
    return dep && dep.status !== 'completed';
  });

  const blockedByTasks = (task.blocked_by_ids || []).map(id => allTasks.find(t => t.id === id)).filter(Boolean);
  const blockingTasks = allTasks.filter(t => (t.blocked_by_ids || []).includes(task.id));

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-3' : ''}`}>
      {depth > 0 && (
        <div className="flex items-center gap-2 mb-1 text-xs text-slate-400">
          <div className="w-6 h-px bg-slate-300" />
          <ArrowRight className="w-3 h-3" />
          <span>blocks</span>
        </div>
      )}
      <div className={`border rounded-xl p-4 bg-white shadow-sm ${isBlocked && task.status !== 'completed' ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-slate-800">{task.title}</span>
              {isBlocked && task.status !== 'completed' && (
                <Badge className="bg-orange-100 text-orange-700 border border-orange-300 text-xs gap-1">
                  <Lock className="w-3 h-3" /> Blocked
                </Badge>
              )}
              <Badge className={`${cfg.color} border text-xs`}>{cfg.label}</Badge>
              <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-gray-400'}`} title={`${task.priority} priority`} />
            </div>
            {task.client_name && <p className="text-xs text-slate-500 mt-0.5">{task.client_name}</p>}
            {task.due_date && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due {format(new Date(task.due_date), 'MMM d, yyyy')}
              </p>
            )}
            {blockedByTasks.length > 0 && task.status !== 'completed' && (
              <div className="mt-2 flex flex-wrap gap-1">
                {blockedByTasks.map(dep => (
                  <span key={dep.id} className={`text-xs px-2 py-0.5 rounded-full border ${dep.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200 line-through' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    ← {dep.title} ({dep.status === 'completed' ? '✓' : 'pending'})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recursively render tasks this one blocks */}
      {blockingTasks.map(bt => (
        <TaskNode key={bt.id} task={bt} allTasks={allTasks} depth={depth + 1} visited={new Set(visited)} />
      ))}
    </div>
  );
}

export default function DependencyPathView({ tasks }) {
  // Root tasks = tasks that are NOT blocked by any other task (or their blockers are all external/missing)
  // and also have something they block OR are blocked by something
  const tasksWithDeps = tasks.filter(t =>
    (t.blocked_by_ids && t.blocked_by_ids.length > 0) ||
    tasks.some(other => (other.blocked_by_ids || []).includes(t.id))
  );

  // Find true roots: tasks with dependencies but not blocked by any task IN the list
  const roots = useMemo(() => {
    const taskIds = new Set(tasks.map(t => t.id));
    // A root is a task that has no blocked_by within the task list
    const nonRoots = new Set(
      tasks.filter(t => (t.blocked_by_ids || []).some(id => taskIds.has(id))).map(t => t.id)
    );
    return tasksWithDeps.filter(t => !nonRoots.has(t.id));
  }, [tasks, tasksWithDeps]);

  const blockedCount = tasks.filter(t =>
    (t.blocked_by_ids || []).some(id => {
      const dep = tasks.find(d => d.id === id);
      return dep && dep.status !== 'completed';
    })
  ).length;

  const chains = tasksWithDeps.length;

  if (tasksWithDeps.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-16">
          <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No dependencies configured</p>
          <p className="text-slate-400 text-sm mt-1">Open a task and add "Blocked By" dependencies to see the path here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-bold text-slate-700">{chains}</p>
            <p className="text-xs text-slate-500 mt-1">Tasks with Dependencies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-bold text-orange-600">{blockedCount}</p>
            <p className="text-xs text-slate-500 mt-1">Currently Blocked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-bold text-green-600">{chains - blockedCount}</p>
            <p className="text-xs text-slate-500 mt-1">Clear to Proceed</p>
          </CardContent>
        </Card>
      </div>

      {/* Dependency chains */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="w-5 h-5 text-violet-500" />
            Dependency Chains
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {roots.map(root => (
            <div key={root.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
              <TaskNode task={root} allTasks={tasks} depth={0} visited={new Set()} />
            </div>
          ))}

          {/* Isolated dep tasks that have no upstream chain root */}
          {tasksWithDeps
            .filter(t => !roots.find(r => r.id === t.id))
            .filter(t => {
              // Check if this task was already rendered as part of a chain
              const isDownstream = roots.some(root => {
                const check = (task, visited = new Set()) => {
                  if (visited.has(task.id)) return false;
                  visited.add(task.id);
                  if (task.id === t.id) return true;
                  return tasks.filter(x => (x.blocked_by_ids || []).includes(task.id)).some(x => check(x, visited));
                };
                return check(root);
              });
              return !isDownstream;
            })
            .map(t => (
              <div key={t.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                <TaskNode task={t} allTasks={tasks} depth={0} visited={new Set()} />
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}