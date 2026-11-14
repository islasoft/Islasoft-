import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return Response.json({ error: 'Invoice ID required' }, { status: 400 });
    }

    // Fetch invoice and company settings
    const invoices = await base44.entities.Invoice.filter({ id: invoiceId });
    const invoice = invoices[0];

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const companySettingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const companySettings = companySettingsList[0] || {};

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let y = 20;

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth / 2, y, { align: 'center' });
    
    y += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(companySettings.company_name || 'Isla Accompting Corp', pageWidth / 2, y, { align: 'center' });
    y += 5;
    const addressLine = companySettings.address && companySettings.city && companySettings.state && companySettings.zip_code
      ? `${companySettings.address}, ${companySettings.city}, ${companySettings.state} ${companySettings.zip_code}`
      : '2325 Wiley St, Hollywood, FL 33020';
    doc.text(addressLine, pageWidth / 2, y, { align: 'center' });
    y += 5;
    const contactLine = `Phone: ${companySettings.phone || '(305) 290-1145'} | Email: ${companySettings.email || 'info@islaccounting.com'}`;
    doc.text(contactLine, pageWidth / 2, y, { align: 'center' });
    
    y += 15;
    doc.setDrawColor(70, 130, 180);
    doc.line(15, y, pageWidth - 15, y);
    
    y += 10;
    
    // Invoice details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice #: ${invoice.invoice_number}`, 15, y);
    doc.text(`Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, pageWidth - 15, y, { align: 'right' });
    
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, pageWidth - 15, y, { align: 'right' });
    
    y += 10;
    
    // Client info
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.client_name, 15, y);
    if (invoice.client_email) {
      y += 5;
      doc.text(invoice.client_email, 15, y);
    }
    
    y += 15;
    
    // Line items table
    doc.setFont('helvetica', 'bold');
    doc.text('Time Entries', 15, y);
    y += 7;
    
    // Table headers
    doc.setFillColor(70, 130, 180);
    doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Project', 17, y);
    doc.text('Date', 90, y);
    doc.text('Hours', 130, y);
    doc.text('Amount', pageWidth - 17, y, { align: 'right' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 8;
    
    // Line items
    if (invoice.line_items && invoice.line_items.length > 0) {
      invoice.line_items.forEach((item, index) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(15, y - 5, pageWidth - 30, 7, 'F');
        }
        
        doc.text(item.project_name || 'N/A', 17, y);
        doc.text(item.date ? new Date(item.date).toLocaleDateString() : '', 90, y);
        doc.text(item.hours?.toString() || '0', 130, y);
        doc.text(`$${item.amount?.toFixed(2) || '0.00'}`, pageWidth - 17, y, { align: 'right' });
        y += 7;
      });
    }
    
    y += 5;
    
    // Expense items
    if (invoice.expense_items && invoice.expense_items.length > 0) {
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Expenses', 15, y);
      y += 7;
      
      // Expense headers
      doc.setFillColor(70, 130, 180);
      doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Description', 17, y);
      doc.text('Category', 90, y);
      doc.text('Date', 130, y);
      doc.text('Amount', pageWidth - 17, y, { align: 'right' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      y += 8;
      
      invoice.expense_items.forEach((item, index) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(15, y - 5, pageWidth - 30, 7, 'F');
        }
        
        doc.text(item.description || 'N/A', 17, y);
        doc.text(item.category || '', 90, y);
        doc.text(item.date ? new Date(item.date).toLocaleDateString() : '', 130, y);
        doc.text(`$${item.amount?.toFixed(2) || '0.00'}`, pageWidth - 17, y, { align: 'right' });
        y += 7;
      });
    }
    
    // Totals section
    y += 10;
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    
    const totalsX = pageWidth - 70;
    doc.setFont('helvetica', 'normal');
    
    if (invoice.total_hours) {
      doc.text('Total Hours:', totalsX, y);
      doc.text(invoice.total_hours.toString(), pageWidth - 17, y, { align: 'right' });
      y += 6;
    }
    
    doc.text('Subtotal:', totalsX, y);
    doc.text(`$${invoice.subtotal?.toFixed(2) || '0.00'}`, pageWidth - 17, y, { align: 'right' });
    y += 6;
    
    if (invoice.merchant_fee > 0) {
      doc.text('Merchant Fee (3%):', totalsX, y);
      doc.text(`$${invoice.merchant_fee?.toFixed(2) || '0.00'}`, pageWidth - 17, y, { align: 'right' });
      y += 6;
    }
    
    if (invoice.tax_amount > 0) {
      doc.text(`Tax (${invoice.tax_rate}%)`, totalsX, y);
      doc.text(`$${invoice.tax_amount?.toFixed(2) || '0.00'}`, pageWidth - 17, y, { align: 'right' });
      y += 6;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total:', totalsX, y);
    doc.text(`$${invoice.total?.toFixed(2) || '0.00'}`, pageWidth - 17, y, { align: 'right' });

    // Payment Information Section with QR Code
    y += 15;
    if (y > 180) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 130, 180);
    doc.text('Payment Options', 15, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    try {
      const qrImageUrl = companySettings.qr_code_image_url || Deno.env.get('QR_CODE_IMAGE_URL');
      if (!qrImageUrl) {
        throw new Error('QR code image URL not configured');
      }
      const qrResponse = await fetch(qrImageUrl);

      if (!qrResponse.ok) {
        throw new Error('Failed to fetch QR code image');
      }

      const qrArrayBuffer = await qrResponse.arrayBuffer();
      const uint8Array = new Uint8Array(qrArrayBuffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const qrBase64 = btoa(binaryString);

      // Larger QR code positioned prominently
      const qrSize = 60;
      const qrX = 15;
      doc.addImage(`data:image/png;base64,${qrBase64}`, 'PNG', qrX, y, qrSize, qrSize);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Scan to Pay', qrX + qrSize/2, y + qrSize + 6, { align: 'center' });

      // Payment link - more visible
      if (invoice.cpacharge_payment_url) {
        const linkY = y + 15;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('or pay online:', qrX + qrSize + 10, linkY);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 102, 204);
        doc.setFont('helvetica', 'underline');
        doc.textWithLink('Click here to pay via CPA Charge', qrX + qrSize + 10, linkY + 7, { 
          url: invoice.cpacharge_payment_url
        });
        
        // Payment instructions
        y = linkY + 20;
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const paymentText = [
          'Payment accepted by Check or Zelle: info@islaccounting.com',
          'Please include Invoice # as reference (Memo) for your payment',
          'Credit card or PayPal: 3% processing fee applies'
        ];
        paymentText.forEach((line, idx) => {
          doc.text(line, qrX + qrSize + 10, y + (idx * 5));
        });
      }
    } catch (error) {
      console.error('Error adding QR code:', error);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Payment QR code unavailable', 15, y);
      
      if (invoice.cpacharge_payment_url) {
        y += 10;
        doc.setFontSize(11);
        doc.setTextColor(0, 102, 204);
        doc.textWithLink('Click here to pay online via CPA Charge', 15, y, { 
          url: invoice.cpacharge_payment_url
        });
      }
    }

    doc.setTextColor(0, 0, 0);

    // Notes
    if (invoice.notes) {
      y += 15;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 15, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 30);
      doc.text(splitNotes, 15, y);
    }
    
    // Footer
    const footerY = doc.internal.pageSize.height - 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
    
    // Generate PDF
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});