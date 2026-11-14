import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import nodemailer from 'npm:nodemailer@6.9.7';

/**
 * Called automatically after a client completes the intake form (or can be called manually).
 * 1. Creates an OnboardingWorkflow with steps based on client type.
 * 2. Sends a welcome email with checklist summary and portal link.
 * 3. Creates an "Engagement Letter" step notification for the assigned manager.
 */
Deno.serve(async (req) => {
  try {
    const { client_id } = await req.json();
    if (!client_id) return Response.json({ error: 'client_id required' }, { status: 400 });

    const base44 = createClientFromRequest(req);

    const client = await base44.asServiceRole.entities.Client.get(client_id);
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const companySettingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const company = companySettingsList[0] || {};
    const companyName = company.company_name || 'Isla Accounting Corp';

    // Determine workflow type from client data
    const isEntity = !!client.incorporated_as && client.incorporated_as !== 'Sole Proprietorship';
    const workflowType = isEntity ? 'business_entity' : 'individual_tax';

    const WORKFLOW_STEPS = {
      individual_tax: [
        { step_name: 'Welcome & initial consultation', description: 'Schedule and conduct initial client meeting', required_documents: ['ID', 'Prior year returns'], status: 'pending' },
        { step_name: 'Engagement letter', description: 'Send and receive signed engagement letter', required_documents: ['Signed engagement letter'], status: 'pending' },
        { step_name: 'Document collection', description: 'Collect W-2s, 1099s, and other tax documents', required_documents: ['W-2', '1099', 'Deduction receipts'], status: 'pending' },
        { step_name: 'Client portal setup', description: 'Create client portal access and share credentials', required_documents: [], status: 'pending' },
        { step_name: 'Bank information', description: 'Collect bank account for refunds/payments', required_documents: ['Bank info'], status: 'pending' },
        { step_name: 'Review & approval', description: 'Final review and client sign-off', required_documents: [], status: 'pending' },
      ],
      business_entity: [
        { step_name: 'Business consultation', description: 'Discuss business structure, goals, and needs', required_documents: [], status: 'pending' },
        { step_name: 'Engagement letter', description: 'Send and sign service agreement', required_documents: ['Signed engagement letter'], status: 'pending' },
        { step_name: 'Entity formation docs', description: 'Collect articles of incorporation, EIN letter', required_documents: ['Articles of Incorporation', 'EIN letter'], status: 'pending' },
        { step_name: 'Financial setup', description: 'Set up accounting software access', required_documents: ['Bank statements', 'QB access'], status: 'pending' },
        { step_name: 'Client portal & access', description: 'Create portal and system access', required_documents: [], status: 'pending' },
        { step_name: 'Initial compliance review', description: 'Complete initial compliance requirements', required_documents: [], status: 'pending' },
      ],
    };

    const steps = WORKFLOW_STEPS[workflowType];
    const clientName = client.company_name
      || [client.name, client.last_name].filter(Boolean).join(' ')
      || 'New Client';

    // Check if a workflow already exists for this client to avoid duplicates
    const existing = await base44.asServiceRole.entities.OnboardingWorkflow.filter({ client_id });
    if (existing.length > 0) {
      return Response.json({ success: true, workflow_id: existing[0].id, message: 'Workflow already exists' });
    }

    // Create the workflow
    const workflow = await base44.asServiceRole.entities.OnboardingWorkflow.create({
      client_id,
      client_name: clientName,
      workflow_type: workflowType,
      status: 'in_progress',
      started_date: new Date().toISOString(),
      assigned_to_id: client.manager_id || '',
      assigned_to_name: client.manager_name || '',
      steps,
      completion_percentage: 0,
      notes: 'Auto-created from client intake form',
    });

    // Notify assigned manager
    if (client.manager_id) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: client.manager_id,
        type: 'onboarding_started',
        title: `New client onboarding started — ${clientName}`,
        message: `${clientName} completed their intake form. An onboarding workflow has been created. Please send the engagement letter next.`,
        link: `/Clients`,
        related_id: workflow.id,
        related_type: 'onboarding_workflow',
        priority: 'high',
      });
    }

    // Send enhanced welcome email with checklist summary
    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');
    const clientEmail = client.email;

    if (gmailUser && gmailPassword && clientEmail) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPassword },
      });

      const stepListHtml = steps
        .map((s, i) => `<li style="margin-bottom:6px"><strong>${i + 1}. ${s.step_name}</strong> — ${s.description}</li>`)
        .join('');

      const docsNeeded = steps
        .flatMap(s => s.required_documents)
        .filter(Boolean);
      const docListHtml = docsNeeded.length > 0
        ? `<p><strong>Documents we'll need from you:</strong></p><ul>${docsNeeded.map(d => `<li>${d}</li>`).join('')}</ul>`
        : '';

      await transporter.sendMail({
        from: `"${companyName}" <${gmailUser}>`,
        to: clientEmail,
        subject: `Welcome to ${companyName} — Your Onboarding Checklist`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#0EA5E9;color:white;padding:24px;border-radius:8px 8px 0 0;text-align:center">
              <h1 style="margin:0;font-size:24px">${companyName}</h1>
              <p style="margin:8px 0 0;opacity:0.9">Welcome aboard!</p>
            </div>
            <div style="background:#f9f9f9;padding:28px;border:1px solid #e0e0e0">
              <h2 style="color:#1e293b">Hi ${client.name || clientName},</h2>
              <p>Thank you for completing your registration with <strong>${companyName}</strong>. We're excited to work with you!</p>
              <p>Your account is being set up and our team will reach out shortly. Here's a quick overview of your onboarding journey:</p>

              <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0">
                <h3 style="margin-top:0;color:#0EA5E9">Your Onboarding Checklist</h3>
                <ol style="padding-left:20px">${stepListHtml}</ol>
              </div>

              ${docListHtml ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">${docListHtml}</div>` : ''}

              <p>Our team will guide you through each step. If you have any questions in the meantime, don't hesitate to reach out.</p>
              <p style="margin-top:24px">Best regards,<br><strong>${companyName}</strong></p>
            </div>
            <div style="text-align:center;padding:16px;font-size:12px;color:#94a3b8">
              Automated message from ${companyName}
            </div>
          </div>
        `,
      });

      console.log('✅ Enhanced welcome email sent to', clientEmail);
    }

    return Response.json({ success: true, workflow_id: workflow.id });

  } catch (error) {
    console.error('triggerClientOnboardingWorkflow error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});