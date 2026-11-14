import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Get company settings for QuickBooks credentials
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0];

    if (!settings?.quickbooks_connected || !settings?.quickbooks_access_token) {
      return Response.json({ error: 'QuickBooks not connected' }, { status: 400 });
    }

    // Get the client
    const client = await base44.entities.Client.get(client_id);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check if client already synced
    const isUpdate = !!client.quickbooks_customer_id;

    // Prepare QuickBooks customer payload
    const qbCustomer = {
      DisplayName: client.company_name || `${client.name || ''} ${client.last_name || ''}`.trim(),
      PrimaryEmailAddr: client.email ? { Address: client.email } : undefined,
      PrimaryPhone: client.phone ? { FreeFormNumber: client.phone } : undefined,
      BillAddr: {
        Line1: client.address,
        City: client.city,
        CountrySubDivisionCode: client.state,
        PostalCode: client.zip_code
      },
      CompanyName: client.company_name,
      GivenName: client.name,
      FamilyName: client.last_name,
      Notes: client.notes
    };

    // Remove undefined fields
    Object.keys(qbCustomer).forEach(key => 
      qbCustomer[key] === undefined && delete qbCustomer[key]
    );

    let qbResponse;
    
    if (isUpdate) {
      // Update existing customer
      const getResponse = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${settings.quickbooks_realm_id}/customer/${client.quickbooks_customer_id}`,
        {
          headers: {
            'Authorization': `Bearer ${settings.quickbooks_access_token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!getResponse.ok) {
        return Response.json({ error: 'Failed to fetch existing customer from QuickBooks' }, { status: getResponse.status });
      }

      const existingData = await getResponse.json();
      qbCustomer.Id = client.quickbooks_customer_id;
      qbCustomer.SyncToken = existingData.Customer.SyncToken;

      qbResponse = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${settings.quickbooks_realm_id}/customer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.quickbooks_access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(qbCustomer)
        }
      );
    } else {
      // Create new customer
      qbResponse = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${settings.quickbooks_realm_id}/customer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.quickbooks_access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(qbCustomer)
        }
      );
    }

    if (!qbResponse.ok) {
      const error = await qbResponse.text();
      console.error('QuickBooks API error:', error);
      return Response.json({ error: 'Failed to sync to QuickBooks', details: error }, { status: qbResponse.status });
    }

    const qbCustomerData = await qbResponse.json();
    const qbCustomerId = qbCustomerData.Customer.Id;

    // Update client with QuickBooks ID
    await base44.asServiceRole.entities.Client.update(client_id, {
      quickbooks_customer_id: qbCustomerId,
      quickbooks_synced_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      quickbooks_customer_id: qbCustomerId,
      message: `Client ${isUpdate ? 'updated in' : 'synced to'} QuickBooks successfully`
    });

  } catch (error) {
    console.error('Sync client error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});