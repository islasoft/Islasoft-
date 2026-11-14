import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileBarChart } from 'lucide-react';
import PageHeader from '../components/mobile/PageHeader';
import ReportFilters from '../components/reports/ReportFilters';
import TimeEntrySummaryReport from '../components/reports/TimeEntrySummaryReport';
import ProjectProfitabilityReport from '../components/reports/ProjectProfitabilityReport';
import InvoiceAgingReport from '../components/reports/InvoiceAgingReport';
import UserUtilizationReport from '../components/reports/UserUtilizationReport';
import ProjectStatusReport from '../components/reports/ProjectStatusReport';
import ProjectStatusFilters from '../components/reports/ProjectStatusFilters';
import TeamPerformanceReport from '../components/reports/TeamPerformanceReport';
import ClientInsightsReport from '../components/reports/ClientInsightsReport';
import QuickBooksSyncReport from '../components/reports/QuickBooksSyncReport';
import ARAgingReport from '../components/reports/ARAgingReport';
import ContractorPaymentReport from '../components/reports/ContractorPaymentReport';
import ContractorApprovalReport from '../components/reports/ContractorApprovalReport';
import TimeUtilizationReport from '../components/reports/TimeUtilizationReport';
import CapacityPlanningReport from '../components/reports/CapacityPlanningReport';
import UnbilledTimeReport from '../components/reports/UnbilledTimeReport';
import { logAudit } from '../components/security/AuditLogger';
import PasswordVaultPage from './PasswordVault';
import ReminderSettingsPage from './ReminderSettings';
import AuditDashboardPage from './AuditDashboard';
import DashboardKPIs from '../components/reports/DashboardKPIs';
import AIInsights from '../components/reports/AIInsights';
import DrillDownDialog from '../components/reports/DrillDownDialog';

