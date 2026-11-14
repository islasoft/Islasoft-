import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, DollarSign, Bell, Download, Send, AlertTriangle } from 'lucide-react';
import QuickBooksSyncButton from './QuickBooksSyncButton';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import InvoiceActions from './InvoiceActions';
import InvoiceReminderDialog from './InvoiceReminderDialog';
import BulkInvoiceActions from './BulkInvoiceActions';
import { logAudit } from '../security/AuditLogger';

// Build a set of duplicate invoice IDs (same invoice_number + client_id, keep newest)
function getDuplicateIds(invoices) {
  const groups = {};
  invoices.forEach(inv => {
    const key = `${inv.invoice_number}::${inv.client_id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(inv);
  });
  const duplicateIds = new Set();
  Object.values(groups).forEach(group => {
    if (group.length > 1) group.forEach(inv => duplicateIds.add(inv.id));
  });
  return duplicateIds;
}

// For a group of duplicates with the same key, returns IDs to delete (all but newest)
function getIdsToDelete(invoices, invoiceNumber, clientId) {
  const group = invoices
    .filter(inv => inv.invoice_number === invoiceNumber && inv.client_id === clientId)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  return group.slice(1).map(inv => inv.id); // keep index 0 (newest), delete the rest
}

export default function InvoiceList({ invoices, isLoading, onStatusChange, clients }) {
  const [selectedInvoiceForReminder, setSelectedInvoiceForReminder] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const queryClient = useQueryClient();

  const deleteDuplicateMutation = useMutation({
    mutationFn: async ({ invoiceNumber, clientId }) => {
      const ids = getIdsToDelete(invoices, invoiceNumber, clientId);
      for (const id of ids) {
        await base44.entities.Invoice.delete(id);
      }
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Removed ${count} duplicate invoice(s)`);
    },
    onError: () => toast.error('Failed to delete duplicates'),
  });



  const handleDownloadPDF = async (invoice) => {
    try {
      setDownloadingInvoice(invoice.id);
      const response = await base44.functions.invoke('generateInvoicePDF', { invoiceId: invoice.id });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const toggleAllInvoices = () => {
    if (selectedInvoiceIds.length === invoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(invoices.map(inv => inv.id));
    }
  };

  const handleBulkComplete = () => {
    setSelectedInvoiceIds([]);
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-500">Loading invoices...</p>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No invoices yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first invoice to get started</p>
        </CardContent>
      </Card>
    );
  }

  const duplicateIds = getDuplicateIds(invoices);
  const selectedInvoices = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));

  return (
    <>
      {selectedInvoiceForReminder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full">
            <InvoiceReminderDialog
              invoice={selectedInvoiceForReminder}
              onClose={() => setSelectedInvoiceForReminder(null)}
            />
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Invoices</CardTitle>
          {invoices.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedInvoiceIds.length === invoices.length}
                onCheckedChange={toggleAllInvoices}
              />
              <span className="text-sm text-gray-600">Select All</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {selectedInvoiceIds.length > 0 && (
            <BulkInvoiceActions
              selectedInvoices={selectedInvoices}
              onComplete={handleBulkComplete}
            />
          )}
          
          <div className="space-y-3 mt-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={selectedInvoiceIds.includes(invoice.id)}
                    onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-medium text-gray-900">{invoice.invoice_number}</h3>
                    <Badge className={statusColors[invoice.status]}>
                      {invoice.status}
                    </Badge>
                    {duplicateIds.has(invoice.id) && (
                      <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        DUPLICATE
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    {invoice.client_name} - {invoice.project_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Issued: {formatDate(invoice.issue_date)}
                    </span>
                    {invoice.due_date && (
                      <span className="flex items-center gap-1">
                        Due: {formatDate(invoice.due_date)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                     <DollarSign className="w-3 h-3" />
                     {invoice.total_hours} hours
                    </span>
                    {invoice.reminder_count > 0 && (
                     <span className="flex items-center gap-1 text-orange-600">
                       <Bell className="w-3 h-3" />
                       {invoice.reminder_count} reminder{invoice.reminder_count > 1 ? 's' : ''} sent
                     </span>
                    )}
                    </div>
                    </div>
                    </div>
                    <div className="md:text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    ${invoice.total?.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    ${invoice.hourly_rate}/hr
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 pt-4 border-t">
                <InvoiceActions invoice={invoice} clients={clients} />
                {duplicateIds.has(invoice.id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-yellow-700 border-yellow-400 hover:bg-yellow-50"
                    disabled={deleteDuplicateMutation.isPending}
                    onClick={() => deleteDuplicateMutation.mutate({ invoiceNumber: invoice.invoice_number, clientId: invoice.client_id })}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Delete Duplicate
                  </Button>
                )}
                {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedInvoiceForReminder(invoice)}
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Send Reminder
                  </Button>
                )}
                <Select
                  value={invoice.status}
                  onValueChange={(value) => onStatusChange(invoice.id, value)}
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
    </>
  );
}