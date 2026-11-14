import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { invoice_id } = body;
    if (!invoice_id) return Response.json({ error: 'invoice_id is required' }, { status: 400 });

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    // Find or create Stripe customer by email
    let customerId;
    if (invoice.client_email) {
      const existing = await stripe.customers.list({ email: invoice.client_email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          name: invoice.client_name || '',
          email: invoice.client_email,
          metadata: { client_id: invoice.client_id || '' },
        });
        customerId = customer.id;
      }
    }

    // Build line items from internal invoice
    const allItems = [
      ...(invoice.line_items || []).map(item => ({
        description: item.project_name || 'Professional Services',
        amount: Math.round((item.amount || 0) * 100),
      })),
      ...(invoice.expense_items || []).map(item => ({
        description: item.description || 'Expense',
        amount: Math.round((item.amount || 0) * 100),
      })),
    ].filter(i => i.amount > 0);

    // Add merchant fee as a line item if present
    if (invoice.merchant_fee && invoice.merchant_fee > 0) {
      allItems.push({
        description: 'Merchant Processing Fee (3%)',
        amount: Math.round(invoice.merchant_fee * 100),
      });
    }

    if (allItems.length === 0) {
      return Response.json({ error: 'Invoice has no billable items' }, { status: 400 });
    }

    // Create invoice items in Stripe
    for (const item of allItems) {
      const params = { amount: item.amount, currency: 'usd', description: item.description };
      if (customerId) params.customer = customerId;
      await stripe.invoiceItems.create(params);
    }

    // Create and finalize the Stripe invoice
    const stripeInvoiceParams = {
      collection_method: 'send_invoice',
      days_until_due: 30,
      metadata: {
        internal_invoice_id: invoice_id,
        invoice_number: invoice.invoice_number || '',
        client_id: invoice.client_id || '',
      },
      description: `Invoice ${invoice.invoice_number || ''} — ${invoice.client_name || ''}`,
    };
    if (customerId) stripeInvoiceParams.customer = customerId;

    const stripeInvoice = await stripe.invoices.create(stripeInvoiceParams);
    const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id);

    // Send invoice email via Stripe (only if client has email)
    if (invoice.client_email) {
      await stripe.invoices.sendInvoice(finalized.id);
    }

    // Update our internal invoice with the Stripe hosted URL
    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      cpacharge_payment_url: finalized.hosted_invoice_url,
      status: 'sent',
    });

    return Response.json({
      stripe_invoice_id: finalized.id,
      hosted_invoice_url: finalized.hosted_invoice_url,
      invoice_pdf: finalized.invoice_pdf,
      status: finalized.status,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});