import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, from_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    // Get Gmail access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Get sender email from Gmail profile
    const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const profile = await profileRes.json();
    const senderEmail = profile.emailAddress;
    const senderName = from_name || 'ISLA Accounting Corp';

    // Build RFC 2822 email
    const emailLines = [
      `From: ${senderName} <${senderEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      body
    ];
    const raw = emailLines.join('\r\n');
    const encoded = btoa(unescape(encodeURIComponent(raw)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.json();
      return Response.json({ error: err.error?.message || 'Failed to send email' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});