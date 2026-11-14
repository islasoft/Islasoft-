import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { formatDate } from '@/lib/utils';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import ExportReportButton from './ExportReportButton';

export default function TimeEntrySummaryReport({ timeEntries, filters, groupBy = 'project' }) {
  const summary = useMemo(() => {
    let filtered = [...timeEntries];

    // Apply filters
    if (filters.startDate) {
      filtered = filtered.filter(e => e.date >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(e => e.date <= filters.endDate);
    }
    if (filters.clientId) {
      filtered = filtered.filter(e => e.client_id === filters.clientId);
    }
    if (filters.projectId) {
      filtered = filtered.filter(e => e.project_id === filters.projectId);
    }
    if (filters.userId) {
      filtered = filtered.filter(e => e.staff_id === filters.userId);
    }

    // Group by selected criteria
    const grouped = {};
    filtered.forEach(entry => {
      let key;
      if (groupBy === 'project') {
        key = entry.project_name || 'Unknown Project';
      } else if (groupBy === 'client') {
        key = entry.client_name || 'Unknown Client';
      } else if (groupBy === 'user') {
        key = entry.staff_name || 'Unknown User';
      }

      if (!grouped[key]) {
        grouped[key] = {
          name: key,
          totalHours: 0,
          billableHours: 0,
          entries: 0,
          invoiced: 0,
        };
      }

      grouped[key].totalHours += entry.hours || 0;
      grouped[key].billableHours += entry.billable ? (entry.hours || 0) : 0;
      grouped[key].entries += 1;
      grouped[key].invoiced += entry.invoiced ? 1 : 0;
    });

    return Object.values(grouped).sort((a, b) => b.totalHours - a.totalHours);
  }, [timeEntries, filters, groupBy]);

  const exportCSV = () => {
    const headers = ['Name', 'Total Hours', 'Billable Hours', 'Entries', 'Invoiced'];
    const rows = summary.map(item => [
      item.name,
      item.totalHours.toFixed(2),
      item.billableHours.toFixed(2),
      item.entries,
      item.invoiced
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time_summary_${groupBy}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Time Entry Summary by ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`, 20, 20);
    
    doc.setFontSize(10);
    let y = 35;
    
    if (filters.startDate || filters.endDate) {
      doc.text(`Period: ${filters.startDate ? formatDate(filters.startDate) : 'All'} - ${filters.endDate ? formatDate(filters.endDate) : 'All'}`, 20, y);
      y += 10;
    }

    // Table headers
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Name', 20, y);
    doc.text('Total Hours', 100, y);
    doc.text('Billable', 140, y);
    doc.text('Entries', 170, y);
    y += 7;

    // Table rows
    doc.setFont(undefined, 'normal');
    summary.forEach(item => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const name = doc.splitTextToSize(item.name, 75);
      doc.text(name[0], 20, y);
      doc.text(item.totalHours.toFixed(2), 100, y);
      doc.text(item.billableHours.toFixed(2), 140, y);
      doc.text(item.entries.toString(), 170, y);
      y += 7;
    });

    doc.save(`time_summary_${groupBy}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exported');
  };

  const totalHours = summary.reduce((sum, item) => sum + item.totalHours, 0);
  const totalBillable = summary.reduce((sum, item) => sum + item.billableHours, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Time Entry Summary by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</CardTitle>
          <div className="flex gap-2">
            <ExportReportButton 
              reportData={summary} 
              reportTitle="Time Entry Summary" 
              reportType="time-summary"
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
            <p className="text-sm text-gray-600">Total Hours</p>
            <p className="text-2xl font-bold text-blue-600">{totalHours.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Billable Hours</p>
            <p className="text-2xl font-bold text-green-600">{totalBillable.toFixed(2)}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Name</th>
                <th className="text-right py-3 px-2">Total Hours</th>
                <th className="text-right py-3 px-2">Billable</th>
                <th className="text-right py-3 px-2">Entries</th>
                <th className="text-right py-3 px-2">Invoiced</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2">{item.name}</td>
                  <td className="text-right py-3 px-2 font-mono">{item.totalHours.toFixed(2)}</td>
                  <td className="text-right py-3 px-2 font-mono">{item.billableHours.toFixed(2)}</td>
                  <td className="text-right py-3 px-2">{item.entries}</td>
                  <td className="text-right py-3 px-2">{item.invoiced}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}