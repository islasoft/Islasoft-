import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();

        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        const { userId, status } = await req.json();

        if (!userId) {
            return Response.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Update user onboarding status using service role
        await base44.asServiceRole.entities.User.update(userId, {
            contractor_onboarding_status: status || 'pending',
            contractor_onboarding_completed_date: null
        });

        return Response.json({ success: true });

    } catch (error) {
        console.error('Error updating user onboarding:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});