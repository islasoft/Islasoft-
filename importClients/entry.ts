import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create clients
    const isManager = user.role === 'admin' || user.team_category === 'cpa' || user.team_category === 'senior_staff';
    if (!isManager) {
      return Response.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { clients } = await req.json();

    if (!Array.isArray(clients) || clients.length === 0) {
      return Response.json({ error: 'No clients provided' }, { status: 400 });
    }

    // Create clients one by one using service role
    const results = [];
    for (const client of clients) {
      const created = await base44.asServiceRole.entities.Client.create(client);
      results.push(created);
    }

    return Response.json({ 
      success: true, 
      count: results.length,
      clients: results
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});