export default function Reports() {
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    clientId: null,
    projectId: null,
    userId: null,
  });
  const [projectStatusFilters, setProjectStatusFilters] = useState({
    clients: [],
    statuses: [],
    assignedTos: [],
    dueDateFrom: null,
    dueDateTo: null,
  });
  const [timeGroupBy, setTimeGroupBy] = useState('project');
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownType, setDrillDownType] = useState(null);
  const [drillDownData, setDrillDownData] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = currentUser?.role === 'admin' || currentUser?.team_category === 'cpa' || currentUser?.team_category === 'senior_staff';

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: isManager,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: !!currentUser,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    enabled: !!currentUser,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    enabled: isManager,
  });

  React.useEffect(() => {
    if (currentUser && isManager) {
      logAudit('view_report', 'Reports', null, 'Reports Dashboard');
    }
  }, [currentUser, isManager]);

  const clearFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      clientId: null,
      projectId: null,
      userId: null,
    });
  };

  const handleDrillDown = (type, data) => {
    setDrillDownType(type);
    setDrillDownData(data);
    setDrillDownOpen(true);
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileBarChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-600">
              Reports are only available to Managers, CPAs, and Administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" showBack={true} />
      <div className="flex items-center gap-3 hidden md:flex">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <FileBarChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive business insights and reporting</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full flex-wrap gap-2 h-auto p-2">
            <TabsTrigger value="dashboard" className="whitespace-nowrap">Dashboard</TabsTrigger>
            <TabsTrigger value="time-summary" className="whitespace-nowrap">Time Summary</TabsTrigger>
            <TabsTrigger value="unbilled-time" className="whitespace-nowrap">Unbilled Time</TabsTrigger>
            <TabsTrigger value="contractor-payment" className="whitespace-nowrap">Contractor Payment</TabsTrigger>
            <TabsTrigger value="contractor-approval" className="whitespace-nowrap">Contractor Approval</TabsTrigger>
            <TabsTrigger value="projects" className="whitespace-nowrap">Projects</TabsTrigger>
            <TabsTrigger value="profitability" className="whitespace-nowrap">Profitability</TabsTrigger>
            <TabsTrigger value="aging" className="whitespace-nowrap">Invoice Aging</TabsTrigger>
            <TabsTrigger value="ar-aging" className="whitespace-nowrap">AR Aging (QB)</TabsTrigger>
            <TabsTrigger value="utilization" className="whitespace-nowrap">Utilization</TabsTrigger>
            <TabsTrigger value="time-utilization" className="whitespace-nowrap">Time Utilization</TabsTrigger>
            <TabsTrigger value="capacity-planning" className="whitespace-nowrap">Capacity Planning</TabsTrigger>
            <TabsTrigger value="team-performance" className="whitespace-nowrap">Team Performance</TabsTrigger>
            <TabsTrigger value="client-insights" className="whitespace-nowrap">Client Insights</TabsTrigger>
            <TabsTrigger value="quickbooks-sync" className="whitespace-nowrap">QuickBooks Sync</TabsTrigger>
            <TabsTrigger value="password-vault" className="whitespace-nowrap">Password Vault</TabsTrigger>
            <TabsTrigger value="reminders" className="whitespace-nowrap">Reminders</TabsTrigger>
            <TabsTrigger value="audit-log" className="whitespace-nowrap">Audit Log</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-6">
          <DashboardKPIs
            projects={projects}
            timeEntries={timeEntries}
            invoices={invoices}
            clients={clients}
            onDrillDown={handleDrillDown}
          />
          
          <AIInsights
            projects={projects}
            timeEntries={timeEntries}
            invoices={invoices}
            clients={clients}
          />
        </TabsContent>

        <TabsContent value="time-summary" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            projects={projects}
            users={users}
            onClearFilters={clearFilters}
          />
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <label className="text-sm font-medium">Group By:</label>
                <Select value={timeGroupBy} onValueChange={setTimeGroupBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <TimeEntrySummaryReport
            timeEntries={timeEntries}
            filters={filters}
            groupBy={timeGroupBy}
          />
        </TabsContent>

        <TabsContent value="unbilled-time" className="space-y-6">
          <UnbilledTimeReport
            timeEntries={timeEntries}
            clients={clients}
          />
        </TabsContent>

        <TabsContent value="contractor-payment" className="space-y-6">
          <ContractorPaymentReport />
        </TabsContent>

        <TabsContent value="contractor-approval" className="space-y-6">
          <ContractorApprovalReport />
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <ProjectStatusFilters
            clients={clients}
            users={users}
            filters={projectStatusFilters}
            onFilterChange={setProjectStatusFilters}
            onClearFilters={() => setProjectStatusFilters({
              clients: [],
              statuses: [],
              assignedTos: [],
              dueDateFrom: null,
              dueDateTo: null,
            })}
          />
          
          <ProjectStatusReport
            projects={projects}
            clients={clients}
            users={users}
            filters={projectStatusFilters}
          />
        </TabsContent>

        <TabsContent value="profitability" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            projects={projects}
            users={users}
            showUserFilter={false}
            showDateRange={false}
            onClearFilters={clearFilters}
          />
          
          <ProjectProfitabilityReport
            projects={projects}
            timeEntries={timeEntries}
            invoices={invoices}
            filters={filters}
          />
        </TabsContent>

        <TabsContent value="aging" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            projects={projects}
            users={users}
            showProjectFilter={false}
            showUserFilter={false}
            showDateRange={false}
            onClearFilters={clearFilters}
          />
          
          <InvoiceAgingReport
            invoices={invoices}
            filters={filters}
          />
        </TabsContent>

        <TabsContent value="ar-aging" className="space-y-6">
          <ARAgingReport />
        </TabsContent>

        <TabsContent value="utilization" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            projects={projects}
            users={users}
            showClientFilter={false}
            showProjectFilter={false}
            onClearFilters={clearFilters}
          />
          
          <UserUtilizationReport
            users={users}
            timeEntries={timeEntries}
            filters={filters}
          />
        </TabsContent>

        <TabsContent value="time-utilization" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            projects={projects}
            users={users}
            showClientFilter={false}
            showProjectFilter={false}
            onClearFilters={clearFilters}
          />
          <TimeUtilizationReport
            timeEntries={timeEntries}
            projects={projects}
            filters={filters}
          />
        </TabsContent>

        <TabsContent value="capacity-planning" className="space-y-6">
          <CapacityPlanningReport
            projects={projects}
            timeEntries={timeEntries}
            users={users}
          />
        </TabsContent>

        <TabsContent value="team-performance" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            projects={projects}
            users={users}
            showClientFilter={false}
            onClearFilters={clearFilters}
          />
          
          <TeamPerformanceReport
            users={users}
            projects={projects}
            timeEntries={timeEntries}
            filters={filters}
          />
        </TabsContent>

        <TabsContent value="client-insights" className="space-y-6">
          <ClientInsightsReport
            clients={clients}
            projects={projects}
            invoices={invoices}
          />
        </TabsContent>

        <TabsContent value="quickbooks-sync" className="space-y-6">
          <QuickBooksSyncReport />
        </TabsContent>

        <TabsContent value="password-vault">
          <PasswordVaultPage />
        </TabsContent>

        <TabsContent value="reminders">
          <ReminderSettingsPage />
        </TabsContent>

        <TabsContent value="audit-log">
          <AuditDashboardPage />
        </TabsContent>
      </Tabs>

      <DrillDownDialog
        open={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        type={drillDownType}
        data={drillDownData}
        projects={projects}
        invoices={invoices}
        timeEntries={timeEntries}
        clients={clients}
      />
    </div>
  );
}