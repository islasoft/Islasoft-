import React, { useMemo } from 'react';
import KPIWidget from './KPIWidget';
import { DollarSign, Users, Clock, TrendingUp, Briefcase, Target } from 'lucide-react';
import { startOfMonth, subMonths, isWithinInterval } from 'date-fns';

export default function DashboardKPIs({ 
  projects = [], 
  timeEntries = [], 
  invoices = [], 
  clients = [],
  onDrillDown 
}) {
  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = startOfMonth(now);

    // Current month data
    const currentMonthInvoices = invoices.filter(inv => 
      inv.issue_date && isWithinInterval(new Date(inv.issue_date), { start: currentMonthStart, end: now })
    );
    const currentMonthRevenue = currentMonthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Last month data
    const lastMonthInvoices = invoices.filter(inv => 
      inv.issue_date && isWithinInterval(new Date(inv.issue_date), { start: lastMonthStart, end: lastMonthEnd })
    );
    const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Project profitability
    const completedProjects = projects.filter(p => p.status === 'completed');
    const projectsWithBudget = completedProjects.filter(p => p.budget_amount);
    const totalBudget = projectsWithBudget.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    const totalActualCost = projectsWithBudget.reduce((sum, p) => sum + (p.actual_cost || 0), 0);
    const profitMargin = totalBudget > 0 ? ((totalBudget - totalActualCost) / totalBudget) * 100 : 0;

    // Client lifetime value
    const clientRevenue = clients.map(client => {
      const clientInvoices = invoices.filter(inv => inv.client_id === client.id && inv.status === 'paid');
      return clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    });
    const avgClientValue = clientRevenue.length > 0 
      ? clientRevenue.reduce((a, b) => a + b, 0) / clientRevenue.length 
      : 0;

    // Team utilization
    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
    const billableHours = timeEntries.filter(e => e.billable).reduce((sum, entry) => sum + (entry.hours || 0), 0);
    const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

    // Active projects
    const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'not_started');

    // Outstanding revenue
    const outstandingInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');
    const outstandingRevenue = outstandingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    return {
      revenue: {
        current: currentMonthRevenue,
        previous: lastMonthRevenue,
        subtitle: 'This month'
      },
      profitability: {
        value: profitMargin,
        subtitle: `${projectsWithBudget.length} completed projects`
      },
      clientValue: {
        value: avgClientValue,
        subtitle: `Average across ${clients.length} clients`
      },
      utilization: {
        value: utilizationRate,
        subtitle: `${billableHours.toFixed(0)}h billable / ${totalHours.toFixed(0)}h total`
      },
      activeProjects: {
        value: activeProjects.length,
        subtitle: 'Currently in progress'
      },
      outstanding: {
        value: outstandingRevenue,
        subtitle: `${outstandingInvoices.length} unpaid invoices`
      }
    };
  }, [projects, timeEntries, invoices, clients]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <KPIWidget
        title="Monthly Revenue"
        value={kpis.revenue.current}
        previousValue={kpis.revenue.previous}
        format="currency"
        icon={DollarSign}
        subtitle={kpis.revenue.subtitle}
        onClick={() => onDrillDown?.('revenue', kpis.revenue)}
      />
      <KPIWidget
        title="Project Profitability"
        value={kpis.profitability.value}
        format="percentage"
        icon={TrendingUp}
        subtitle={kpis.profitability.subtitle}
        onClick={() => onDrillDown?.('profitability', kpis.profitability)}
      />
      <KPIWidget
        title="Avg Client Lifetime Value"
        value={kpis.clientValue.value}
        format="currency"
        icon={Users}
        subtitle={kpis.clientValue.subtitle}
        onClick={() => onDrillDown?.('clientValue', kpis.clientValue)}
      />
      <KPIWidget
        title="Team Utilization"
        value={kpis.utilization.value}
        format="percentage"
        icon={Clock}
        subtitle={kpis.utilization.subtitle}
        onClick={() => onDrillDown?.('utilization', kpis.utilization)}
      />
      <KPIWidget
        title="Active Projects"
        value={kpis.activeProjects.value}
        format="number"
        icon={Briefcase}
        subtitle={kpis.activeProjects.subtitle}
        onClick={() => onDrillDown?.('activeProjects', kpis.activeProjects)}
      />
      <KPIWidget
        title="Outstanding Revenue"
        value={kpis.outstanding.value}
        format="currency"
        icon={Target}
        subtitle={kpis.outstanding.subtitle}
        onClick={() => onDrillDown?.('outstanding', kpis.outstanding)}
      />
    </div>
  );
}