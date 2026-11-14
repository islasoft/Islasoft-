import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, FolderKanban, Clock, DollarSign, FileText, Users, TrendingUp, Plus, CheckSquare, ArrowRight, CalendarDays, UserCircle2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import StatusBadge from '../components/shared/StatusBadge';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatDate } from '@/lib/utils';

export default function Dashboard() {
  const [filters] = useState({ assignee: '', client: '', status: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = currentUser?.role === 'admin' || currentUser?.team_category === 'cpa' || currentUser?.team_category === 'senior_staff';
  const isStaff = currentUser?.team_category === 'staff' && currentUser?.role !== 'admin';

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: isManager,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const allProjects = await base44.entities.Project.list();
      if (isStaff) return allProjects.filter(p => p.assigned_to_id === currentUser.id);
      return allProjects;
    },
    enabled: !!currentUser,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    enabled: !!currentUser,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: async () => {
      const allEntries = await base44.entities.TimeEntry.list();
      if (isStaff) return allEntries.filter(e => e.staff_id === currentUser.id);
      return allEntries;
    },
    enabled: !!currentUser,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    enabled: isManager,
  });

  // KPI calculations
  const activeClientsCount = clients.filter(c => c.status === 'active').length;
  const openTasksCount = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length;
  const pendingInvoicesTotal = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + (i.total || 0), 0);
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const hoursThisMonth = timeEntries
    .filter(e => e.date && new Date(e.date) >= monthStart && new Date(e.date) <= monthEnd)
    .reduce((sum, e) => sum + (e.hours || 0), 0);

  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'not_started');
  const upcomingDeadlines = projects
    .filter(p => p.due_date && new Date(p.due_date) >= new Date())
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 6);

  const recentTasks = tasks
    .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))
    .slice(0, 6);

  const kpiCards = isStaff ? [
    { title: 'My Projects', value: projects.filter(p => p.assigned_to_id === currentUser?.id).length, icon: FolderKanban, color: 'bg-sky-500', tint: 'bg-sky-50', link: 'Projects' },
    { title: 'Open Tasks', value: openTasksCount, icon: CheckSquare, color: 'bg-violet-500', tint: 'bg-violet-50', link: 'Tasks' },
    { title: 'Hours This Month', value: hoursThisMonth.toFixed(1) + 'h', icon: Clock, color: 'bg-emerald-500', tint: 'bg-emerald-50', link: 'TimeTracking' },
  ] : [
    { title: 'Active Clients', value: activeClientsCount, icon: Users, color: 'bg-sky-500', tint: 'bg-sky-50', link: 'Clients' },
    { title: 'Open Tasks', value: openTasksCount, icon: CheckSquare, color: 'bg-violet-500', tint: 'bg-violet-50', link: 'Tasks' },
    { title: 'Pending Invoices', value: '$' + pendingInvoicesTotal.toLocaleString(), icon: DollarSign, color: 'bg-amber-500', tint: 'bg-amber-50', link: 'Invoices' },
    { title: 'Hours This Month', value: hoursThisMonth.toFixed(1) + 'h', icon: Clock, color: 'bg-emerald-500', tint: 'bg-emerald-50', link: 'TimeTracking' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back, {currentUser?.full_name?.split(' ')[0] || 'there'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2 text-slate-600">
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>



      {/* KPI Cards */}
      <div className={`grid gap-5 ${kpiCards.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.title} to={createPageUrl(kpi.link)}>
              <div className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow p-5 flex items-center gap-4 cursor-pointer group">
                <div className={`${kpi.tint} p-3 rounded-xl`}>
                  <Icon className={`w-5 h-5 ${kpi.color.replace('bg-', 'text-')}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5">{kpi.title}</p>
                  <p className="text-2xl font-bold text-slate-800 tabular-nums">{kpi.value}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Second Row: Active Projects + Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Active Projects */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Active Projects</h2>
            <Link to={createPageUrl('Projects')}>
              <Button variant="ghost" size="sm" className="text-xs text-sky-600 hover:text-sky-700 h-7 px-2 gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            {activeProjects.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No active projects</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Client</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeProjects.slice(0, 7).map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">
                          {project.description || project.project_type?.replace(/_/g, ' ') || 'Unnamed'}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500 whitespace-nowrap">{project.client_name || '—'}</td>
                      <td className="px-5 py-3"><StatusBadge status={project.status} /></td>
                      <td className="px-5 py-3 text-sm text-slate-500 whitespace-nowrap">
                        {project.due_date ? formatDate(project.due_date) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Recent Tasks</h2>
            <Link to={createPageUrl('Tasks')}>
              <Button variant="ghost" size="sm" className="text-xs text-sky-600 hover:text-sky-700 h-7 px-2 gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentTasks.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No tasks yet</div>
            ) : recentTasks.map((task) => (
              <div key={task.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700 truncate flex-1">{task.title}</p>
                  <StatusBadge status={task.status} className="flex-shrink-0" />
                </div>
                {task.due_date && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Due {formatDate(task.due_date)}
                </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Third Row: Upcoming Deadlines + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Upcoming Deadlines */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Upcoming Deadlines</h2>
            <span className="text-xs text-slate-400">Next 14 days</span>
          </div>
          <div className="divide-y divide-slate-50">
            {upcomingDeadlines.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No upcoming deadlines</div>
            ) : upcomingDeadlines.map((project) => {
              const dueDate = new Date(project.due_date);
              const daysDiff = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
              const urgency = daysDiff <= 3 ? 'text-rose-600 bg-rose-50' : daysDiff <= 7 ? 'text-amber-600 bg-amber-50' : 'text-sky-600 bg-sky-50';
              return (
                <div key={project.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${urgency}`}>
                    <span className="text-[9px] font-bold uppercase">{format(dueDate, 'MMM')}</span>
                    <span className="text-sm font-bold leading-none">{format(dueDate, 'd')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {project.description || project.project_type?.replace(/_/g, ' ') || 'Unnamed'}
                    </p>
                    <p className="text-xs text-slate-400">{project.client_name}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgency}`}>
                    {daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Tomorrow' : `${daysDiff}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Quick Actions</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            {[
              { label: 'New Client', icon: Users, link: 'Clients', color: 'sky' },
              { label: 'New Project', icon: FolderKanban, link: 'Projects', color: 'violet' },
              { label: 'New Invoice', icon: FileText, link: 'Invoices', color: 'amber' },
              { label: 'Log Time', icon: Clock, link: 'TimeTracking', color: 'emerald' },
            ].map(action => {
              const Icon = action.icon;
              return (
                <Link key={action.label} to={createPageUrl(action.link)}>
                  <div className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-${action.color}-50 hover:bg-${action.color}-100 transition-colors cursor-pointer border border-${action.color}-100`}>
                    <Icon className={`w-5 h-5 text-${action.color}-600`} />
                    <span className={`text-xs font-semibold text-${action.color}-700`}>{action.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}