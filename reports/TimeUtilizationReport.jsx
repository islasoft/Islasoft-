import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

const PROJECT_TYPE_LABELS = {
  individual_tax_1040: '1040 Individual',
  business_tax_1120: '1120 Business',
  s_corp_tax_1120s: '1120S S-Corp',
  partnership_tax_1065: '1065 Partnership',
  nonprofit_tax_990: '990 Nonprofit',
  amended_tax_1040x: '1040X Amended',
  extension_filing: 'Extension',
  estimated_tax_quarterly: 'Est. Tax Qtly',
  k1_preparation: 'K-1 Prep',
  tax_planning_session: 'Tax Planning',
  monthly_bookkeeping: 'Monthly BK',
  quarterly_bookkeeping: 'Quarterly BK',
  annual_bookkeeping: 'Annual BK',
  bank_reconciliations: 'Bank Recon',
  chart_of_accounts_setup: 'Chart of Accts',
  financial_statement_prep: 'Fin. Statements',
  quickbooks_setup: 'QB Setup',
  quickbooks_review: 'QB Review',
  payroll_setup: 'Payroll Setup',
  payroll_processing: 'Payroll',
  quarterly_payroll_941: 'Payroll 941',
  annual_payroll_w2: 'Payroll W-2',
  '1099_preparation': '1099 Prep',
  sales_tax_registration: 'Sales Tax Reg.',
  monthly_sales_tax: 'Sales Tax Mo.',
  quarterly_sales_tax: 'Sales Tax Qtly',
  entity_formation: 'Entity Formation',
  s_corp_election_2553: 'S-Corp 2553',
  irs_notice_review: 'IRS Notice',
  penalty_abatement: 'Penalty Abate.',
  installment_agreement: 'Installment Agr.',
  audit_representation: 'Audit Rep.',
  client_onboarding: 'Onboarding',
};

const COLORS = [
  '#0EA5E9', '#6366F1', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#84CC16',
  '#06B6D4', '#A855F7', '#64748B', '#D946EF', '#22C55E',
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="text-xs">
          {entry.name}: <strong>{Number(entry.value).toFixed(1)}h</strong>
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800">{name}</p>
      <p className="text-slate-600">{Number(value).toFixed(1)}h ({(percent * 100).toFixed(1)}%)</p>
    </div>
  );
};

