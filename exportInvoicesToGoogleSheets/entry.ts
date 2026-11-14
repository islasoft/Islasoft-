import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get access token for Google Sheets
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch all invoices
    const invoices = await base44.asServiceRole.entities.Invoice.list('-created_date');

    // Prepare rows for Google Sheets
    const rows = [];
    
    // Header row
    rows.push([
      'Invoice Number',
      'Customer',
      'Email',
      'Terms',
      'Invoice Date',
      'Due Date',
      'Location',
      'Memo',
      'Message on Invoice',
      'Send Later',
      'Product/Service',
      'Description',
      'Quantity',
      'Rate',
      'Amount',
      'Tax Rate',
      'Class'
    ]);

    // Process each invoice
    for (const invoice of invoices) {
      const baseRow = [
        invoice.invoice_number || '',
        invoice.client_name || '',
        invoice.client_email || '',
        'Net 30', // Default terms
        invoice.issue_date || '',
        invoice.due_date || '',
        '', // Location
        invoice.notes || '',
        '', // Message on invoice
        'FALSE', // Send later
      ];

      let isFirstLine = true;

      // Add line items
      if (invoice.line_items && invoice.line_items.length > 0) {
        for (const item of invoice.line_items) {
          const row = isFirstLine ? [...baseRow] : [invoice.invoice_number, '', '', '', '', '', '', '', '', ''];
          
          row.push(
            item.project_name || 'Service',
            `${item.project_name || 'Service'} - ${item.date || ''}`,
            item.hours || 1,
            invoice.hourly_rate || 0,
            item.amount || 0,
            invoice.tax_rate || 0,
            '' // Class
          );
          
          rows.push(row);
          isFirstLine = false;
        }
      }

      // Add expense items
      if (invoice.expense_items && invoice.expense_items.length > 0) {
        for (const expense of invoice.expense_items) {
          const row = isFirstLine ? [...baseRow] : [invoice.invoice_number, '', '', '', '', '', '', '', '', ''];
          
          row.push(
            expense.category || 'Expense',
            expense.description || '',
            1,
            expense.amount || 0,
            expense.amount || 0,
            0,
            '' // Class
          );
          
          rows.push(row);
          isFirstLine = false;
        }
      }

      // Add merchant fee as last line if exists
      if (invoice.merchant_fee && invoice.merchant_fee > 0) {
        const row = isFirstLine ? [...baseRow] : [invoice.invoice_number, '', '', '', '', '', '', '', '', ''];
        
        row.push(
          'Merchant Processing Fee',
          '3% Processing Fee',
          1,
          invoice.merchant_fee,
          invoice.merchant_fee,
          0,
          '' // Class
        );
        
        rows.push(row);
      }

      // If no line items at all, add a single row with basic info
      if (isFirstLine) {
        const row = [...baseRow];
        row.push('Service', '', 1, invoice.total || 0, invoice.total || 0, invoice.tax_rate || 0, '');
        rows.push(row);
      }
    }

    // Create Google Sheet
    const createSheetResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `Invoice Export - ${new Date().toISOString().split('T')[0]}`
        },
        sheets: [{
          properties: {
            title: 'Invoices'
          }
        }]
      })
    });

    if (!createSheetResponse.ok) {
      throw new Error('Failed to create Google Sheet');
    }

    const sheet = await createSheetResponse.json();
    const spreadsheetId = sheet.spreadsheetId;

    // Populate the sheet with data
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Invoices!A1:Q${rows.length}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows
        })
      }
    );

    if (!updateResponse.ok) {
      throw new Error('Failed to populate Google Sheet');
    }

    return Response.json({
      success: true,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      spreadsheetId: spreadsheetId,
      rowCount: rows.length - 1 // Excluding header
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ 
      error: error.message || 'Failed to export invoices' 
    }, { status: 500 });
  }
});