import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isManager = user.role === 'admin' || user.team_category === 'cpa' || user.team_category === 'senior_staff';
    if (!isManager) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { clientId } = await req.json();
    if (!clientId) {
      return Response.json({ error: 'clientId is required' }, { status: 400 });
    }

    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (!clients || clients.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = clients[0];

    // If already has a token, return it
    if (client.registration_token) {
      return Response.json({ token: client.registration_token });
    }

    // Generate and save a new token
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    await base44.asServiceRole.entities.Client.update(clientId, { registration_token: token });

    return Response.json({ token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});