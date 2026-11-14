import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DOC_TYPE_LABELS = {
  tax_return: 'Tax Return',
  financial_statement: 'Financial Statement',
  engagement_letter: 'Engagement Letter',
  invoice: 'Invoice',
  other: 'Document',
};

function buildEmail(toEmail, clientName, docName, docType, uploadedBy, companyName) {
  const docLabel = DOC_TYPE_LABELS[docType] || 'Document';
  const subject = `New Document Available for Your Review — ${companyName}`;

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
              A new document has been uploaded to your account and is ready for your review.
            </p>
            <!-- Document Card -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
              <tr>
                <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #0EA5E9;border-radius:6px;padding:20px 24px;">
                  <p style="margin:0 0 4px;color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Document Type</p>
                  <p style="margin:0 0 12px;color:#0F172A;font-size:15px;font-weight:600;">${docLabel}</p>
                  <p style="margin:0 0 4px;color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Document Name</p>
                  <p style="margin:0 0 12px;color:#0F172A;font-size:15px;">${docName}</p>
                  ${uploadedBy ? `
                  <p style="margin:0 0 4px;color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Uploaded By</p>
                  <p style="margin:0;color:#0F172A;font-size:15px;">${uploadedBy}</p>` : ''}
                </td>
              </tr>
            </table>
            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
              Please log in to your client portal to view and download this document. If you have any questions, feel free to contact our team.
            </p>
            <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">
              Thank you,<br><strong>${companyName}</strong>
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
    `Dear ${clientName},\n\nA new ${docLabel} "${docName}" has been uploaded for your review.\n\nPlease log in to your client portal to access it.\n\nThank you,\n${companyName}`,
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

    const doc = body.data;
    if (!doc?.client_id || !doc?.document_name) {
      return Response.json({ skipped: true, reason: 'Missing document data' });
    }

    // Fetch the client
    const client = await base44.asServiceRole.entities.Client.get(doc.client_id);
    if (!client?.email) {
      return Response.json({ skipped: true, reason: 'No client email' });
    }

    // Fetch company settings for branding
    const settings = await base44.asServiceRole.entities.CompanySettings.list();
    const companyName = settings?.[0]?.company_name || 'IslaSoft';

    const clientName = client.company_name || `${client.name || ''} ${client.last_name || ''}`.trim() || 'Client';

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const encodedMessage = buildEmail(
      client.email,
      clientName,
      doc.document_name,
      doc.document_type,
      doc.uploaded_by_name,
      companyName
    );

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

    return Response.json({ success: true, sentTo: client.email, document: doc.document_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});