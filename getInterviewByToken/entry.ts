import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, additionalAttendees } = await req.json();

    if (!token) return Response.json({ error: 'Token required' }, { status: 400 });

    const interviews = await base44.asServiceRole.entities.ClientInterview.filter({ scheduling_token: token });
    const interview = interviews[0];

    if (!interview) return Response.json({ error: 'Not found' }, { status: 404 });

    // If updating attendees
    if (additionalAttendees !== undefined) {
      await base44.asServiceRole.entities.ClientInterview.update(interview.id, {
        client_additional_attendees: additionalAttendees,
        status: 'scheduled',
      });
      return Response.json({ success: true });
    }

    return Response.json({ interview });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});