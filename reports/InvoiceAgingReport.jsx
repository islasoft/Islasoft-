import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { formatDate } from '@/lib/utils';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import ExportReportButton from './ExportReportButton';

export default function InvoiceAgingReport({ invoices, filters }) {
  const aging = useMemo(() => {
    let filtered = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled');

    // Apply filters
    if (filters.clientId) {
      filtered = filtered.filter(inv => inv.client_id === filters.clientId);
    }

    return filtered.map(invoice => {
      const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
      const today = new Date();
      const daysOverdue = dueDate ? differenceInDays(today, dueDate) : 0;
      
      let agingBucket = 'Current';
      if (daysOverdue > 90) agingBucket = '90+ Days';
      else if (daysOverdue > 60) agingBucket = '61-90 Days';
      else if (daysOverdue > 30) agingBucket = '31-60 Days';
      else if (daysOverdue > 0) agingBucket = '1-30 Days';
      
      return {
        invoiceNumber: invoice.invoice_number,
        clientName: invoice.client_name,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        daysOverdue,
        agingBucket,
        amount: invoice.total || 0,
        status: invoice.status,
      };
    }).sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [invoices, filters]);

  const agingSummary = useMemo(() => {
    const buckets = {
      'Current': 0,
      '1-30 Days': 0,
      '31-60 Days': 0,
      '61-90 Days': 0,
      '90+ Days': 0,
    };

    aging.forEach(inv => {
      buckets[inv.agingBucket] += inv.amount;
    });

    return buckets;
  }, [aging]);

  const exportCSV = () => {
    const headers = ['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Days Overdue', 'Aging Bucket', 'Amount', 'Status'];
    const rows = aging.map(item => [
      item.invoiceNumber,
      item.clientName,
      item.issueDate ? format(new Date(item.issueDate), 'yyyy-MM-dd') : '',
      item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : '',
      item.daysOverdue,
      item.agingBucket,
      item.amount.toFixed(2),
      item.status
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_aging_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text('Invoice Aging Report', 20, 20);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    let y = 35;
    doc.text('Invoice #', 20, y);
    doc.text('Client', 60, y);
    doc.text('Due Date', 120, y);
    doc.text('Days Overdue', 160, y);
    doc.text('Aging', 200, y);
    doc.text('Amount', 240, y);
    y += 7;

    doc.setFont(undefined, 'normal');
    aging.forEach(item => {
      if (y > 180) {
        doc.addPage();
        y = 20;
      }
      doc.text(item.invoiceNumber, 20, y);
      const client = doc.splitTextToSize(item.clientName, 55);
      doc.text(client[0], 60, y);
      doc.text(item.dueDate ? format(new Date(item.dueDate), 'MM/dd/yyyy') : '-', 120, y);
      doc.text(item.daysOverdue.toString(), 160, y);
      doc.text(item.agingBucket, 200, y);
      doc.text(`$${item.amount.toFixed(2)}`, 240, y);
      y += 7;
    });

    doc.save(`invoice_aging_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exported');
  };

  const totalOutstanding = aging.reduce((sum, item) => sum + item.amount, 0);
  const overdueCount = aging.filter(inv => inv.daysOverdue > 0).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Invoice Aging Report</CardTitle>
          <div className="flex gap-2">
            <ExportReportButton 
              reportData={aging} 
              reportTitle="Invoice Aging Report" 
              reportType="aging"
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
        <div className="mb-4 grid grid-cols-5 gap-2">
          {Object.entries(agingSummary).map(([bucket, amount]) => (
            <div key={bucket} className={`p-3 rounded-lg ${
              bucket === 'Current' ? 'bg-green-50' :
              bucket === '1-30 Days' ? 'bg-yellow-50' :
              bucket === '31-60 Days' ? 'bg-orange-50' : 'bg-red-50'
            }`}>
              <p className="text-xs text-gray-600">{bucket}</p>
              <p className="text-lg font-bold">${amount.toFixed(0)}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Total Outstanding:</span>
            <span className="font-bold text-lg">${totalOutstanding.toFixed(2)}</span>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">{overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Invoice #</th>
                <th className="text-left py-3 px-2">Client</th>
                <th className="text-left py-3 px-2">Due Date</th>
                <th className="text-right py-3 px-2">Days Overdue</th>
                <th className="text-left py-3 px-2">Aging Bucket</th>
                <th className="text-right py-3 px-2">Amount</th>
                <th className="text-left py-3 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {aging.map((item, idx) => (
                <tr key={idx} className={`border-b hover:bg-gray-50 ${item.daysOverdue > 60 ? 'bg-red-50' : ''}`}>
                  <td className="py-3 px-2 font-medium">{item.invoiceNumber}</td>
                  <td className="py-3 px-2">{item.clientName}</td>
                  <td className="py-3 px-2">{item.dueDate ? formatDate(item.dueDate) : '-'}</td>
                  <td className="text-right py-3 px-2">
                    <span className={`font-medium ${item.daysOverdue > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {item.daysOverdue > 0 ? item.daysOverdue : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.agingBucket === 'Current' ? 'bg-green-100 text-green-800' :
                      item.agingBucket === '1-30 Days' ? 'bg-yellow-100 text-yellow-800' :
                      item.agingBucket === '31-60 Days' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.agingBucket}
                    </span>
                  </td>
                  <td className="text-right py-3 px-2 font-mono">${item.amount.toFixed(2)}</td>
                  <td className="py-3 px-2 capitalize">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}