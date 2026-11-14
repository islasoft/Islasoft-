import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { token, clientData } = body;

    if (!token || !clientData) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the pending client by token
    const clients = await base44.asServiceRole.entities.Client.filter({ registration_token: token });

    if (clients.length === 0) {
      return Response.json({ error: 'Invalid or expired registration link' }, { status: 404 });
    }

    const client = clients[0];

    // Check token expiry if set
    if (client.registration_token_expires_at && new Date(client.registration_token_expires_at) < new Date()) {
      return Response.json({ error: 'Registration link has expired' }, { status: 403 });
    }

    if (client.status !== 'pending') {
      return Response.json({ error: 'Registration already completed' }, { status: 400 });
    }

    // Generate client number
    const allClients = await base44.asServiceRole.entities.Client.list('client_number');
    const individualClients = allClients.filter(c => c.client_number?.startsWith('I-'));
    const lastNumber = individualClients.length > 0
      ? Math.max(...individualClients.map(c => parseInt(c.client_number?.split('-')[1] || '0')))
      : 0;
    const clientNumber = `I-${String(lastNumber + 1).padStart(3, '0')}`;

    // SECURITY: Explicit field allowlist — never spread client-supplied data directly
    const fullName = `${clientData.name || ''} ${clientData.middle_name || ''} ${clientData.last_name || ''}`.trim();

    await base44.asServiceRole.entities.Client.update(client.id, {
      client_number: clientNumber,
      company_name: fullName,
      name: clientData.name,
      middle_name: clientData.middle_name,
      last_name: clientData.last_name,
      dob: clientData.dob,
      ssn: clientData.ssn,
      filing_status: clientData.filing_status,
      dependents: clientData.dependents ? parseFloat(clientData.dependents) : null,
      phone: clientData.phone,
      address: clientData.address,
      city: clientData.city,
      state: clientData.state,
      zip_code: clientData.zip_code,
      dl_id: clientData.dl_id,
      dl_issued: clientData.dl_issued,
      dl_expire: clientData.dl_expire,
      bank_name: clientData.bank_name,
      bank_account: clientData.bank_account,
      bank_routing: clientData.bank_routing,
      account_type: clientData.account_type,
      registration_token: null, // Clear token after use
      registration_token_expires_at: null,
    });

    // Notify manager
    if (client.manager_id) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: client.manager_id,
        type: 'message_received',
        title: 'New Client Registration',
        message: `${fullName} has completed their registration and is pending approval.`,
        priority: 'medium'
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error submitting registration:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});