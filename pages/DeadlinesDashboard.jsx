import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { formatDate } from '@/lib/utils';
import { CalendarDays, Filter, AlertTriangle, Clock, CheckCircle2, Circle, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';

const PROJECT_TYPE_LABELS = {
  individual_tax_1040: '1040 Individual Tax',
  business_tax_1120: '1120 Business Tax',
  s_corp_tax_1120s: '1120S S-Corp Tax',
  partnership_tax_1065: '1065 Partnership Tax',
  nonprofit_tax_990: '990 Nonprofit Tax',
  amended_tax_1040x: '1040X Amended Tax',
  extension_filing: 'Extension Filing',
  estimated_tax_quarterly: 'Estimated Tax (Quarterly)',
  k1_preparation: 'K-1 Preparation',
  tax_planning_session: 'Tax Planning Session',
  monthly_bookkeeping: 'Monthly Bookkeeping',
  quarterly_bookkeeping: 'Quarterly Bookkeeping',
  annual_bookkeeping: 'Annual Bookkeeping',
  payroll_processing: 'Payroll Processing',
  quarterly_payroll_941: 'Quarterly Payroll 941',
  annual_payroll_w2: 'Annual Payroll W-2',
  sales_tax_registration: 'Sales Tax Registration',
  monthly_sales_tax: 'Monthly Sales Tax',
  quarterly_sales_tax: 'Quarterly Sales Tax',
  sunbiz_annual_report: 'Sunbiz Annual Report',
  entity_formation: 'Entity Formation',
  s_corp_election_2553: 'S-Corp Election 2553',
};

const TAX_PROJECT_TYPES = new Set([
  'individual_tax_1040','business_tax_1120','s_corp_tax_1120s','partnership_tax_1065',
  'nonprofit_tax_990','amended_tax_1040x','extension_filing','estimated_tax_quarterly',
  'k1_preparation','tax_planning_session','annual_payroll_w2','quarterly_payroll_941',
  'monthly_sales_tax','quarterly_sales_tax','sunbiz_annual_report',
]);

function UrgencyBadge({ dueDate, extensionDeadline, extensionFiled, status }) {
  if (status === 'completed') {
    return <Badge className="bg-emerald-100 text-emerald-700 border-0">Completed</Badge>;
  }
  // Use extension deadline if filed and present
  const effectiveDate = new Date(extensionFiled && extensionDeadline ? extensionDeadline : dueDate);
  const days = differenceInDays(effectiveDate, new Date());

  if (isPast(effectiveDate) && !isToday(effectiveDate)) {
    return <Badge className="bg-rose-100 text-rose-700 border-0 gap-1"><AlertTriangle className="w-3 h-3" />Overdue</Badge>;
  }
  if (isToday(effectiveDate)) {
    return <Badge className="bg-rose-100 text-rose-700 border-0">Due Today</Badge>;
  }
  if (days <= 7) {
    return <Badge className="bg-amber-100 text-amber-700 border-0">{days}d left</Badge>;
  }
  if (days <= 30) {
    return <Badge className="bg-sky-100 text-sky-700 border-0">{days}d left</Badge>;
  }
  return <Badge className="bg-slate-100 text-slate-600 border-0">{days}d left</Badge>;
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-sky-500" />
    : <ChevronDown className="w-3 h-3 text-sky-500" />;
}

export default function DeadlinesDashboard() {
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('due_date');
  const [sortDir, setSortDir] = useState('asc');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['deadlines-projects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: !!currentUser,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser,
  });

  // Build list of unique assigned partners from projects
  const partners = useMemo(() => {
    const map = new Map();
    projects.forEach(p => {
      if (p.assigned_to_id && p.assigned_to_name) {
        map.set(p.assigned_to_id, p.assigned_to_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const filtered = useMemo(() => {
    let items = projects.filter(p => p.due_date); // only items with a due date

    if (typeFilter === 'tax') items = items.filter(p => TAX_PROJECT_TYPES.has(p.project_type));
    if (typeFilter === 'other') items = items.filter(p => !TAX_PROJECT_TYPES.has(p.project_type));

    if (partnerFilter !== 'all') items = items.filter(p => p.assigned_to_id === partnerFilter);

    const effDate = (p) => new Date(p.extension_filed && p.extension_deadline ? p.extension_deadline : p.due_date);
    if (statusFilter === 'active') items = items.filter(p => p.status !== 'completed');
    else if (statusFilter === 'overdue') items = items.filter(p => {
      if (p.status === 'completed') return false;
      return isPast(effDate(p)) && !isToday(effDate(p));
    });
    else if (statusFilter === 'due_soon') items = items.filter(p => {
      if (p.status === 'completed') return false;
      const days = differenceInDays(effDate(p), new Date());
      return days >= 0 && days <= 14;
    });
    else if (statusFilter !== 'all') items = items.filter(p => p.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(p =>
        (p.client_name || '').toLowerCase().includes(q) ||
        (p.project_type || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.assigned_to_name || '').toLowerCase().includes(q)
      );
    }

    items = [...items].sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'due_date') {
        aVal = new Date(a.due_date).getTime();
        bVal = new Date(b.due_date).getTime();
      } else if (sortField === 'client') {
        aVal = (a.client_name || '').toLowerCase();
        bVal = (b.client_name || '').toLowerCase();
      } else if (sortField === 'partner') {
        aVal = (a.assigned_to_name || '').toLowerCase();
        bVal = (b.assigned_to_name || '').toLowerCase();
      } else if (sortField === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      } else {
        aVal = a[sortField] || '';
        bVal = b[sortField] || '';
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [projects, partnerFilter, statusFilter, typeFilter, search, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // Summary counts
  const getEffectiveDate = (p) => new Date(p.extension_filed && p.extension_deadline ? p.extension_deadline : p.due_date);
  const overdueCount = projects.filter(p => p.status !== 'completed' && p.due_date && isPast(getEffectiveDate(p)) && !isToday(getEffectiveDate(p))).length;
  const dueSoonCount = projects.filter(p => {
    if (p.status === 'completed' || !p.due_date) return false;
    const d = differenceInDays(getEffectiveDate(p), new Date());
    return d >= 0 && d <= 14;
  }).length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

  const thClass = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 cursor-pointer select-none hover:text-slate-700 whitespace-nowrap";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-sky-500" />
          Deadlines Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">All upcoming tax filing deadlines and project due dates across clients</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setStatusFilter('overdue')}
          className={`text-left p-4 rounded-lg border-2 transition-all ${statusFilter === 'overdue' ? 'border-rose-400 bg-rose-50' : 'border-rose-100 bg-white hover:bg-rose-50'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Overdue</span>
          </div>
          <p className="text-3xl font-bold text-rose-700">{overdueCount}</p>
          <p className="text-xs text-rose-500 mt-0.5">projects past due date</p>
        </button>

        <button
          onClick={() => setStatusFilter('due_soon')}
          className={`text-left p-4 rounded-lg border-2 transition-all ${statusFilter === 'due_soon' ? 'border-amber-400 bg-amber-50' : 'border-amber-100 bg-white hover:bg-amber-50'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Due Soon</span>
          </div>
          <p className="text-3xl font-bold text-amber-700">{dueSoonCount}</p>
          <p className="text-xs text-amber-500 mt-0.5">due within 14 days</p>
        </button>

        <button
          onClick={() => setStatusFilter('completed')}
          className={`text-left p-4 rounded-lg border-2 transition-all ${statusFilter === 'completed' ? 'border-emerald-400 bg-emerald-50' : 'border-emerald-100 bg-white hover:bg-emerald-50'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Completed</span>
          </div>
          <p className="text-3xl font-bold text-emerald-700">{completedCount}</p>
          <p className="text-xs text-emerald-500 mt-0.5">projects finished</p>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />

          <Input
            placeholder="Search client, type, partner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-56 h-8 text-sm"
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active (not done)</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="due_soon">Due Soon (14d)</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={partnerFilter} onValueChange={setPartnerFilter}>
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue placeholder="Assigned Partner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Partners</SelectItem>
              {partners.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="Project Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="tax">Tax Filings</SelectItem>
              <SelectItem value="other">Other Projects</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter !== 'active' || partnerFilter !== 'all' || typeFilter !== 'all' || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-500"
              onClick={() => { setStatusFilter('active'); setPartnerFilter('all'); setTypeFilter('all'); setSearch(''); }}
            >
              Clear filters
            </Button>
          )}

          <span className="ml-auto text-xs text-slate-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        {loadingProjects ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading deadlines...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Circle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No projects match the current filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className={thClass} onClick={() => handleSort('due_date')}>
                    <span className="flex items-center gap-1">Due Date <SortIcon field="due_date" sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                  <th className={thClass} onClick={() => handleSort('client')}>
                    <span className="flex items-center gap-1">Client <SortIcon field="client" sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Project Type</th>
                  <th className={thClass} onClick={() => handleSort('partner')}>
                    <span className="flex items-center gap-1">Assigned To <SortIcon field="partner" sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                  <th className={thClass} onClick={() => handleSort('status')}>
                    <span className="flex items-center gap-1">Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(project => {
                  const hasExtension = project.extension_filed && project.extension_deadline;
                  const effectiveDate = new Date(hasExtension ? project.extension_deadline : project.due_date);
                  const isOverdue = project.status !== 'completed' && isPast(effectiveDate) && !isToday(effectiveDate);
                  return (
                    <tr key={project.id} className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-rose-50/40' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center text-center flex-shrink-0 ${isOverdue ? 'bg-rose-100' : hasExtension ? 'bg-violet-50' : 'bg-sky-50'}`}>
                            <span className={`text-[8px] font-bold uppercase leading-none ${isOverdue ? 'text-rose-500' : hasExtension ? 'text-violet-500' : 'text-sky-500'}`}>{format(effectiveDate, 'MMM')}</span>
                            <span className={`text-xs font-bold leading-tight ${isOverdue ? 'text-rose-700' : hasExtension ? 'text-violet-700' : 'text-sky-700'}`}>{format(effectiveDate, 'd')}</span>
                          </div>
                          <div>
                            <span className="text-sm text-slate-700 font-medium">{formatDate(effectiveDate)}</span>
                            {hasExtension && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Badge className="bg-violet-100 text-violet-700 border-0 text-[10px] px-1.5 py-0">Extension</Badge>
                                <span className="text-[10px] text-slate-400">orig: {formatDate(project.due_date)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{project.client_name || '—'}</p>
                        {project.description && (
                          <p className="text-xs text-slate-400 truncate max-w-[180px]">{project.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {PROJECT_TYPE_LABELS[project.project_type] || project.project_type?.replace(/_/g, ' ') || '—'}
                        </span>
                        {TAX_PROJECT_TYPES.has(project.project_type) && (
                          <Badge className="ml-2 bg-violet-100 text-violet-700 border-0 text-[10px]">Tax</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {project.assigned_to_name || <span className="text-slate-300">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-4 py-3">
                        <UrgencyBadge dueDate={project.due_date} extensionDeadline={project.extension_deadline} extensionFiled={project.extension_filed} status={project.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}