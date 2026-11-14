import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import nodemailer from 'npm:nodemailer@6.9.7';

/**
 * Scheduled daily function:
 * - Finds OnboardingWorkflows that are in_progress
 * - For any workflow where the last step update was 3+ days ago and there are still pending steps,
 *   sends a reminder email to the assigned staff member and optionally to the client.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    const companySettingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const company = companySettingsList[0] || {};
    const companyName = company.company_name || 'Isla Accounting Corp';

    const transporter = (gmailUser && gmailPassword)
      ? nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPassword } })
      : null;

    // Load all in-progress workflows
    const workflows = await base44.asServiceRole.entities.OnboardingWorkflow.filter({ status: 'in_progress' });

    const now = new Date();
    const STALE_DAYS = 3;
    let remindersCount = 0;

    for (const workflow of workflows) {
      const steps = workflow.steps || [];
      const pendingSteps = steps.filter(s => s.status === 'pending' || s.status === 'in_progress');
      if (pendingSteps.length === 0) continue;

      // Find the most recent completed step date, or fall back to workflow start
      const lastActivityDate = steps
        .filter(s => s.completed_date)
        .map(s => new Date(s.completed_date))
        .sort((a, b) => b - a)[0] || new Date(workflow.started_date || workflow.created_date);

      const daysSinceActivity = Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24));

      if (daysSinceActivity < STALE_DAYS) continue;

      // Avoid duplicate reminders: check notifications from today
      const todayStr = now.toISOString().split('T')[0];
      const existing = await base44.asServiceRole.entities.Notification.filter({
        related_id: workflow.id,
        type: 'onboarding_reminder',
      });
      const alreadySentToday = existing.some(n => {
        const d = n.created_date ? new Date(n.created_date).toISOString().split('T')[0] : '';
        return d === todayStr;
      });
      if (alreadySentToday) continue;

      // Build pending step list
      const pendingList = pendingSteps.map(s => `• ${s.step_name}`).join('\n');
      const pendingListHtml = pendingSteps.map(s => `<li>${s.step_name}</li>`).join('');

      // --- Notify assigned staff member ---
      if (workflow.assigned_to_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: workflow.assigned_to_id,
          type: 'onboarding_reminder',
          title: `Onboarding Stalled — ${workflow.client_name}`,
          message: `${pendingSteps.length} step(s) pending for ${daysSinceActivity} days. Please follow up.`,
          link: `/Clients`,
          related_id: workflow.id,
          related_type: 'onboarding_workflow',
          priority: daysSinceActivity >= 7 ? 'urgent' : 'high',
        });

        if (transporter && workflow.assigned_to_name) {
          const staffUsers = await base44.asServiceRole.entities.User.filter({ id: workflow.assigned_to_id });
          const staffEmail = staffUsers[0]?.email;
          if (staffEmail) {
            await transporter.sendMail({
              from: `"${companyName}" <${gmailUser}>`,
              to: staffEmail,
              subject: `⏳ Onboarding Reminder: ${workflow.client_name} (${daysSinceActivity}d stalled)`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:#0EA5E9;color:white;padding:20px;border-radius:8px 8px 0 0">
                    <h2 style="margin:0">${companyName}</h2>
                  </div>
                  <div style="background:#f9f9f9;padding:24px;border:1px solid #ddd">
                    <h3>Onboarding Follow-Up Needed</h3>
                    <p>The onboarding for <strong>${workflow.client_name}</strong> has been stalled for <strong>${daysSinceActivity} days</strong>.</p>
                    <p><strong>Pending steps (${pendingSteps.length}):</strong></p>
                    <ul>${pendingListHtml}</ul>
                    <p>Please log into IslaSoft Practice Manager and update the workflow.</p>
                  </div>
                  <div style="text-align:center;padding:16px;font-size:12px;color:#666">Automated reminder from ${companyName}</div>
                </div>
              `,
            });
          }
        }
        remindersCount++;
      }

      // --- Notify client if they have an email and have pending doc steps ---
      const clientRecords = await base44.asServiceRole.entities.Client.filter({ id: workflow.client_id });
      const client = clientRecords[0];
      const clientEmail = client?.email;
      const docPendingSteps = pendingSteps.filter(s =>
        s.required_documents && s.required_documents.length > 0
      );

      if (transporter && clientEmail && docPendingSteps.length > 0) {
        const docList = docPendingSteps
          .flatMap(s => s.required_documents)
          .map(d => `<li>${d}</li>`)
          .join('');

        await transporter.sendMail({
          from: `"${companyName}" <${gmailUser}>`,
          to: clientEmail,
          subject: `Action Required: Documents Needed — ${companyName}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#0EA5E9;color:white;padding:20px;border-radius:8px 8px 0 0">
                <h2 style="margin:0">${companyName}</h2>
              </div>
              <div style="background:#f9f9f9;padding:24px;border:1px solid #ddd">
                <h3>We Still Need a Few Things From You</h3>
                <p>Hi ${client.name || client.company_name || 'there'},</p>
                <p>To complete your onboarding, we are still waiting on the following documents:</p>
                <ul>${docList}</ul>
                <p>Please send these to us at your earliest convenience so we can get your account fully set up.</p>
                <p>If you have any questions, don't hesitate to reach out!</p>
                <p>Best regards,<br><strong>${companyName}</strong></p>
              </div>
              <div style="text-align:center;padding:16px;font-size:12px;color:#666">Automated reminder from ${companyName}</div>
            </div>
          `,
        });
        remindersCount++;
      }
    }

    return Response.json({
      success: true,
      workflows_checked: workflows.length,
      reminders_sent: remindersCount,
    });

  } catch (error) {
    console.error('checkOnboardingReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});