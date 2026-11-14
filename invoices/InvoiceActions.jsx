import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ExternalLink, Trash2, CreditCard } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const CPA_CHARGE_BASE_URL = 'https://secure.cpacharge.com/pages/islaaccomptingcorp';

export default function InvoiceActions({ invoice, clients }) {
  const [downloading, setDownloading] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Unmark time entries as invoiced
      if (invoice.time_entry_ids && invoice.time_entry_ids.length > 0) {
        for (const entryId of invoice.time_entry_ids) {
          await base44.entities.TimeEntry.update(entryId, {
            invoiced: false,
            invoice_id: null,
          });
        }
      }
      // Delete the invoice
      await base44.entities.Invoice.delete(invoice.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['allTimeEntries'] });
      toast.success('Draft invoice deleted');
    },
    onError: () => {
      toast.error('Failed to delete invoice');
    },
  });

  const generatePDF = async () => {
    const doc = new jsPDF();
    const client = clients.find(c => c.id === invoice.client_id);
    
    // Load and add logo (circular, like in the sample)
    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69602ce76ba05524a04d858f/0e8cd520f_PHOTO-2025-08-22-11-43-22.jpg';
    
    try {
      const img = await fetch(logoUrl);
      const blob = await img.blob();
      const reader = new FileReader();
      
      await new Promise((resolve) => {
        reader.onloadend = () => {
          const imgData = reader.result;
          doc.addImage(imgData, 'JPEG', 20, 15, 50, 50);
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading logo:', error);
    }
    
    // Company info on right side (matching the sample format)
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('From', 135, 20);
    
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Isla Accompting Corp', 135, 27);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('401 East Las Olas Blvd, Ste 1414', 135, 33);
    doc.text('Ft. Lauderdale, FL 33301', 135, 38);
    
    // Invoice for section
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text('Invoice for', 20, 75);
    
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(invoice.client_name, 20, 82);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    if (client?.address) {
      const addressLines = doc.splitTextToSize(client.address, 85);
      let addrY = 88;
      addressLines.forEach(line => {
        doc.text(line, 20, addrY);
        addrY += 5;
      });
    }
    
    // Invoice details on right
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text('Invoice ID', 135, 75);
    doc.setTextColor(40, 40, 40);
    doc.text(invoice.invoice_number, 165, 75);
    
    doc.setTextColor(80, 80, 80);
    doc.text('Issue date', 135, 82);
    doc.setTextColor(40, 40, 40);
    doc.text(format(new Date(invoice.issue_date), 'MM/dd/yyyy'), 165, 82);
    
    doc.setTextColor(80, 80, 80);
    doc.text('Due date', 135, 89);
    doc.setTextColor(40, 40, 40);
    if (invoice.due_date) {
      doc.text(format(new Date(invoice.due_date), 'MM/dd/yyyy'), 165, 89);
    }
    
    // Subject line
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text('Subject', 20, 110);
    doc.setTextColor(40, 40, 40);
    if (invoice.notes) {
      const subjectLines = doc.splitTextToSize(invoice.notes, 170);
      doc.text(subjectLines[0], 20, 117);
    }
    
    // Table Header
    const tableTop = 135;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, tableTop, 190, tableTop);
    
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Item type', 20, tableTop + 6);
    doc.text('Description', 45, tableTop + 6);
    doc.text('Quantity', 130, tableTop + 6);
    doc.text('Unit price', 155, tableTop + 6);
    doc.text('Amount', 180, tableTop + 6);
    
    doc.line(20, tableTop + 9, 190, tableTop + 9);
    
    // Line Items
    doc.setFont(undefined, 'normal');
    let yPos = tableTop + 16;
    
    const lineItems = invoice.line_items || [{
      project_name: invoice.project_name,
      date: invoice.issue_date,
      hours: invoice.total_hours,
      amount: invoice.subtotal
    }];
    
    lineItems.forEach((item, index) => {
      doc.setTextColor(40, 40, 40);
      doc.text('Service', 20, yPos);
      
      const descLines = doc.splitTextToSize(item.project_name, 80);
      doc.text(descLines, 45, yPos);
      
      doc.text(item.hours?.toFixed(2) || '0.00', 130, yPos);
      const unitPrice = item.hours > 0 ? (item.amount / item.hours) : 0;
      doc.text(`$${unitPrice.toFixed(2)}`, 155, yPos);
      doc.text(`$${item.amount?.toFixed(2) || '0.00'}`, 180, yPos);
      
      // Add more spacing between items
      const lineHeight = descLines.length > 1 ? (descLines.length * 5 + 5) : 12;
      yPos += lineHeight;
    });
    
    // Totals section (right-aligned)
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
    
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text('Subtotal', 155, yPos, { align: 'right' });
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'bold');
    doc.text(`$${invoice.subtotal?.toFixed(2) || '0.00'}`, 190, yPos, { align: 'right' });
    yPos += 7;
    
    doc.setTextColor(80, 80, 80);
    doc.setFont(undefined, 'normal');
    doc.text('Merchant Fee (3%)', 155, yPos, { align: 'right' });
    doc.setTextColor(40, 40, 40);
    doc.text(`$${invoice.merchant_fee?.toFixed(2) || '0.00'}`, 190, yPos, { align: 'right' });
    yPos += 7;
    
    if (invoice.tax_rate > 0) {
      doc.setTextColor(80, 80, 80);
      doc.text(`Tax (${invoice.tax_rate}%)`, 155, yPos, { align: 'right' });
      doc.setTextColor(40, 40, 40);
      doc.text(`$${invoice.tax_amount?.toFixed(2) || '0.00'}`, 190, yPos, { align: 'right' });
      yPos += 7;
    }
    
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Amount due', 155, yPos, { align: 'right' });
    doc.text(`$${invoice.total?.toFixed(2) || '0.00'}`, 190, yPos, { align: 'right' });
    
    // Notes section
    yPos += 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
    
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Notes', 20, yPos);
    yPos += 7;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('Thank you for your business.', 20, yPos);
    yPos += 7;

    doc.text('Our services are billed at our standard rates: CPA $200/hr, Senior Staff $150/hr, and Staff $125/hr.', 20, yPos);
    yPos += 5;
    doc.text('Invoices are due upon presentation.', 20, yPos);
    yPos += 7;

    doc.text('Payment is accepted by Check or Zelle using our e-mail address: info@islaccounting.com', 20, yPos);
    yPos += 5;
    doc.text(`Please include Invoice # ${invoice.invoice_number} as a reference (Memo) for your payment.`, 20, yPos);
    yPos += 7;
    
    doc.text('We also accept credit card payments via CPA Charge; a 3% processing fee will be added.', 20, yPos);
    
    const cpaUrl = invoice.cpacharge_payment_url || CPA_CHARGE_BASE_URL;
    yPos += 8;
    doc.setTextColor(65, 105, 225);
    doc.textWithLink('Click here to pay online via CPA Charge', 20, yPos, { url: cpaUrl });
    
    // Footer
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(8);
    doc.text('Page 1 of 1', 105, 285, { align: 'center' });
    
    return doc;
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const doc = await generatePDF();
      doc.save(`${invoice.invoice_number}.pdf`);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      toast.error('Failed to download invoice');
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };



  const handleDelete = () => {
    if (window.confirm(`Delete draft invoice ${invoice.invoice_number}? This will also unmark the time entries.`)) {
      deleteMutation.mutate();
    }
  };

  const handleCPACharge = () => {
    // Use stored payment URL if available, otherwise build the portal URL
    const url = invoice.cpacharge_payment_url || CPA_CHARGE_BASE_URL;
    window.open(url, '_blank');
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {/* CPA Charge pay button - show for sent/overdue invoices */}
      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleCPACharge}
          className="text-emerald-700 border-emerald-500 hover:bg-emerald-50"
        >
          <CreditCard className="w-4 h-4 mr-1" />
          CPA Charge
        </Button>
      )}
      {invoice.quickbooks_invoice_id && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(`https://app.qbo.intuit.com/app/invoice?txnId=${invoice.quickbooks_invoice_id}`, '_blank')}
          className="text-blue-600"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Send from QB
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </Button>
      {invoice.status === 'draft' && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="text-red-600 hover:text-red-700 hover:border-red-600"
        >
          {deleteMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
}