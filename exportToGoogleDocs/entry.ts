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

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledocs');

    // Create document
    const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `${reportTitle} - ${new Date().toLocaleDateString()}`
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create document: ${error}`);
    }

    const doc = await createResponse.json();
    const documentId = doc.documentId;

    // Format report content
    let content = `${reportTitle}\n\nGenerated: ${new Date().toLocaleString()}\n\n`;
    
    if (reportType === 'time-summary') {
      reportData.forEach(row => {
        content += `${row.name}: ${row.totalHours.toFixed(2)} hrs (${row.billableHours.toFixed(2)} billable, ${row.nonBillableHours.toFixed(2)} non-billable)\n`;
      });
    } else if (reportType === 'projects') {
      reportData.forEach(row => {
        content += `${row.project_type?.replace(/_/g, ' ')} - ${row.client_name}\n`;
        content += `  Due: ${row.due_date}, Status: ${row.status}\n`;
        content += `  Assigned: ${row.assigned_to_name}\n\n`;
      });
    } else if (reportType === 'profitability') {
      reportData.forEach(row => {
        content += `${row.projectName} (${row.clientName})\n`;
        content += `  Budget: ${row.budgetHours.toFixed(2)} hrs, Actual: ${row.actualHours.toFixed(2)} hrs\n`;
        content += `  Revenue: $${row.totalRevenue.toFixed(2)}\n\n`;
      });
    } else if (reportType === 'aging') {
      reportData.forEach(row => {
        content += `${row.clientName} - Invoice ${row.invoiceNumber}: $${row.amount.toFixed(2)} (${row.agingBucket})\n`;
      });
    } else if (reportType === 'utilization') {
      reportData.forEach(row => {
        content += `${row.userName}: ${row.totalHours.toFixed(2)} hrs (${row.utilizationRate.toFixed(1)}% utilization)\n`;
      });
    }

    // Insert content
    const updateResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            insertText: {
              location: { index: 1 },
              text: content
            }
          }]
        })
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update document: ${error}`);
    }

    return Response.json({ 
      success: true,
      documentId,
      url: `https://docs.google.com/document/d/${documentId}`
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ 
      error: error.message || 'Failed to export to Google Docs' 
    }, { status: 500 });
  }
});