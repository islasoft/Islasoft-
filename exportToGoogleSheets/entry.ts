import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportData, reportTitle, reportType } = await req.json();

    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
      return Response.json({ error: 'No data to export' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Prepare sheet data based on report type
    let values = [];
    if (reportType === 'time-summary') {
      values = [
        ['Project/Client/User', 'Total Hours', 'Billable Hours', 'Non-Billable Hours'],
        ...reportData.map(row => [
          row.name,
          row.totalHours.toFixed(2),
          row.billableHours.toFixed(2),
          row.nonBillableHours.toFixed(2)
        ])
      ];
    } else if (reportType === 'projects') {
      values = [
        ['Project Name', 'Client', 'Due Date', 'Project Manager', 'Assigned To', 'Status'],
        ...reportData.map(row => [
          row.project_type?.replace(/_/g, ' ') || '',
          row.client_name || '',
          row.due_date || '',
          row.creator_name || '',
          row.assigned_to_name || '',
          row.status || ''
        ])
      ];
    } else if (reportType === 'profitability') {
      values = [
        ['Project', 'Client', 'Budget Hours', 'Actual Hours', 'Revenue'],
        ...reportData.map(row => [
          row.projectName,
          row.clientName,
          row.budgetHours.toFixed(2),
          row.actualHours.toFixed(2),
          `$${row.totalRevenue.toFixed(2)}`
        ])
      ];
    } else if (reportType === 'aging') {
      values = [
        ['Client', 'Invoice #', 'Amount', 'Days Overdue', 'Aging Bucket'],
        ...reportData.map(row => [
          row.clientName,
          row.invoiceNumber,
          `$${row.amount.toFixed(2)}`,
          row.daysOverdue.toString(),
          row.agingBucket
        ])
      ];
    } else if (reportType === 'utilization') {
      values = [
        ['User', 'Total Hours', 'Billable Hours', 'Utilization %'],
        ...reportData.map(row => [
          row.userName,
          row.totalHours.toFixed(2),
          row.billableHours.toFixed(2),
          `${row.utilizationRate.toFixed(1)}%`
        ])
      ];
    }

    // Create new spreadsheet
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `${reportTitle} - ${new Date().toLocaleDateString()}`
        }
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create spreadsheet: ${error}`);
    }

    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Add data to sheet
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values })
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update spreadsheet: ${error}`);
    }

    return Response.json({ 
      success: true,
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ 
      error: error.message || 'Failed to export to Google Sheets' 
    }, { status: 500 });
  }
});