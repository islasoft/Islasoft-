import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import ExportReportButton from './ExportReportButton';

export default function ProjectProfitabilityReport({ projects, timeEntries, invoices, filters }) {
  const profitability = useMemo(() => {
    let filteredProjects = [...projects];

    // Apply filters
    if (filters.clientId) {
      filteredProjects = filteredProjects.filter(p => p.client_id === filters.clientId);
    }
    if (filters.projectId) {
      filteredProjects = filteredProjects.filter(p => p.id === filters.projectId);
    }

    return filteredProjects.map(project => {
      // Get time entries for this project
      const projectEntries = timeEntries.filter(e => e.project_id === project.id);
      
      // Calculate actual hours
      const actualHours = projectEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
      
      // Get invoices for this project
      const projectInvoices = invoices.filter(inv => inv.project_id === project.id);
      const totalRevenue = projectInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      
      // Calculate budget variance
      const budgetVariance = project.budget_hours ? actualHours - project.budget_hours : 0;
      const budgetUtilization = project.budget_hours ? (actualHours / project.budget_hours) * 100 : 0;
      
      return {
        projectName: `${project.client_name} - ${project.project_type?.replace(/_/g, ' ')}`,
        clientName: project.client_name,
        budgetHours: project.budget_hours || 0,
        actualHours,
        budgetVariance,
        budgetUtilization,
        totalRevenue,
        revenuePerHour: actualHours > 0 ? totalRevenue / actualHours : 0,
        status: project.status,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [projects, timeEntries, invoices, filters]);

  const exportCSV = () => {
    const headers = ['Project', 'Client', 'Budget Hours', 'Actual Hours', 'Variance', 'Utilization %', 'Revenue', 'Revenue/Hour'];
    const rows = profitability.map(item => [
      item.projectName,
      item.clientName,
      item.budgetHours.toFixed(2),
      item.actualHours.toFixed(2),
      item.budgetVariance.toFixed(2),
      item.budgetUtilization.toFixed(1),
      item.totalRevenue.toFixed(2),
      item.revenuePerHour.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_profitability_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text('Project Profitability Report', 20, 20);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    let y = 35;
    doc.text('Project', 20, y);
    doc.text('Budget', 100, y);
    doc.text('Actual', 130, y);
    doc.text('Variance', 160, y);
    doc.text('Revenue', 190, y);
    doc.text('$/Hour', 230, y);
    y += 7;

    doc.setFont(undefined, 'normal');
    profitability.forEach(item => {
      if (y > 180) {
        doc.addPage();
        y = 20;
      }
      const name = doc.splitTextToSize(item.projectName, 75);
      doc.text(name[0], 20, y);
      doc.text(item.budgetHours.toFixed(1), 100, y);
      doc.text(item.actualHours.toFixed(1), 130, y);
      doc.text(item.budgetVariance.toFixed(1), 160, y);
      doc.text(`$${item.totalRevenue.toFixed(0)}`, 190, y);
      doc.text(`$${item.revenuePerHour.toFixed(0)}`, 230, y);
      y += 7;
    });

    doc.save(`project_profitability_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exported');
  };

  const totalRevenue = profitability.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalBudgetHours = profitability.reduce((sum, item) => sum + item.budgetHours, 0);
  const totalActualHours = profitability.reduce((sum, item) => sum + item.actualHours, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Profitability Analysis</CardTitle>
          <div className="flex gap-2">
            <ExportReportButton 
              reportData={profitability} 
              reportTitle="Project Profitability Analysis" 
              reportType="profitability"
            />
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button size="sm" variant="outline" onClick={exportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Budget Hours</p>
            <p className="text-2xl font-bold text-blue-600">{totalBudgetHours.toFixed(1)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Actual Hours</p>
            <p className="text-2xl font-bold text-purple-600">{totalActualHours.toFixed(1)}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Project</th>
                <th className="text-right py-3 px-2">Budget</th>
                <th className="text-right py-3 px-2">Actual</th>
                <th className="text-right py-3 px-2">Variance</th>
                <th className="text-right py-3 px-2">Utilization</th>
                <th className="text-right py-3 px-2">Revenue</th>
                <th className="text-right py-3 px-2">$/Hour</th>
              </tr>
            </thead>
            <tbody>
              {profitability.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <div className="font-medium">{item.projectName}</div>
                    <div className="text-xs text-gray-500">{item.clientName}</div>
                  </td>
                  <td className="text-right py-3 px-2 font-mono">{item.budgetHours.toFixed(1)}h</td>
                  <td className="text-right py-3 px-2 font-mono">{item.actualHours.toFixed(1)}h</td>
                  <td className="text-right py-3 px-2">
                    <span className={`inline-flex items-center gap-1 ${item.budgetVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.budgetVariance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(item.budgetVariance).toFixed(1)}h
                    </span>
                  </td>
                  <td className="text-right py-3 px-2">
                    <span className={`font-medium ${item.budgetUtilization > 100 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.budgetUtilization.toFixed(0)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-2 font-mono">${item.totalRevenue.toFixed(2)}</td>
                  <td className="text-right py-3 px-2 font-mono">${item.revenuePerHour.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}