import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import ExportReportButton from './ExportReportButton';

export default function UserUtilizationReport({ users, timeEntries, filters }) {
  const utilization = useMemo(() => {
    let filtered = [...timeEntries];

    // Apply filters
    if (filters.startDate) {
      filtered = filtered.filter(e => e.date >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(e => e.date <= filters.endDate);
    }
    if (filters.userId) {
      filtered = filtered.filter(e => e.staff_id === filters.userId);
    }

    // Calculate working days
    const workingDays = filters.startDate && filters.endDate
      ? Math.max(1, differenceInDays(new Date(filters.endDate), new Date(filters.startDate)))
      : 30; // Default to 30 days

    const expectedHoursPerDay = 8;
    const expectedTotalHours = workingDays * expectedHoursPerDay;

    return users
      .filter(u => u.team_category !== 'admin')
      .map(user => {
        const userEntries = filtered.filter(e => e.staff_id === user.id);
        const totalHours = userEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
        const billableHours = userEntries.reduce((sum, e) => sum + (e.billable ? (e.hours || 0) : 0), 0);
        const nonBillableHours = totalHours - billableHours;

        const utilizationRate = expectedTotalHours > 0 ? (totalHours / expectedTotalHours) * 100 : 0;
        const billableRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

        return {
          userName: user.full_name,
          email: user.email,
          category: user.team_category,
          totalHours,
          billableHours,
          nonBillableHours,
          utilizationRate,
          billableRate,
          projects: new Set(userEntries.map(e => e.project_id)).size,
        };
      })
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [users, timeEntries, filters]);

  const exportCSV = () => {
    const headers = ['User', 'Email', 'Category', 'Total Hours', 'Billable', 'Non-Billable', 'Utilization %', 'Billable %', 'Projects'];
    const rows = utilization.map(item => [
      item.userName,
      item.email,
      item.category,
      item.totalHours.toFixed(2),
      item.billableHours.toFixed(2),
      item.nonBillableHours.toFixed(2),
      item.utilizationRate.toFixed(1),
      item.billableRate.toFixed(1),
      item.projects
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_utilization_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text('User Utilization Report', 20, 20);
    
    if (filters.startDate && filters.endDate) {
      doc.setFontSize(10);
      doc.text(`Period: ${format(new Date(filters.startDate), 'MMM d, yyyy')} - ${format(new Date(filters.endDate), 'MMM d, yyyy')}`, 20, 30);
    }

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    let y = 40;
    doc.text('User', 20, y);
    doc.text('Total Hrs', 100, y);
    doc.text('Billable', 140, y);
    doc.text('Utilization', 180, y);
    doc.text('Billable %', 220, y);
    doc.text('Projects', 260, y);
    y += 7;

    doc.setFont(undefined, 'normal');
    utilization.forEach(item => {
      if (y > 180) {
        doc.addPage();
        y = 20;
      }
      const name = doc.splitTextToSize(item.userName, 75);
      doc.text(name[0], 20, y);
      doc.text(item.totalHours.toFixed(1), 100, y);
      doc.text(item.billableHours.toFixed(1), 140, y);
      doc.text(`${item.utilizationRate.toFixed(0)}%`, 180, y);
      doc.text(`${item.billableRate.toFixed(0)}%`, 220, y);
      doc.text(item.projects.toString(), 260, y);
      y += 7;
    });

    doc.save(`user_utilization_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exported');
  };

  const avgUtilization = utilization.length > 0
    ? utilization.reduce((sum, item) => sum + item.utilizationRate, 0) / utilization.length
    : 0;
  const avgBillableRate = utilization.length > 0
    ? utilization.reduce((sum, item) => sum + item.billableRate, 0) / utilization.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Utilization Report</CardTitle>
          <div className="flex gap-2">
            <ExportReportButton 
              reportData={utilization} 
              reportTitle="User Utilization Report" 
              reportType="utilization"
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
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Avg Utilization Rate</p>
            <p className="text-2xl font-bold text-blue-600">{avgUtilization.toFixed(1)}%</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Avg Billable Rate</p>
            <p className="text-2xl font-bold text-green-600">{avgBillableRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">User</th>
                <th className="text-left py-3 px-2">Category</th>
                <th className="text-right py-3 px-2">Total Hours</th>
                <th className="text-right py-3 px-2">Billable</th>
                <th className="text-right py-3 px-2">Non-Billable</th>
                <th className="text-right py-3 px-2">Utilization</th>
                <th className="text-right py-3 px-2">Billable %</th>
                <th className="text-right py-3 px-2">Projects</th>
              </tr>
            </thead>
            <tbody>
              {utilization.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <div className="font-medium">{item.userName}</div>
                    <div className="text-xs text-gray-500">{item.email}</div>
                  </td>
                  <td className="py-3 px-2 capitalize">{item.category?.replace(/_/g, ' ')}</td>
                  <td className="text-right py-3 px-2 font-mono">{item.totalHours.toFixed(1)}</td>
                  <td className="text-right py-3 px-2 font-mono text-green-600">{item.billableHours.toFixed(1)}</td>
                  <td className="text-right py-3 px-2 font-mono text-gray-500">{item.nonBillableHours.toFixed(1)}</td>
                  <td className="text-right py-3 px-2">
                    <span className={`font-medium ${
                      item.utilizationRate >= 80 ? 'text-green-600' :
                      item.utilizationRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {item.utilizationRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-2">
                    <span className={`font-medium ${
                      item.billableRate >= 80 ? 'text-green-600' :
                      item.billableRate >= 60 ? 'text-yellow-600' : 'text-orange-600'
                    }`}>
                      {item.billableRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-2">{item.projects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}