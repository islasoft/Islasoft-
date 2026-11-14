import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    // Only handle user create events
    if (event?.type !== 'create') {
      return Response.json({ skipped: true });
    }

    const userEmail = data?.email;
    if (!userEmail) {
      return Response.json({ skipped: 'no email' });
    }

    // Look for a pending invitation for this email
    const invitations = await base44.asServiceRole.entities.PendingInvitation.filter({
      email: userEmail,
      processed: false,
    });

    const pending = invitations?.find(i => i.tenant_id);
    if (!pending) {
      return Response.json({ skipped: 'no pending invitation with tenant_id' });
    }

    // Assign tenant_id, role, and team_category to the new user
    await base44.asServiceRole.entities.User.update(data.id, {
      tenant_id: pending.tenant_id,
      role: pending.role || 'user',
      team_category: pending.team_category || '',
    });

    // Mark invitation as processed
    await base44.asServiceRole.entities.PendingInvitation.update(pending.id, { processed: true });

    return Response.json({ success: true, assigned_tenant_id: pending.tenant_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});