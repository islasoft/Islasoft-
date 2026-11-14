import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Tax project types that require client document submission
const TAX_PROJECT_TYPES = [
  'individual_tax_1040',
  'business_tax_1120',
  's_corp_tax_1120s',
  'partnership_tax_1065',
  'nonprofit_tax_990',
  'amended_tax_1040x',
  'extension_filing',
  'estimated_tax_quarterly',
  'k1_preparation',
];

// Remind at these many days before due date
const REMINDER_DAYS = [30, 14, 7, 3, 1];

// Statuses that indicate the client hasn't submitted docs yet
const PENDING_STATUSES = ['not_started', 'waiting'];

function friendlyProjectType(type) {
  const map = {
    individual_tax_1040: 'Individual Tax Return (Form 1040)',
    business_tax_1120: 'Business Tax Return (Form 1120)',
    s_corp_tax_1120s: 'S-Corp Tax Return (Form 1120-S)',
    partnership_tax_1065: 'Partnership Tax Return (Form 1065)',
    nonprofit_tax_990: 'Nonprofit Tax Return (Form 990)',
    amended_tax_1040x: 'Amended Tax Return (Form 1040-X)',
    extension_filing: 'Tax Extension Filing',
    estimated_tax_quarterly: 'Estimated Quarterly Tax',
    k1_preparation: 'K-1 Preparation',
  };
  return map[type] || type.replace(/_/g, ' ');
}

function buildEmailBody(clientName, projectLabel, daysUntil, dueDate, companyName) {
  const urgency = daysUntil <= 3 ? 'URGENT: ' : '';
  const greeting = clientName ? `Dear ${clientName}` : 'Dear Client';
  return `
<p>${greeting},</p>

<p>This is a friendly reminder that your <strong>${projectLabel}</strong> is due on <strong>${dueDate}</strong> — that's <strong>${daysUntil} day${daysUntil !== 1 ? 's' : ''} away</strong>.</p>

<p>To ensure we can complete your filing on time, please make sure to submit all required documentation as soon as possible. Missing or delayed documents may affect our ability to file by the deadline.</p>

<p><strong>What to submit:</strong></p>
<ul>
  <li>All relevant income documents (W-2s, 1099s, K-1s, etc.)</li>
  <li>Receipts for deductible expenses</li>
  <li>Any prior-year tax notices or correspondence</li>
  <li>Any other documents requested by your preparer</li>
</ul>

<p>If you have already submitted your documents, please disregard this message. If you have any questions or need assistance, don't hesitate to reach out to us.</p>

<p>Thank you for your continued trust in us.</p>

<p>Best regards,<br/><strong>${companyName || 'Isla Accounting Corp'}</strong></p>
  `.trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Load Gmail connector for sending emails
    const { accessToken: gmailToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Get company settings for the sender name
    const settings = await base44.asServiceRole.entities.CompanySettings.list();
    const companyName = settings?.[0]?.company_name || 'Isla Accounting Corp';
    const fromEmail = settings?.[0]?.from_email;

    // Fetch all open tax projects
    const projects = await base44.asServiceRole.entities.Project.list();
    const taxProjects = projects.filter(p =>
      TAX_PROJECT_TYPES.includes(p.project_type) &&
      PENDING_STATUSES.includes(p.status) &&
      p.due_date &&
      p.client_id
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let emailsSent = 0;
    let skipped = 0;
    const results = [];

    for (const project of taxProjects) {
      // Use extension deadline if an extension was filed
      const effectiveDateStr = project.extension_filed && project.extension_deadline ? project.extension_deadline : project.due_date;
      const dueDate = new Date(effectiveDateStr);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      // Only send on exact reminder days, and not for overdue projects
      if (!REMINDER_DAYS.includes(daysUntil)) {
        skipped++;
        continue;
      }

      // Fetch the client
      const clients = await base44.asServiceRole.entities.Client.filter({ id: project.client_id });
      const client = clients?.[0];
      if (!client?.email) {
        skipped++;
        continue;
      }

      const clientName = client.contact_person || client.company_name ||
        `${client.name || ''} ${client.last_name || ''}`.trim();
      const projectLabel = friendlyProjectType(project.project_type);
      const hasExtension = project.extension_filed && project.extension_deadline;
      const displayDate = hasExtension ? project.extension_deadline : project.due_date;
      const extensionNote = hasExtension ? ' (Extended Deadline)' : '';
      const subject = `${daysUntil <= 3 ? '⚠️ URGENT: ' : ''}Action Required: ${projectLabel}${extensionNote} Due in ${daysUntil} Day${daysUntil !== 1 ? 's' : ''}`;
      const htmlBody = buildEmailBody(clientName, projectLabel, daysUntil, displayDate, companyName);

      // Send via Gmail API using the connector access token
      const emailRaw = [
        `To: ${client.email}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        htmlBody,
      ].join('\r\n');

      const encoded = btoa(unescape(encodeURIComponent(emailRaw)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gmailToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      });

      if (gmailRes.ok) {
        emailsSent++;
        results.push({ client: clientName, email: client.email, project: projectLabel, daysUntil });
        console.log(`Reminder sent to ${client.email} for ${projectLabel} (${daysUntil} days)`);
      } else {
        const err = await gmailRes.text();
        console.error(`Failed to email ${client.email}: ${err}`);
      }
    }

    return Response.json({
      success: true,
      emailsSent,
      skipped,
      taxProjectsChecked: taxProjects.length,
      results,
    });

  } catch (error) {
    console.error('checkTaxDeadlineReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});