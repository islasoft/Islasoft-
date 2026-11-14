import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, BookOpen, Upload, CheckCircle2, Clock, AlertCircle,
  Calendar, User, RefreshCw, LogOut, FolderKanban, AlertTriangle
} from 'lucide-react';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import TaxDocumentUploader from '@/components/clients/TaxDocumentUploader';
import ClientMessenger from '@/components/client_portal/ClientMessenger';
import ClientInvoiceList from '@/components/client_portal/ClientInvoiceList';

const TAX_CATEGORIES = ['tax_compliance', 'irs_representation'];
const BOOKKEEPING_CATEGORIES = ['bookkeeping_accounting', 'payroll_employment', 'sales_local_tax'];

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-slate-100 text-slate-700', icon: Clock },
  in_progress:  { label: 'In Progress',  color: 'bg-blue-100 text-blue-700',   icon: RefreshCw },
  waiting:      { label: 'Waiting',       color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  on_hold:      { label: 'On Hold',       color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  completed:    { label: 'Completed',     color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
};

const PRIORITY_CONFIG = {
  low:    { color: 'bg-slate-100 text-slate-600' },
  medium: { color: 'bg-blue-100 text-blue-600' },
  high:   { color: 'bg-orange-100 text-orange-700' },
  urgent: { color: 'bg-red-100 text-red-700' },
};

function ProjectCard({ project }) {
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.not_started;
  const StatusIcon = status.icon;
  const isOverdue = project.due_date && isPast(new Date(project.due_date)) && project.status !== 'completed';
  const isDueSoon = project.due_date && !isOverdue && isWithinInterval(new Date(project.due_date), {
    start: new Date(), end: addDays(new Date(), 14)
  });

  const progress = project.completion_percentage ?? 0;

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 text-sm leading-tight">
            {project.description || project.project_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Project'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">
            {project.project_category?.replace(/_/g, ' ')}
          </p>
        </div>
        <Badge className={`${status.color} flex items-center gap-1 text-xs whitespace-nowrap`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-sky-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        {project.due_date && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : isDueSoon ? 'text-amber-600 font-medium' : ''}`}>
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {isOverdue ? '⚠ Overdue: ' : isDueSoon ? '⏰ Due soon: ' : 'Due: '}
              {format(new Date(project.due_date), 'MMM d, yyyy')}
            </span>
          </div>
        )}
        {project.assigned_to_name && (
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>{project.assigned_to_name}</span>
          </div>
        )}
      </div>

      {project.priority && project.priority !== 'medium' && (
        <div className="mt-2">
          <Badge className={`${PRIORITY_CONFIG[project.priority]?.color} text-xs capitalize`}>
            {project.priority} priority
          </Badge>
        </div>
      )}
    </div>
  );
}

function ProjectSection({ title, icon: Icon, projects, emptyMessage }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-sky-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      {projects.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-sm text-slate-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className={`rounded-xl p-4 border ${color} flex items-center gap-3`}>
      <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
    </div>
  );
}

export default function ClientStatusPortal() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['clientPortalUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientList = [], isLoading: clientLoading } = useQuery({
    queryKey: ['clientPortalClient', currentUser?.id],
    queryFn: () => base44.entities.Client.filter({ user_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  const client = clientList[0];

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['clientPortalProjects', client?.id],
    queryFn: () => base44.entities.Project.filter({ client_id: client.id }, '-due_date'),
    enabled: !!client?.id,
  });

  const { data: sharedDocs = [] } = useQuery({
    queryKey: ['clientPortalDocs', client?.id],
    queryFn: () => base44.entities.SharedDocument.filter({ client_id: client.id }),
    enabled: !!client?.id,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['clientPortalProjects'] });
    await queryClient.invalidateQueries({ queryKey: ['clientPortalDocs'] });
    setIsRefreshing(false);
  };

  const handleLogout = () => base44.auth.logout('/');

  if (userLoading || clientLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">No Account Linked</h2>
            <p className="text-slate-500 text-sm">Your login is not linked to a client account. Please contact us for assistance.</p>
            <Button variant="outline" onClick={handleLogout}>Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const taxProjects = projects.filter(p => TAX_CATEGORIES.includes(p.project_category));
  const bookkeepingProjects = projects.filter(p => BOOKKEEPING_CATEGORIES.includes(p.project_category));
  const otherProjects = projects.filter(p => !TAX_CATEGORIES.includes(p.project_category) && !BOOKKEEPING_CATEGORIES.includes(p.project_category));

  const activeCount = projects.filter(p => ['in_progress', 'waiting'].includes(p.status)).length;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const overdueCount = projects.filter(p => p.due_date && isPast(new Date(p.due_date)) && p.status !== 'completed').length;
  const pendingDocsCount = sharedDocs.filter(d => !d.viewed_by_client).length;

  const clientDisplayName = client.contact_person || client.name || client.company_name || 'Client';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">Client Portal</h1>
              <p className="text-xs text-slate-500">{client.company_name || client.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-slate-500 hover:text-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-slate-600">
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Welcome back, {clientDisplayName} 👋</h2>
          <p className="text-slate-500 text-sm mt-1">Here's the current status of your work with us.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Active Projects" value={activeCount} icon={FolderKanban} color="bg-blue-50 border-blue-200 text-blue-700" />
          <SummaryCard label="Completed" value={completedCount} icon={CheckCircle2} color="bg-green-50 border-green-200 text-green-700" />
          <SummaryCard label="Overdue" value={overdueCount} icon={AlertTriangle} color={overdueCount > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50 border-slate-200 text-slate-500"} />
          <SummaryCard label="New Documents" value={pendingDocsCount} icon={FileText} color={pendingDocsCount > 0 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-500"} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tax">
              Tax Returns
              {taxProjects.filter(p => p.status !== 'completed').length > 0 && (
                <span className="ml-1.5 bg-sky-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {taxProjects.filter(p => p.status !== 'completed').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="bookkeeping">Bookkeeping</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-6 space-y-8">
            {projectsLoading ? (
              <p className="text-center text-slate-400 py-10">Loading projects...</p>
            ) : (
              <>
                {taxProjects.length > 0 && (
                  <ProjectSection
                    title="Tax Returns"
                    icon={FileText}
                    projects={taxProjects.slice(0, 4)}
                    emptyMessage="No tax projects"
                  />
                )}
                {bookkeepingProjects.length > 0 && (
                  <ProjectSection
                    title="Bookkeeping & Payroll"
                    icon={BookOpen}
                    projects={bookkeepingProjects.slice(0, 4)}
                    emptyMessage="No bookkeeping projects"
                  />
                )}
                {otherProjects.length > 0 && (
                  <ProjectSection
                    title="Other Services"
                    icon={FolderKanban}
                    projects={otherProjects.slice(0, 4)}
                    emptyMessage="No other projects"
                  />
                )}
                {projects.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
                    <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No active projects yet.</p>
                    <p className="text-slate-400 text-sm mt-1">Contact us to get started.</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* TAX RETURNS */}
          <TabsContent value="tax" className="mt-6">
            <ProjectSection
              title="Tax Return Projects"
              icon={FileText}
              projects={taxProjects}
              emptyMessage="No tax return projects on file."
            />
          </TabsContent>

          {/* BOOKKEEPING */}
          <TabsContent value="bookkeeping" className="mt-6">
            <ProjectSection
              title="Bookkeeping & Payroll Projects"
              icon={BookOpen}
              projects={bookkeepingProjects}
              emptyMessage="No bookkeeping projects on file."
            />
          </TabsContent>

          {/* DOCUMENTS */}
          <TabsContent value="documents" className="mt-6">
            <TaxDocumentUploader
              clientId={client.id}
              clientName={client.company_name || client.name}
            />
          </TabsContent>

          {/* INVOICES */}
          <TabsContent value="invoices" className="mt-6">
            <ClientInvoiceList clientId={client.id} />
          </TabsContent>

          {/* MESSAGES */}
          <TabsContent value="messages" className="mt-6">
            <ClientMessenger
              clientId={client.id}
              clientName={client.company_name || client.name}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}