import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import ExportReportButton from './ExportReportButton';

export default function ClientInsightsReport({ clients, projects, invoices }) {
  const clientStats = useMemo(() => {
    return clients.map(client => {
      const clientProjects = projects.filter(p => p.client_id === client.id);
      const completedProjects = clientProjects.filter(p => p.status === 'completed');
      
      const clientInvoices = invoices.filter(inv => inv.client_id === client.id);
      const totalRevenue = clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      return {
        clientName: client.company_name,
        contactPerson: client.contact_person,
        totalProjects: clientProjects.length,
        completedProjects: completedProjects.length,
        activeProjects: clientProjects.length - completedProjects.length,
        totalRevenue,
      };
    })
    .filter(stat => stat.totalProjects > 0 || stat.totalRevenue > 0)
    .sort((a, b) => b.totalProjects - a.totalProjects);
  }, [clients, projects, invoices]);

  // Top 10 clients by volume
  const topClients = clientStats.slice(0, 10);

  const exportCSV = () => {
    const headers = ['Client', 'Contact', 'Total Projects', 'Completed', 'Active', 'Total Revenue'];
    const rows = clientStats.map(item => [
      item.clientName,
      item.contactPerson,
      item.totalProjects,
      item.completedProjects,
      item.activeProjects,
      item.totalRevenue.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client_insights_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Client Insights Report', 20, 20);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    let y = 35;
    doc.text('Client', 20, y);
    doc.text('Projects', 100, y);
    doc.text('Completed', 130, y);
    doc.text('Active', 160, y);
    doc.text('Revenue', 190, y);
    y += 7;

    doc.setFont(undefined, 'normal');
    clientStats.forEach(item => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const name = doc.splitTextToSize(item.clientName, 75);
      doc.text(name[0], 20, y);
      doc.text(item.totalProjects.toString(), 100, y);
      doc.text(item.completedProjects.toString(), 130, y);
      doc.text(item.activeProjects.toString(), 160, y);
      doc.text(`$${item.totalRevenue.toFixed(0)}`, 190, y);
      y += 7;
    });

    doc.save(`client_insights_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exported');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clients by Project Volume</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topClients} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="clientName" type="category" width={150} tick={{fontSize: 12}} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completedProjects" name="Completed" stackId="a" fill="#10B981" />
              <Bar dataKey="activeProjects" name="Active" stackId="a" fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Client Performance Details</CardTitle>
            <div className="flex gap-2">
              <ExportReportButton 
                reportData={clientStats} 
                reportTitle="Client Insights Report" 
                reportType="client_insights"
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Client</th>
                  <th className="text-left py-3 px-2">Contact</th>
                  <th className="text-right py-3 px-2">Total Projects</th>
                  <th className="text-right py-3 px-2">Completed</th>
                  <th className="text-right py-3 px-2">Active</th>
                  <th className="text-right py-3 px-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {clientStats.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{item.clientName}</td>
                    <td className="py-3 px-2 text-gray-500">{item.contactPerson}</td>
                    <td className="text-right py-3 px-2">{item.totalProjects}</td>
                    <td className="text-right py-3 px-2 text-green-600">{item.completedProjects}</td>
                    <td className="text-right py-3 px-2 text-blue-600">{item.activeProjects}</td>
                    <td className="text-right py-3 px-2 font-mono">${item.totalRevenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}