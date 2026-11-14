import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get company settings
    const settingsList = await base44.entities.CompanySettings.list();
    const settings = settingsList[0];

    if (!settings?.quickbooks_access_token) {
      return Response.json({ error: 'QuickBooks not connected' }, { status: 400 });
    }

    const realmId = settings.quickbooks_realm_id;

    // Fetch all active customers from QuickBooks
    const qbResponse = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Customer WHERE Active = true MAXRESULTS 1000`,
      {
        headers: {
          'Authorization': `Bearer ${settings.quickbooks_access_token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!qbResponse.ok) {
      const errorText = await qbResponse.text();
      throw new Error(`QuickBooks API error: ${errorText}`);
    }

    const qbData = await qbResponse.json();
    const customers = qbData.QueryResponse?.Customer || [];

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const qbCustomer of customers) {
      // Check if customer already exists
      const existingClients = await base44.entities.Client.filter({
        quickbooks_customer_id: qbCustomer.Id
      });

      const customerData = {
        company_name: qbCustomer.CompanyName || qbCustomer.DisplayName,
        name: qbCustomer.GivenName || '',
        last_name: qbCustomer.FamilyName || '',
        email: qbCustomer.PrimaryEmailAddr?.Address || '',
        phone: qbCustomer.PrimaryPhone?.FreeFormNumber || '',
        address: qbCustomer.BillAddr?.Line1 || '',
        city: qbCustomer.BillAddr?.City || '',
        state: qbCustomer.BillAddr?.CountrySubDivisionCode || '',
        zip_code: qbCustomer.BillAddr?.PostalCode || '',
        status: qbCustomer.Active ? 'active' : 'inactive',
        quickbooks_customer_id: qbCustomer.Id,
        quickbooks_synced_at: new Date().toISOString(),
        quickbooks_last_synced: new Date().toISOString()
      };

      if (existingClients.length > 0) {
        // Update existing client
        await base44.entities.Client.update(existingClients[0].id, customerData);
        updated++;
      } else {
        // Create new client
        await base44.entities.Client.create(customerData);
        created++;
      }
    }

    return Response.json({
      success: true,
      total: customers.length,
      created,
      updated,
      skipped,
      message: `Synced ${customers.length} customers from QuickBooks`
    });

  } catch (error) {
    console.error('Sync customers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});