import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get company settings
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0];

    if (!settings?.quickbooks_connected || !settings?.quickbooks_access_token) {
      return Response.json({ error: 'QuickBooks not connected' }, { status: 400 });
    }

    // Fetch recent payments from QuickBooks (last 90 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);
    const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];

    const qbResponse = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${settings.quickbooks_realm_id}/query?query=SELECT * FROM Payment WHERE TxnDate >= '${dateFilter}' MAXRESULTS 100`,
      {
        headers: {
          'Authorization': `Bearer ${settings.quickbooks_access_token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!qbResponse.ok) {
      const error = await qbResponse.text();
      console.error('QuickBooks API error:', error);
      return Response.json({ error: 'Failed to fetch payments from QuickBooks', details: error }, { status: qbResponse.status });
    }

    const qbData = await qbResponse.json();
    const payments = qbData.QueryResponse?.Payment || [];

    let updatedInvoices = 0;
    let createdPayments = 0;

    // Process each payment
    for (const payment of payments) {
      // Find linked invoices
      if (payment.Line && payment.Line.length > 0) {
        for (const line of payment.Line) {
          if (line.LinkedTxn && line.LinkedTxn.length > 0) {
            for (const linkedTxn of line.LinkedTxn) {
              if (linkedTxn.TxnType === 'Invoice') {
                const qbInvoiceId = linkedTxn.TxnId;
                
                // Find our invoice by QuickBooks ID
                const invoices = await base44.asServiceRole.entities.Invoice.filter({
                  quickbooks_invoice_id: qbInvoiceId
                });

                if (invoices.length > 0) {
                  const invoice = invoices[0];
                  
                  // Check if invoice is already marked as paid
                  if (invoice.status !== 'paid') {
                    // Update invoice status to paid
                    await base44.asServiceRole.entities.Invoice.update(invoice.id, {
                      status: 'paid',
                      quickbooks_payment_received_at: payment.TxnDate
                    });
                    updatedInvoices++;
                  }

                  // Create payment record if it doesn't exist
                  const existingPayments = await base44.asServiceRole.entities.Payment.filter({
                    invoice_id: invoice.id,
                    reference_number: payment.PaymentRefNum || payment.Id
                  });

                  if (existingPayments.length === 0) {
                    await base44.asServiceRole.entities.Payment.create({
                      invoice_id: invoice.id,
                      invoice_number: invoice.invoice_number,
                      client_id: invoice.client_id,
                      client_name: invoice.client_name,
                      amount: line.Amount || payment.TotalAmt,
                      payment_date: payment.TxnDate,
                      payment_method: 'other',
                      reference_number: payment.PaymentRefNum || payment.Id,
                      notes: 'Synced from QuickBooks',
                      quickbooks_payment_id: payment.Id,
                      quickbooks_synced_at: new Date().toISOString()
                    });
                    createdPayments++;
                  }
                }
              }
            }
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: `Processed ${payments.length} payments from QuickBooks`,
      updated_invoices: updatedInvoices,
      created_payments: createdPayments
    });

  } catch (error) {
    console.error('Pull payments error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});