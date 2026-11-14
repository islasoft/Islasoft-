import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Clock, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ProjectProgressDashboard({ projects }) {
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date'),
  });

  // Calculate stats
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const inProgressProjects = projects.filter(p => p.status === 'in_progress').length;
  const overdueProjects = projects.filter(p => {
    if (p.status === 'completed') return false;
    if (!p.due_date) return false;
    return new Date(p.due_date) < new Date();
  }).length;

  // Budget calculations
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
  const totalActualCost = projects.reduce((sum, p) => sum + (p.actual_cost || 0), 0);
  const budgetUtilization = totalBudget > 0 ? (totalActualCost / totalBudget) * 100 : 0;

  // Time tracking
  const totalBudgetHours = projects.reduce((sum, p) => sum + (p.budget_hours || 0), 0);
  const totalActualHours = timeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const hoursUtilization = totalBudgetHours > 0 ? (totalActualHours / totalBudgetHours) * 100 : 0;

  // Projects by status
  const statusBreakdown = {
    not_started: projects.filter(p => p.status === 'not_started').length,
    in_progress: projects.filter(p => p.status === 'in_progress').length,
    waiting: projects.filter(p => p.status === 'waiting').length,
    on_hold: projects.filter(p => p.status === 'on_hold').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  // Priority breakdown
  const priorityBreakdown = {
    urgent: projects.filter(p => p.priority === 'urgent' && p.status !== 'completed').length,
    high: projects.filter(p => p.priority === 'high' && p.status !== 'completed').length,
    medium: projects.filter(p => p.priority === 'medium' && p.status !== 'completed').length,
    low: projects.filter(p => p.priority === 'low' && p.status !== 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-3xl font-bold">{totalProjects}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-green-600">{inProgressProjects}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-blue-600">{completedProjects}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{overdueProjects}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget & Time Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Budget Utilization</span>
                <span className="text-sm font-medium">{budgetUtilization.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(budgetUtilization, 100)} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-gray-500">Total Budget</p>
                <p className="text-lg font-semibold">${totalBudget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Actual Cost</p>
                <p className="text-lg font-semibold">${totalActualCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Time Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Hours Utilization</span>
                <span className="text-sm font-medium">{hoursUtilization.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(hoursUtilization, 100)} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-gray-500">Budgeted Hours</p>
                <p className="text-lg font-semibold">{totalBudgetHours.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Actual Hours</p>
                <p className="text-lg font-semibold">{totalActualHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status & Priority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <span className="text-lg font-semibold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Priority Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-red-600">Urgent</Badge>
              <span className="text-lg font-semibold">{priorityBreakdown.urgent}</span>
            </div>
            <div className="flex items-center justify-between">
              <Badge className="bg-orange-600">High</Badge>
              <span className="text-lg font-semibold">{priorityBreakdown.high}</span>
            </div>
            <div className="flex items-center justify-between">
              <Badge className="bg-yellow-600">Medium</Badge>
              <span className="text-lg font-semibold">{priorityBreakdown.medium}</span>
            </div>
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-600">Low</Badge>
              <span className="text-lg font-semibold">{priorityBreakdown.low}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}