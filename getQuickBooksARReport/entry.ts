import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get company settings
    const settingsList = await base44.entities.CompanySettings.list();
    const settings = settingsList[0];

    if (!settings?.quickbooks_access_token) {
      return Response.json({ error: 'QuickBooks not connected' }, { status: 400 });
    }

    const realmId = settings.quickbooks_realm_id;

    // Fetch AR Aging Summary from QuickBooks
    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/AgedReceivableSummary?date_macro=Today`,
      {
        headers: {
          'Authorization': `Bearer ${settings.quickbooks_access_token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`QuickBooks API error: ${errorText}`);
    }

    const reportData = await response.json();
    
    return Response.json({ 
      success: true,
      report: reportData
    });

  } catch (error) {
    console.error('QB AR Report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});