import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all recurring invoices that need generation
    const recurringInvoices = await base44.asServiceRole.entities.Invoice.filter({
      is_recurring: true,
      status: 'paid' // Only generate from paid recurring invoices
    });

    const results = {
      checked: 0,
      generated: 0,
      errors: []
    };

    for (const invoice of recurringInvoices) {
      results.checked++;

      try {
        const nextDate = invoice.next_invoice_date ? new Date(invoice.next_invoice_date) : null;
        
        if (!nextDate) continue;
        
        nextDate.setHours(0, 0, 0, 0);

        // Check if end date has passed
        if (invoice.recurrence_end_date) {
          const endDate = new Date(invoice.recurrence_end_date);
          endDate.setHours(0, 0, 0, 0);
          if (today > endDate) {
            // Stop recurring
            await base44.asServiceRole.entities.Invoice.update(invoice.id, {
              is_recurring: false
            });
            continue;
          }
        }

        // Check if it's time to generate
        if (nextDate <= today) {
          // Calculate next invoice date based on frequency
          let newNextDate = new Date(nextDate);
          switch (invoice.recurrence_frequency) {
            case 'weekly':
              newNextDate.setDate(newNextDate.getDate() + 7);
              break;
            case 'biweekly':
              newNextDate.setDate(newNextDate.getDate() + 14);
              break;
            case 'monthly':
              newNextDate.setMonth(newNextDate.getMonth() + 1);
              break;
            case 'quarterly':
              newNextDate.setMonth(newNextDate.getMonth() + 3);
              break;
            case 'annually':
              newNextDate.setFullYear(newNextDate.getFullYear() + 1);
              break;
          }

          // Generate new invoice number
          const year = today.getFullYear();
          const yearPrefix = String(year).slice(-2);
          
          const allInvoices = await base44.asServiceRole.entities.Invoice.list();
          const yearInvoices = allInvoices.filter(inv => 
            inv.invoice_number?.startsWith(`${yearPrefix}-`)
          );
          
          let maxNumber = 0;
          yearInvoices.forEach(inv => {
            const match = inv.invoice_number.match(/^\d{2}-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) maxNumber = num;
            }
          });
          
          const nextNumber = String(maxNumber + 1).padStart(3, '0');
          const newInvoiceNumber = `${yearPrefix}-${nextNumber}`;

          // Calculate new due date (30 days from issue)
          const newDueDate = new Date(today);
          newDueDate.setDate(newDueDate.getDate() + 30);

          // Create new invoice
          const newInvoice = {
            invoice_number: newInvoiceNumber,
            client_id: invoice.client_id,
            client_name: invoice.client_name,
            client_email: invoice.client_email,
            project_id: invoice.project_id,
            project_name: invoice.project_name,
            issue_date: today.toISOString().split('T')[0],
            due_date: newDueDate.toISOString().split('T')[0],
            line_items: invoice.line_items,
            expense_items: invoice.expense_items,
            time_entry_ids: [],
            total_hours: invoice.total_hours,
            hourly_rate: invoice.hourly_rate,
            subtotal: invoice.subtotal,
            merchant_fee: invoice.merchant_fee,
            tax_rate: invoice.tax_rate,
            tax_amount: invoice.tax_amount,
            total: invoice.total,
            status: 'draft',
            notes: invoice.notes,
            parent_invoice_id: invoice.id,
            is_recurring: false
          };

          await base44.asServiceRole.entities.Invoice.create(newInvoice);

          // Update parent invoice with next date
          await base44.asServiceRole.entities.Invoice.update(invoice.id, {
            next_invoice_date: newNextDate.toISOString().split('T')[0]
          });

          results.generated++;
        }
      } catch (error) {
        results.errors.push({
          invoice_id: invoice.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('Generate recurring invoices error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});