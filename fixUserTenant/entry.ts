import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { target_email, tenant_id, role, team_category } = await req.json();

    const users = await base44.asServiceRole.entities.User.filter({ email: target_email });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      tenant_id,
      role: role || targetUser.role,
      team_category: team_category || targetUser.team_category,
    });

    return Response.json({ success: true, updated_user_id: targetUser.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});