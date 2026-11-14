import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const results = {
      customers_synced: 0,
      items_synced: 0,
      payments_synced: 0,
      clients_pushed: 0,
      invoices_pushed: 0,
      errors: []
    };

    // 1. Sync Customers FROM QuickBooks
    try {
      const customersResponse = await base44.functions.invoke('syncCustomersFromQuickBooks', {});
      if (customersResponse.data?.synced_count !== undefined) {
        results.customers_synced = customersResponse.data.synced_count;
      }
    } catch (error) {
      results.errors.push(`Customers sync failed: ${error.message}`);
    }

    // 2. Sync Items FROM QuickBooks
    try {
      const itemsResponse = await base44.functions.invoke('syncQuickBooksItems', {});
      if (itemsResponse.data?.synced_count !== undefined) {
        results.items_synced = itemsResponse.data.synced_count;
      }
    } catch (error) {
      results.errors.push(`Items sync failed: ${error.message}`);
    }

    // 3. Sync Payments FROM QuickBooks
    try {
      const paymentsResponse = await base44.functions.invoke('pullQuickBooksPayments', {});
      if (paymentsResponse.data?.payments_synced !== undefined) {
        results.payments_synced = paymentsResponse.data.payments_synced;
      }
    } catch (error) {
      results.errors.push(`Payments sync failed: ${error.message}`);
    }

    // 4. Push unsynced Clients TO QuickBooks
    try {
      const unsyncedClients = await base44.asServiceRole.entities.Client.filter({
        $or: [
          { quickbooks_customer_id: { $exists: false } },
          { quickbooks_customer_id: null },
          { quickbooks_customer_id: "" }
        ]
      });

      for (const client of unsyncedClients) {
        try {
          const clientResponse = await base44.functions.invoke('syncClientToQuickBooks', {
            client_id: client.id
          });
          if (clientResponse.data?.success) {
            results.clients_pushed++;
          }
        } catch (error) {
          results.errors.push(`Client ${client.client_number} failed: ${error.message}`);
        }
      }
    } catch (error) {
      results.errors.push(`Client push failed: ${error.message}`);
    }

    // 5. Push unsynced Invoices TO QuickBooks
    try {
      const unsyncedInvoices = await base44.asServiceRole.entities.Invoice.filter({
        status: { $ne: 'draft' },
        $or: [
          { quickbooks_invoice_id: { $exists: false } },
          { quickbooks_invoice_id: null },
          { quickbooks_invoice_id: "" }
        ]
      });

      for (const invoice of unsyncedInvoices) {
        try {
          const invoiceResponse = await base44.functions.invoke('syncInvoiceToQuickBooks', {
            invoice_id: invoice.id
          });
          if (invoiceResponse.data?.success) {
            results.invoices_pushed++;
          }
        } catch (error) {
          results.errors.push(`Invoice ${invoice.invoice_number} failed: ${error.message}`);
        }
      }
    } catch (error) {
      results.errors.push(`Invoice push failed: ${error.message}`);
    }

    return Response.json({
      success: true,
      results,
      summary: `Synced: ${results.customers_synced} customers, ${results.items_synced} items, ${results.payments_synced} payments | Pushed: ${results.clients_pushed} clients, ${results.invoices_pushed} invoices`,
      has_errors: results.errors.length > 0
    });

  } catch (error) {
    console.error('Sync All error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});