export default function TimeUtilizationReport({ timeEntries = [], projects = [], filters = {} }) {
  const [dateRange, setDateRange] = useState('all');

  // Filter by date range
  const filteredEntries = useMemo(() => {
    let entries = timeEntries;

    if (filters.userId) entries = entries.filter(e => e.staff_id === filters.userId);

    const now = new Date();
    if (dateRange === '30d') {
      const cutoff = new Date(now); cutoff.setDate(now.getDate() - 30);
      entries = entries.filter(e => e.date && new Date(e.date) >= cutoff);
    } else if (dateRange === '90d') {
      const cutoff = new Date(now); cutoff.setDate(now.getDate() - 90);
      entries = entries.filter(e => e.date && new Date(e.date) >= cutoff);
    } else if (dateRange === 'ytd') {
      const cutoff = new Date(now.getFullYear(), 0, 1);
      entries = entries.filter(e => e.date && new Date(e.date) >= cutoff);
    }

    return entries;
  }, [timeEntries, filters.userId, dateRange]);

  // Build project_type lookup from project_id
  const projectTypeMap = useMemo(() => {
    const map = {};
    projects.forEach(p => { map[p.id] = p.project_type; });
    return map;
  }, [projects]);

  // Hours by project type
  const byProjectType = useMemo(() => {
    const map = {};
    filteredEntries.forEach(e => {
      const ptype = projectTypeMap[e.project_id] || 'other';
      const label = PROJECT_TYPE_LABELS[ptype] || ptype.replace(/_/g, ' ');
      map[label] = (map[label] || 0) + (e.hours || 0);
    });
    return Object.entries(map)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 15); // top 15
  }, [filteredEntries, projectTypeMap]);

  // Hours by staff member
  const byStaff = useMemo(() => {
    const map = {};
    filteredEntries.forEach(e => {
      const name = e.staff_name || 'Unknown';
      map[name] = (map[name] || 0) + (e.hours || 0);
    });
    return Object.entries(map)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredEntries]);

  // Stacked: hours per staff member broken down by project type category
  const staffByCategory = useMemo(() => {
    const TAX = new Set(['individual_tax_1040','business_tax_1120','s_corp_tax_1120s','partnership_tax_1065','nonprofit_tax_990','amended_tax_1040x','extension_filing','estimated_tax_quarterly','k1_preparation','tax_planning_session']);
    const BK = new Set(['monthly_bookkeeping','quarterly_bookkeeping','annual_bookkeeping','bank_reconciliations','chart_of_accounts_setup','financial_statement_prep','quickbooks_setup','quickbooks_review']);
    const PAYROLL = new Set(['payroll_setup','payroll_processing','quarterly_payroll_941','annual_payroll_w2','1099_preparation']);
    const SALESTAX = new Set(['sales_tax_registration','monthly_sales_tax','quarterly_sales_tax']);

    const map = {};
    filteredEntries.forEach(e => {
      const name = e.staff_name || 'Unknown';
      const ptype = projectTypeMap[e.project_id] || '';
      const hours = e.hours || 0;
      if (!map[name]) map[name] = { name, Tax: 0, Bookkeeping: 0, Payroll: 0, 'Sales Tax': 0, Other: 0 };
      if (TAX.has(ptype)) map[name].Tax += hours;
      else if (BK.has(ptype)) map[name].Bookkeeping += hours;
      else if (PAYROLL.has(ptype)) map[name].Payroll += hours;
      else if (SALESTAX.has(ptype)) map[name]['Sales Tax'] += hours;
      else map[name].Other += hours;
    });

    return Object.values(map)
      .map(row => ({
        ...row,
        Tax: parseFloat(row.Tax.toFixed(1)),
        Bookkeeping: parseFloat(row.Bookkeeping.toFixed(1)),
        Payroll: parseFloat(row.Payroll.toFixed(1)),
        'Sales Tax': parseFloat(row['Sales Tax'].toFixed(1)),
        Other: parseFloat(row.Other.toFixed(1)),
      }))
      .sort((a, b) => (b.Tax + b.Bookkeeping + b.Payroll + b['Sales Tax'] + b.Other) - (a.Tax + a.Bookkeeping + a.Payroll + a['Sales Tax'] + a.Other));
  }, [filteredEntries, projectTypeMap]);

  const totalHours = filteredEntries.reduce((s, e) => s + (e.hours || 0), 0);

  const STACK_COLORS = {
    Tax: '#0EA5E9',
    Bookkeeping: '#10B981',
    Payroll: '#F59E0B',
    'Sales Tax': '#8B5CF6',
    Other: '#94A3B8',
  };

  return (
    <div className="space-y-6">
      {/* Header + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-sky-500" />
          <h2 className="text-lg font-semibold text-slate-800">Time Utilization</h2>
          <Badge className="bg-sky-100 text-sky-700 border-0">{totalHours.toFixed(1)}h total</Badge>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {totalHours === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No time entries found for the selected period.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Row 1: Pie + Bar side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Pie: by project type */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Hours by Project Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={byProjectType}
                      dataKey="hours"
                      nameKey="name"
                      cx="40%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={55}
                    >
                      {byProjectType.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span className="text-xs text-slate-600">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar: by staff member */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Hours by Staff Member</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byStaff} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}h`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="hours" fill="#0EA5E9" radius={[0, 4, 4, 0]} name="Hours">
                      <LabelList dataKey="hours" position="right" formatter={v => `${v}h`} style={{ fontSize: 10, fill: '#64748b' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Stacked bar — staff by service category */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Hours per Staff Member by Service Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(260, staffByCategory.length * 48)}>
                <BarChart data={staffByCategory} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}h`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                  {Object.entries(STACK_COLORS).map(([key, color]) => (
                    <Bar key={key} dataKey={key} stackId="a" fill={color} name={key} radius={key === 'Other' ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Row 3: Ranked table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Project Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project Type</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hours</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">% of Total</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 w-40">Distribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {byProjectType.map((row, i) => {
                      const pct = totalHours > 0 ? (row.hours / totalHours) * 100 : 0;
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-sm font-medium text-slate-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            {row.name}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right tabular-nums font-semibold text-slate-800">{row.hours.toFixed(1)}h</td>
                          <td className="px-4 py-2.5 text-sm text-right tabular-nums text-slate-500">{pct.toFixed(1)}%</td>
                          <td className="px-4 py-2.5">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}