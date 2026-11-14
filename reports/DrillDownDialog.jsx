import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DrillDownDialog({ 
  open, 
  onClose, 
  type, 
  data,
  projects = [],
  invoices = [],
  timeEntries = [],
  clients = []
}) {
  const drillDownData = useMemo(() => {
    switch (type) {
      case 'revenue':
        return {
          title: 'Monthly Revenue Breakdown',
          chart: 'line',
          data: invoices
            .filter(inv => inv.status === 'paid')
            .reduce((acc, inv) => {
              const month = inv.issue_date ? format(new Date(inv.issue_date), 'MMM yyyy') : 'Unknown';
              const existing = acc.find(item => item.month === month);
              if (existing) {
                existing.revenue += inv.total || 0;
              } else {
                acc.push({ month, revenue: inv.total || 0 });
              }
              return acc;
            }, [])
            .sort((a, b) => new Date(a.month) - new Date(b.month))
        };

      case 'profitability':
        return {
          title: 'Project Profitability Analysis',
          chart: 'bar',
          data: projects
            .filter(p => p.budget_amount && p.status === 'completed')
            .map(p => ({
              name: p.client_name,
              budget: p.budget_amount,
              actual: p.actual_cost || 0,
              profit: (p.budget_amount || 0) - (p.actual_cost || 0)
            }))
            .slice(0, 10)
        };

      case 'clientValue':
        return {
          title: 'Top Clients by Revenue',
          chart: 'pie',
          data: clients
            .map(client => ({
              name: client.company_name,
              value: invoices
                .filter(inv => inv.client_id === client.id && inv.status === 'paid')
                .reduce((sum, inv) => sum + (inv.total || 0), 0)
            }))
            .filter(c => c.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
        };

      case 'utilization':
        return {
          title: 'Team Utilization Details',
          chart: 'table',
          data: timeEntries.reduce((acc, entry) => {
            const staff = entry.staff_name || 'Unassigned';
            if (!acc[staff]) {
              acc[staff] = { staff, billable: 0, nonBillable: 0, total: 0 };
            }
            const hours = entry.hours || 0;
            acc[staff].total += hours;
            if (entry.billable) {
              acc[staff].billable += hours;
            } else {
              acc[staff].nonBillable += hours;
            }
            return acc;
          }, {})
        };

      case 'activeProjects':
        return {
          title: 'Active Projects by Status',
          chart: 'table',
          data: projects.filter(p => p.status === 'in_progress' || p.status === 'not_started')
        };

      case 'outstanding':
        return {
          title: 'Outstanding Invoices',
          chart: 'table',
          data: invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue')
        };

      default:
        return { title: 'Details', chart: 'none', data: [] };
    }
  }, [type, data, projects, invoices, timeEntries, clients]);

  const renderChart = () => {
    if (drillDownData.chart === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={drillDownData.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (drillDownData.chart === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={drillDownData.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="budget" fill="#2563eb" name="Budget" />
            <Bar dataKey="actual" fill="#f59e0b" name="Actual Cost" />
            <Bar dataKey="profit" fill="#10b981" name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (drillDownData.chart === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={drillDownData.data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry) => `${entry.name}: $${entry.value.toLocaleString()}`}
            >
              {drillDownData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (drillDownData.chart === 'table') {
      if (type === 'utilization') {
        const tableData = Object.values(drillDownData.data);
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Staff Member</th>
                  <th className="text-right p-2">Billable Hours</th>
                  <th className="text-right p-2">Non-Billable</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">Utilization %</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2">{row.staff}</td>
                    <td className="text-right p-2">{row.billable.toFixed(1)}h</td>
                    <td className="text-right p-2">{row.nonBillable.toFixed(1)}h</td>
                    <td className="text-right p-2">{row.total.toFixed(1)}h</td>
                    <td className="text-right p-2">
                      <Badge className={row.total > 0 && (row.billable / row.total) > 0.75 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {row.total > 0 ? ((row.billable / row.total) * 100).toFixed(1) : 0}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      if (type === 'activeProjects') {
        return (
          <div className="space-y-2">
            {drillDownData.data.map((project) => (
              <Card key={project.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{project.client_name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{project.project_type?.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                        {project.status?.replace(/_/g, ' ')}
                      </Badge>
                      {project.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {format(new Date(project.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      }

      if (type === 'outstanding') {
        return (
          <div className="space-y-2">
            {drillDownData.data.map((invoice) => (
              <Card key={invoice.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{invoice.client_name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Invoice #{invoice.invoice_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">${invoice.total?.toLocaleString()}</p>
                      <Badge className={invoice.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                        {invoice.status}
                      </Badge>
                      {invoice.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      }
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{drillDownData.title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {renderChart()}
        </div>
      </DialogContent>
    </Dialog>
  );
}