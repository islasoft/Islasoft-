import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, role = 'user' } = await req.json();
    
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    await base44.users.inviteUser(email, role);

    return Response.json({
      success: true,
      message: 'Developer invited successfully'
    });

  } catch (error) {
    console.error('Invite developer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});