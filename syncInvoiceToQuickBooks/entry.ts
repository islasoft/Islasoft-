import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Entity automation payload: { event: { entity_id, ... }, data: {...} }
    const payload = await req.json();
    const invoice_id = payload.event?.entity_id || payload.data?.id || payload.invoice_id;

    if (!invoice_id) {
      return Response.json({ error: 'invoice_id is required' }, { status: 400 });
    }

    // Get company settings for QuickBooks credentials
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0];

    if (!settings?.quickbooks_connected || !settings?.quickbooks_access_token) {
      return Response.json({ error: 'QuickBooks not connected' }, { status: 400 });
    }

    // Get the invoice
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get client to use QuickBooks customer ID
    let client = await base44.asServiceRole.entities.Client.get(invoice.client_id);
    
    // If client not synced to QuickBooks, sync it first
    if (!client?.quickbooks_customer_id) {
      console.log('Client not synced to QuickBooks, syncing now...');
      const syncResult = await base44.asServiceRole.functions.invoke('syncClientToQuickBooks', {
        client_id: invoice.client_id
      });
      
      if (!syncResult.data?.success) {
        return Response.json({ 
          error: 'Failed to sync client to QuickBooks',
          details: syncResult.data
        }, { status: 400 });
      }
      
      // Refresh client data to get QuickBooks customer ID
      client = await base44.asServiceRole.entities.Client.get(invoice.client_id);
      
      if (!client?.quickbooks_customer_id) {
        return Response.json({ 
          error: 'Client sync completed but QuickBooks customer ID not found',
          client_id: invoice.client_id
        }, { status: 400 });
      }
    }

    // Prepare QuickBooks invoice payload
    const qbInvoice = {
      Line: [],
      CustomerRef: {
        value: client.quickbooks_customer_id
      },
      TxnDate: invoice.issue_date,
      DueDate: invoice.due_date,
      DocNumber: invoice.invoice_number,
      PrivateNote: invoice.notes || '',
      CustomerMemo: {
        value: invoice.notes || ''
      }
    };

    // Get or create "Professional Services" item
    let professionalServicesItem = await base44.asServiceRole.entities.QuickBooksItem.filter({ 
      name: 'Professional Services' 
    });
    
    if (!professionalServicesItem || professionalServicesItem.length === 0) {
      // Create the Professional Services item in QuickBooks
      const itemPayload = {
        Name: 'Professional Services',
        Type: 'Service',
        IncomeAccountRef: {
          value: '1' // Default income account
        }
      };

      const itemResponse = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${settings.quickbooks_realm_id}/item`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.quickbooks_access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(itemPayload)
        }
      );

      if (itemResponse.ok) {
        const itemData = await itemResponse.json();
        // Save to database
        await base44.asServiceRole.entities.QuickBooksItem.create({
          quickbooks_item_id: itemData.Item.Id,
          name: 'Professional Services',
          type: 'Service',
          active: true,
          synced_at: new Date().toISOString()
        });
        professionalServicesItem = await base44.asServiceRole.entities.QuickBooksItem.filter({ 
          name: 'Professional Services' 
        });
      }
    }

    const defaultServiceItem = professionalServicesItem[0];
    
    if (!defaultServiceItem) {
      return Response.json({ 
        error: 'Failed to create Professional Services item in QuickBooks'
      }, { status: 400 });
    }

    // Add line items - all mapped to Professional Services
    if (invoice.line_items && invoice.line_items.length > 0) {
      invoice.line_items.forEach((item, index) => {
        const unitPrice = item.hours > 0 ? item.amount / item.hours : item.amount;
        qbInvoice.Line.push({
          Id: String(index + 1),
          LineNum: index + 1,
          Description: `${item.project_name} - ${item.date} (${item.hours} hours)`,
          Amount: item.amount,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            Qty: item.hours,
            UnitPrice: unitPrice,
            ItemRef: {
              value: defaultServiceItem.quickbooks_item_id,
              name: defaultServiceItem.name
            }
          }
        });
      });
    }

    // Add expense items - all mapped to Professional Services
    if (invoice.expense_items && invoice.expense_items.length > 0) {
      invoice.expense_items.forEach((expense, index) => {
        qbInvoice.Line.push({
          Id: String((invoice.line_items?.length || 0) + index + 1),
          LineNum: (invoice.line_items?.length || 0) + index + 1,
          Description: `${expense.description} - ${expense.category}`,
          Amount: expense.amount,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            Qty: 1,
            UnitPrice: expense.amount,
            ItemRef: {
              value: defaultServiceItem.quickbooks_item_id,
              name: defaultServiceItem.name
            }
          }
        });
      });
    }

    // Add subtotal line
    qbInvoice.Line.push({
      Amount: invoice.total,
      DetailType: 'SubTotalLineDetail',
      SubTotalLineDetail: {}
    });

    // Send to QuickBooks
    const qbResponse = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${settings.quickbooks_realm_id}/invoice`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.quickbooks_access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(qbInvoice)
      }
    );

    if (!qbResponse.ok) {
      const error = await qbResponse.text();
      console.error('QuickBooks API error:', error);
      return Response.json({ error: 'Failed to sync to QuickBooks', details: error }, { status: qbResponse.status });
    }

    const qbInvoiceData = await qbResponse.json();
    const qbInvoiceId = qbInvoiceData.Invoice.Id;

    // Update invoice with QuickBooks ID
    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      quickbooks_invoice_id: qbInvoiceId,
      quickbooks_synced_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      quickbooks_invoice_id: qbInvoiceId,
      message: 'Invoice synced to QuickBooks successfully'
    });

  } catch (error) {
    console.error('Sync invoice error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});