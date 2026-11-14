import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Send, CheckCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function BulkInvoiceActions({ selectedInvoices, onComplete }) {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleBulkDownload = async () => {
    if (selectedInvoices.length === 0) {
      toast.error('No invoices selected');
      return;
    }

    setDownloading(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const invoice of selectedInvoices) {
        try {
          const response = await base44.functions.invoke('generateInvoicePDF', { 
            invoiceId: invoice.id 
          });
          
          const blob = new Blob([response.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Invoice-${invoice.invoice_number}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          
          successCount++;
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to download invoice ${invoice.invoice_number}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} invoice(s) downloaded`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} invoice(s) failed to download`);
      }

      onComplete?.();
    } catch (error) {
      console.error('Bulk download error:', error);
      toast.error('Failed to download invoices');
    } finally {
      setDownloading(false);
    }
  };

  const handleBulkSend = async () => {
    if (selectedInvoices.length === 0) {
      toast.error('No invoices selected');
      return;
    }

    setSending(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const invoice of selectedInvoices) {
        try {
          const response = await base44.functions.invoke('sendInvoiceEmail', {
            invoice_id: invoice.id
          });
          
          if (response.data.success) {
            successCount++;
          } else {
            errorCount++;
          }
          
          // Small delay between emails
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to send invoice ${invoice.invoice_number}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} invoice(s) sent`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} invoice(s) failed to send`);
      }

      onComplete?.();
    } catch (error) {
      console.error('Bulk send error:', error);
      toast.error('Failed to send invoices');
    } finally {
      setSending(false);
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedInvoices.length === 0) {
      toast.error('No invoices selected');
      return;
    }

    setUpdatingStatus(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const invoice of selectedInvoices) {
        try {
          await base44.entities.Invoice.update(invoice.id, { status: newStatus });
          successCount++;
        } catch (error) {
          console.error(`Failed to update invoice ${invoice.invoice_number}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} invoice(s) updated to ${newStatus}`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} invoice(s) failed to update`);
      }

      onComplete?.();
    } catch (error) {
      console.error('Bulk status change error:', error);
      toast.error('Failed to update invoices');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <span className="text-sm font-medium text-blue-900">
        {selectedInvoices.length} invoice(s) selected:
      </span>
      
      <Button
        size="sm"
        variant="outline"
        onClick={handleBulkDownload}
        disabled={downloading}
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        Download All
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={handleBulkSend}
        disabled={sending}
      >
        {sending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Send className="w-4 h-4 mr-2" />
        )}
        Send All
      </Button>

      <Select
        disabled={updatingStatus}
        onValueChange={handleBulkStatusChange}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Change Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="draft">Mark as Draft</SelectItem>
          <SelectItem value="sent">Mark as Sent</SelectItem>
          <SelectItem value="paid">Mark as Paid</SelectItem>
          <SelectItem value="overdue">Mark as Overdue</SelectItem>
          <SelectItem value="cancelled">Mark as Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}