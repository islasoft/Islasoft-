import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: Require authenticated user — prevent unauthenticated email sending
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isStaff = user.role === 'admin' || ['cpa', 'senior_staff', 'staff'].includes(user.team_category);
    if (!isStaff) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Entity automation payload: { event: { entity_id, ... }, data: {...} }
    const payload = await req.json();
    const invoice_id = payload.event?.entity_id || payload.data?.id || payload.invoice_id;

    if (!invoice_id) {
      return Response.json({ error: 'invoice_id is required' }, { status: 400 });
    }

    // Get the invoice
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get company settings
    const settings = await base44.asServiceRole.entities.CompanySettings.list();
    const companySetting = settings[0] || {};

    const companyName = companySetting.company_name || 'Isla Accompting Corp';
    const fromEmail = companySetting.from_email || companySetting.email || 'noreply@islaccounting.com';

    const subject = `Invoice ${invoice.invoice_number} from ${companyName}`;

    const emailBody = `
Dear ${invoice.client_name},

Thank you for your business. Please find your invoice details below:

Invoice Number: ${invoice.invoice_number}
Issue Date: ${new Date(invoice.issue_date).toLocaleDateString()}
Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
Amount Due: $${invoice.total?.toFixed(2) || '0.00'}

${invoice.cpacharge_payment_url ? `
You can make a payment online at:
${invoice.cpacharge_payment_url}
` : ''}

${invoice.notes ? `
Notes:
${invoice.notes}
` : ''}

Our services are billed at our standard rates: CPA $200/hr, Senior Staff $150/hr, and Staff $125/hr. Invoices are due upon presentation.

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
${companyName}
${companySetting.phone ? `Phone: ${companySetting.phone}` : ''}
${companySetting.email ? `Email: ${companySetting.email}` : ''}
    `.trim();

    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailUser || !gmailPassword) {
      return Response.json({
        error: 'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in settings.'
      }, { status: 500 });
    }

    const nodemailer = await import('npm:nodemailer@6.9.7');

    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    });

    await transporter.sendMail({
      from: `${companyName} <${gmailUser}>`,
      to: invoice.client_email,
      subject: subject,
      text: emailBody,
      replyTo: companySetting.email || gmailUser
    });

    // Track the email
    await base44.asServiceRole.entities.EmailTracking.create({
      client_id: invoice.client_id,
      client_name: invoice.client_name,
      recipient_email: invoice.client_email,
      subject: subject,
      email_type: 'invoice',
      related_id: invoice_id,
      sent_date: new Date().toISOString(),
      sent_by_id: user.id,
      sent_by_name: user.full_name || 'Staff',
      status: 'sent'
    });

    // Update invoice status if it was draft
    if (invoice.status === 'draft') {
      await base44.asServiceRole.entities.Invoice.update(invoice_id, {
        status: 'sent'
      });
    }

    return Response.json({
      success: true,
      message: 'Invoice email sent successfully'
    });

  } catch (error) {
    console.error('Send invoice email error:', error);
    return Response.json({
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});