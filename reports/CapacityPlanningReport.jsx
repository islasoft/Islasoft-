import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Users, Calendar, TrendingUp } from 'lucide-react';
import { format, addDays, isWithinInterval, parseISO, startOfDay } from 'date-fns';

// Configurable capacity: weekly billable hours per staff member
const DEFAULT_WEEKLY_HOURS = 40;
const PLANNING_DAYS = 30;

const OVERALLOC_THRESHOLD = 1.0;  // 100% = over
const WARN_THRESHOLD = 0.8;        // 80% = warning

function getStatusColor(ratio) {
  if (ratio > OVERALLOC_THRESHOLD) return { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', bar: '#EF4444' };
  if (ratio >= WARN_THRESHOLD) return { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', bar: '#F59E0B' };
  return { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', bar: '#10B981' };
}

function getStatusLabel(ratio) {
  if (ratio > OVERALLOC_THRESHOLD) return 'Over-allocated';
  if (ratio >= WARN_THRESHOLD) return 'At Risk';
  return 'On Track';
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color ?? '#64748b' }} className="text-xs">
          {entry.name}: <strong>{Number(entry.value).toFixed(1)}h</strong>
        </p>
      ))}
    </div>
  );
};

export default function CapacityPlanningReport({ projects = [], timeEntries = [], users = [] }) {
  const [weeklyCapacity, setWeeklyCapacity] = useState(String(DEFAULT_WEEKLY_HOURS));

  const capacityHours = parseFloat(weeklyCapacity) || DEFAULT_WEEKLY_HOURS;
  const totalCapacity = (capacityHours / 5) * PLANNING_DAYS; // total working hours over 30 days

  const today = startOfDay(new Date());
  const horizon = addDays(today, PLANNING_DAYS);

  // Projects due within 30 days that are not completed
  const upcomingProjects = useMemo(() =>
    projects.filter(p => {
      if (!p.due_date || p.status === 'completed') return false;
      const due = parseISO(p.due_date);
      return due >= today && due <= horizon;
    }),
    [projects, today, horizon]
  );

  // Avg daily hours per staff from last 30 days of actuals
  const last30Start = addDays(today, -30);
  const recentEntries = useMemo(() =>
    timeEntries.filter(e => {
      if (!e.date) return false;
      const d = parseISO(e.date);
      return d >= last30Start && d < today;
    }),
    [timeEntries, last30Start, today]
  );

  // Hours already logged per person for each active project
  const loggedByProject = useMemo(() => {
    const map = {};
    timeEntries.forEach(e => {
      if (!e.project_id) return;
      map[e.project_id] = (map[e.project_id] || 0) + (e.hours || 0);
    });
    return map;
  }, [timeEntries]);

  // Build per-staff workload estimate
  const staffWorkload = useMemo(() => {
    // Gather all staff who appear in users list or are assigned to upcoming projects
    const staffMap = {};

    users.forEach(u => {
      staffMap[u.id] = {
        id: u.id,
        name: u.full_name || u.email || u.id,
        assignedProjects: [],
        estimatedHours: 0,
      };
    });

    // Add any project assignees not in users list
    upcomingProjects.forEach(p => {
      if (p.assigned_to_id && !staffMap[p.assigned_to_id]) {
        staffMap[p.assigned_to_id] = {
          id: p.assigned_to_id,
          name: p.assigned_to_name || p.assigned_to_id,
          assignedProjects: [],
          estimatedHours: 0,
        };
      }
    });

    // Estimate remaining hours for each project assigned to each staff
    upcomingProjects.forEach(p => {
      if (!p.assigned_to_id) return;
      const staff = staffMap[p.assigned_to_id];
      if (!staff) return;

      const budgeted = p.budget_hours || 0;
      const logged = loggedByProject[p.id] || 0;
      const completion = (p.completion_percentage || 0) / 100;

      let remaining;
      if (budgeted > 0) {
        // Use budget remaining
        remaining = Math.max(0, budgeted - logged);
      } else if (completion > 0 && logged > 0) {
        // Estimate total from % complete then subtract logged
        const estimatedTotal = logged / completion;
        remaining = Math.max(0, estimatedTotal - logged);
      } else {
        // No data — assume 8h default
        remaining = 8;
      }

      staff.estimatedHours += remaining;
      staff.assignedProjects.push({
        id: p.id,
        name: p.client_name
          ? `${p.client_name} – ${(p.project_type || '').replace(/_/g, ' ')}`
          : (p.project_type || '').replace(/_/g, ' '),
        due_date: p.due_date,
        remaining: parseFloat(remaining.toFixed(1)),
        status: p.status,
      });
    });

    return Object.values(staffMap)
      .filter(s => s.assignedProjects.length > 0 || s.estimatedHours > 0)
      .map(s => ({
        ...s,
        estimatedHours: parseFloat(s.estimatedHours.toFixed(1)),
        ratio: totalCapacity > 0 ? s.estimatedHours / totalCapacity : 0,
      }))
      .sort((a, b) => b.ratio - a.ratio);
  }, [upcomingProjects, users, loggedByProject, totalCapacity]);

  const overAllocated = staffWorkload.filter(s => s.ratio > OVERALLOC_THRESHOLD);
  const atRisk = staffWorkload.filter(s => s.ratio >= WARN_THRESHOLD && s.ratio <= OVERALLOC_THRESHOLD);
  const onTrack = staffWorkload.filter(s => s.ratio < WARN_THRESHOLD);

  const chartData = staffWorkload.map(s => ({
    name: s.name.split(' ')[0], // first name for chart brevity
    fullName: s.name,
    estimatedHours: s.estimatedHours,
    capacity: parseFloat(totalCapacity.toFixed(1)),
    ratio: s.ratio,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sky-500" />
            Capacity Planning — Next 30 Days
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Based on projects due by <strong>{format(horizon, 'MMM d, yyyy')}</strong> and remaining budgeted hours
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Weekly capacity / person:</span>
          <Select value={weeklyCapacity} onValueChange={setWeeklyCapacity}>
            <SelectTrigger className="w-28 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[20, 30, 32, 40, 45, 50].map(h => (
                <SelectItem key={h} value={String(h)}>{h}h / week</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{overAllocated.length}</p>
                <p className="text-xs text-red-600 font-medium">Over-allocated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{atRisk.length}</p>
                <p className="text-xs text-amber-600 font-medium">At Risk (≥80%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{onTrack.length}</p>
                <p className="text-xs text-emerald-600 font-medium">On Track</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {staffWorkload.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No active projects due in the next 30 days with assigned staff.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Estimated Hours vs. Capacity ({totalCapacity.toFixed(0)}h per person)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 44)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}h`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={totalCapacity} stroke="#64748b" strokeDasharray="4 3" label={{ value: 'Capacity', position: 'insideTopRight', fontSize: 10, fill: '#64748b' }} />
                  <Bar dataKey="estimatedHours" name="Est. Hours" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={getStatusColor(entry.ratio).bar} />
                    ))}
                    <LabelList dataKey="estimatedHours" position="right" formatter={v => `${v}h`} style={{ fontSize: 10, fill: '#64748b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Per-staff detail cards */}
          <div className="space-y-4">
            {staffWorkload.map(staff => {
              const colors = getStatusColor(staff.ratio);
              const pct = Math.min(staff.ratio * 100, 150);
              return (
                <Card key={staff.id} className={`border ${colors.border} ${colors.bg}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                          {staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">{staff.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 tabular-nums">
                          {staff.estimatedHours}h / {totalCapacity.toFixed(0)}h
                        </span>
                        <Badge className={`${colors.badge} border-0 text-xs`}>
                          {getStatusLabel(staff.ratio)} — {(staff.ratio * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: colors.bar,
                        }}
                      />
                    </div>

                    {/* Project list */}
                    <div className="space-y-1">
                      {staff.assignedProjects.map((proj, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-slate-600 py-0.5 border-b border-slate-100 last:border-0">
                          <span className="truncate max-w-[65%]">{proj.name}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-slate-400">due {format(parseISO(proj.due_date), 'MMM d')}</span>
                            <span className="font-semibold tabular-nums text-slate-700">{proj.remaining}h left</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}