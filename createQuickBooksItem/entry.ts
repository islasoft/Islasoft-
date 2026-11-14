import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create QuickBooks items
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { name, description, type, unit_price } = await req.json();

    if (!name || unit_price === undefined) {
      return Response.json({ error: 'Name and unit_price are required' }, { status: 400 });
    }

    // Get QuickBooks connection details
    const settings = await base44.asServiceRole.entities.CompanySettings.list();
    if (!settings || settings.length === 0) {
      return Response.json({ error: 'Company settings not found' }, { status: 404 });
    }

    const companySetting = settings[0];
    if (!companySetting.quickbooks_connected || !companySetting.quickbooks_access_token) {
      return Response.json({ error: 'QuickBooks not connected' }, { status: 400 });
    }

    // Prepare QuickBooks item payload
    const qbItemPayload = {
      Name: name,
      Type: type || 'Service',
      Active: true,
      IncomeAccountRef: {
        value: '79' // Default income account - adjust as needed
      }
    };

    if (description) {
      qbItemPayload.Description = description;
    }

    if (unit_price !== undefined && unit_price !== null) {
      qbItemPayload.UnitPrice = parseFloat(unit_price);
    }

    // Create item in QuickBooks
    const qbResponse = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${companySetting.quickbooks_realm_id}/item`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${companySetting.quickbooks_access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(qbItemPayload)
      }
    );

    const qbData = await qbResponse.json();

    if (!qbResponse.ok) {
      return Response.json({
        error: 'Failed to create item in QuickBooks',
        details: JSON.stringify(qbData)
      }, { status: 400 });
    }

    // Store the item locally
    await base44.asServiceRole.entities.QuickBooksItem.create({
      quickbooks_item_id: qbData.Item.Id,
      name: qbData.Item.Name,
      description: qbData.Item.Description || null,
      type: qbData.Item.Type,
      unit_price: qbData.Item.UnitPrice || 0,
      income_account_ref: qbData.Item.IncomeAccountRef?.value || null,
      active: qbData.Item.Active !== false,
      taxable: qbData.Item.Taxable || false,
      synced_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      quickbooks_item_id: qbData.Item.Id,
      message: 'Item created successfully'
    });

  } catch (error) {
    console.error('Create QuickBooks item error:', error);
    return Response.json({
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});