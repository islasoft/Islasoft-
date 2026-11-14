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

    // Get company settings for from email
    const companySettingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const companySettings = companySettingsList[0] || {};
    const fromEmail = companySettings.from_email || companySettings.email || 'noreply@islaccounting.com';

    // Get all sent invoices
    const invoices = await base44.asServiceRole.entities.Invoice.filter({
      status: 'sent'
    });

    const results = {
      checked: 0,
      marked_overdue: 0,
      reminders_sent: 0,
      errors: []
    };

    for (const invoice of invoices) {
      results.checked++;

      try {
        const dueDate = new Date(invoice.due_date);
        dueDate.setHours(0, 0, 0, 0);

        // Check if overdue
        if (dueDate < today) {
          // Mark as overdue
          await base44.asServiceRole.entities.Invoice.update(invoice.id, {
            status: 'overdue'
          });
          results.marked_overdue++;

          // Check if reminder should be sent (7 days after due date, then every 7 days)
          const daysSinceDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          const lastReminderDate = invoice.last_reminder_sent ? new Date(invoice.last_reminder_sent) : null;
          const daysSinceLastReminder = lastReminderDate 
            ? Math.floor((today - lastReminderDate) / (1000 * 60 * 60 * 24))
            : daysSinceDue;

          // Send reminder if: first time overdue (7+ days) or 7+ days since last reminder
          if (daysSinceDue >= 7 && (!lastReminderDate || daysSinceLastReminder >= 7)) {
            try {
              // Send reminder email via Gmail
              await base44.asServiceRole.functions.invoke('sendEmailViaGmail', {
                to: invoice.client_email,
                subject: `Payment Reminder: Invoice ${invoice.invoice_number} is Overdue`,
                fromName: companySettings.company_name || 'Isla Accounting Corp',
                body: `
Dear ${invoice.client_name},

This is a friendly reminder that Invoice ${invoice.invoice_number} for $${invoice.total.toFixed(2)} is now overdue.

Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
Days Overdue: ${daysSinceDue}

${invoice.cpacharge_payment_url ? `You can pay online here: ${invoice.cpacharge_payment_url}` : ''}

Please contact us if you have any questions.

Thank you,
Isla Accounting Corp
`
              });

              // Update reminder tracking
              const reminderHistory = invoice.reminder_history || [];
              reminderHistory.push({
                sent_date: new Date().toISOString(),
                sent_by: 'system',
                reminder_type: 'automated_overdue'
              });

              await base44.asServiceRole.entities.Invoice.update(invoice.id, {
                last_reminder_sent: new Date().toISOString(),
                reminder_count: (invoice.reminder_count || 0) + 1,
                reminder_history: reminderHistory
              });

              results.reminders_sent++;
            } catch (emailError) {
              results.errors.push({
                invoice_id: invoice.id,
                error: 'Email send failed: ' + emailError.message
              });
            }
          }
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
    console.error('Check overdue invoices error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});