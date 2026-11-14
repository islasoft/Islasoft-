import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending Review',
};

function buildEmail(toEmail, clientName, newStatus, companyName) {
  const statusLabel = STATUS_LABELS[newStatus] || newStatus;
  const subject = `Your Registration Status Has Been Updated — ${companyName}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f7f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1E293B;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${companyName}</h1>
            <p style="margin:4px 0 0;color:#94A3B8;font-size:13px;">Practice Manager</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear ${clientName},</p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              We wanted to let you know that your registration status with our firm has been updated.
            </p>
            <!-- Status Badge -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:6px;padding:16px 24px;">
                  <p style="margin:0;color:#475569;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">New Status</p>
                  <p style="margin:6px 0 0;color:#0EA5E9;font-size:20px;font-weight:700;">${statusLabel}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
              If you have any questions about this update or need further assistance, please don't hesitate to reach out to our team.
            </p>
            <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">
              Thank you for choosing ${companyName}.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:24px 40px;">
            <p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.6;">
              This is an automated notification from ${companyName}. Please do not reply directly to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Build RFC 2822 message
  const boundary = `boundary_${Date.now()}`;
  const raw = [
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    `Dear ${clientName},\n\nYour registration status has been updated to: ${statusLabel}.\n\nIf you have questions, please contact our team.\n\nThank you,\n${companyName}`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    html,
    `--${boundary}--`,
  ].join('\r\n');

  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const clientId = body.event?.entity_id;
    const newStatus = body.data?.status;
    const oldStatus = body.old_data?.status;

    if (!clientId || !newStatus || newStatus === oldStatus) {
      return Response.json({ skipped: true, reason: 'No status change' });
    }

    // Fetch client record
    const client = await base44.asServiceRole.entities.Client.get(clientId);
    if (!client?.email) {
      return Response.json({ skipped: true, reason: 'No client email' });
    }

    // Fetch company settings for branding
    const settings = await base44.asServiceRole.entities.CompanySettings.list();
    const companyName = settings?.[0]?.company_name || 'IslaSoft';

    const clientName = client.company_name || `${client.name || ''} ${client.last_name || ''}`.trim() || 'Client';

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const encodedMessage = buildEmail(client.email, clientName, newStatus, companyName);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 500 });
    }

    return Response.json({ success: true, sentTo: client.email, newStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});