import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Scheduled automation — no user session, use service role directly.

    // Get company settings for QuickBooks credentials
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0];

    if (!settings?.quickbooks_connected || !settings?.quickbooks_refresh_token) {
      return Response.json({ error: 'QuickBooks not connected' }, { status: 400 });
    }

    // Refresh the QB access token before use
    const clientId = Deno.env.get('QUICKBOOKS_PRODUCTION_CLIENT_ID');
    const clientSecret = Deno.env.get('QUICKBOOKS_PRODUCTION_CLIENT_SECRET');
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(settings.quickbooks_refresh_token)}`
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return Response.json({ error: 'Failed to refresh QuickBooks token', details: err }, { status: 401 });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Persist updated tokens
    const updatePayload = {
      quickbooks_access_token: accessToken,
      quickbooks_token_expires_at: expiresAt,
    };
    if (tokenData.refresh_token) {
      updatePayload.quickbooks_refresh_token = tokenData.refresh_token;
    }
    await base44.asServiceRole.entities.CompanySettings.update(settings.id, updatePayload);

    // Fetch items from QuickBooks
    const qbResponse = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${settings.quickbooks_realm_id}/query?query=SELECT * FROM Item WHERE Active = true`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!qbResponse.ok) {
      const error = await qbResponse.text();
      console.error('QuickBooks API error:', error);
      return Response.json({ error: 'Failed to fetch items from QuickBooks', details: error }, { status: qbResponse.status });
    }

    const qbData = await qbResponse.json();
    const qbItems = qbData.QueryResponse?.Item || [];

    // Sync items to database
    let createdCount = 0;
    let updatedCount = 0;

    for (const qbItem of qbItems) {
      // Check if item already exists
      const existingItems = await base44.asServiceRole.entities.QuickBooksItem.filter({
        quickbooks_item_id: qbItem.Id
      });

      const itemData = {
        quickbooks_item_id: qbItem.Id,
        name: qbItem.Name,
        description: qbItem.Description || '',
        type: qbItem.Type,
        unit_price: qbItem.UnitPrice || 0,
        income_account_ref: qbItem.IncomeAccountRef?.value,
        active: qbItem.Active !== false,
        taxable: qbItem.Taxable === true,
        synced_at: new Date().toISOString()
      };

      if (existingItems.length > 0) {
        await base44.asServiceRole.entities.QuickBooksItem.update(existingItems[0].id, itemData);
        updatedCount++;
      } else {
        await base44.asServiceRole.entities.QuickBooksItem.create(itemData);
        createdCount++;
      }
    }

    return Response.json({
      success: true,
      message: `Synced ${qbItems.length} items from QuickBooks`,
      created: createdCount,
      updated: updatedCount,
      total: qbItems.length
    });

  } catch (error) {
    console.error('Sync items error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});