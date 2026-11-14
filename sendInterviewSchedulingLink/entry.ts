import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { interviewId } = await req.json();

    const interviews = await base44.asServiceRole.entities.ClientInterview.filter({ id: interviewId });
    const interview = interviews[0];
    if (!interview) return Response.json({ error: 'Interview not found' }, { status: 404 });

    const settings = await base44.asServiceRole.entities.CompanySettings.list();
    const company = settings[0] || {};
    const companyName = company.company_name || 'Isla Accounting Corp';
    const fromEmail = company.from_email || company.email || 'info@islaccounting.com';

    const appUrl = `${req.headers.get('origin') || 'https://app.base44.com'}`;
    const schedulingUrl = `${appUrl}/InterviewConfirm?token=${interview.scheduling_token}`;

    const clientName = interview.client_name || 'Valued Client';
    const accountantName = interview.accountant_name || companyName;

    const subject = `Schedule Your Appointment — ${companyName}`;
    const body = `
Dear ${clientName},

Your engagement letter has been signed. The next step is to schedule your initial client interview with your accountant, ${accountantName}.

Please use the link below to confirm your appointment details and let us know if you'll be bringing any additional attendees:

<a href="${schedulingUrl}">Schedule Your Appointment</a>

During the interview, we'll review your financial situation, answer any questions, and finalize the scope of our services.

Please also prepare to bring the documents listed on the preparation page (accessible via the link above).

If you have any questions in the meantime, please don't hesitate to reach out.

Warm regards,
${accountantName}
${companyName}
`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: interview.client_email,
      subject,
      body,
      from_name: accountantName,
    });

    await base44.asServiceRole.entities.ClientInterview.update(interviewId, {
      link_sent_at: new Date().toISOString(),
      status: 'pending_scheduling',
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});