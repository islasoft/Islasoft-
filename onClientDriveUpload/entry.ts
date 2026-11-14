import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    // Acknowledge the sync ping from Google Drive
    const state = body.data?._provider_meta?.['x-goog-resource-state'];
    if (state === 'sync') {
      return Response.json({ status: 'sync_ack' });
    }

    // Get Drive access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Load the saved page token from entity
    const existing = await base44.asServiceRole.entities.SyncState.list();
    let syncRecord = existing.length > 0 ? existing[0] : null;

    if (!syncRecord) {
      // First run: initialize the page token
      const tokenRes = await fetch(
        'https://www.googleapis.com/drive/v3/changes/startPageToken',
        { headers: authHeader }
      );
      const { startPageToken } = await tokenRes.json();
      await base44.asServiceRole.entities.SyncState.create({
        page_token: startPageToken,
        last_synced: new Date().toISOString(),
      });
      return Response.json({ status: 'initialized' });
    }

    // Fetch incremental changes
    const baseUrl = `https://www.googleapis.com/drive/v3/changes?fields=changes(file(id,name,mimeType,webViewLink,owners),kind),newStartPageToken,nextPageToken`;
    let changesUrl = baseUrl + `&pageToken=${syncRecord.page_token}`;
    const allChanges = [];
    let newPageToken = null;

    while (changesUrl) {
      const changesRes = await fetch(changesUrl, { headers: authHeader });
      if (!changesRes.ok) {
        const err = await changesRes.text();
        console.error('Drive API error:', err);
        return Response.json({ status: 'api_error', detail: err });
      }
      const page = await changesRes.json();
      allChanges.push(...(page.changes || []));
      if (page.newStartPageToken) newPageToken = page.newStartPageToken;
      changesUrl = page.nextPageToken
        ? baseUrl + `&pageToken=${page.nextPageToken}`
        : null;
    }

    // Filter to only new file uploads (not folders, not deletions)
    const newFiles = allChanges.filter(
      (c) => c.file && c.file.mimeType !== 'application/vnd.google-apps.folder'
    );

    if (newFiles.length > 0) {
      // Get company settings for sender email
      const settings = await base44.asServiceRole.entities.CompanySettings.list();
      const company = settings[0] || {};
      const fromEmail = company.from_email || Deno.env.get('GMAIL_USER');
      const toEmail = Deno.env.get('GMAIL_USER'); // notify the firm's admin email

      // Try to match file to a client by checking SharedDocument records
      for (const change of newFiles) {
        const file = change.file;
        const fileName = file.name || 'Unknown file';
        const fileLink = file.webViewLink || '#';

        // Send email notification via the built-in integration
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: toEmail,
          from_name: company.company_name || 'IslaSoft',
          subject: `📂 New Client Document Upload: ${fileName}`,
          body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #1E293B; padding: 20px; border-radius: 8px 8px 0 0;">
    <h2 style="color: white; margin: 0;">New Document Uploaded</h2>
  </div>
  <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    <p style="color: #475569; font-size: 14px;">A new file has been uploaded to a client's Google Drive portal:</p>
    
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>📄 File Name:</strong> ${fileName}</p>
      <p style="margin: 0 0 8px 0;"><strong>📁 Type:</strong> ${file.mimeType || 'Unknown'}</p>
      <p style="margin: 0;"><strong>🕒 Detected:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
    </div>

    ${fileLink !== '#' ? `<a href="${fileLink}" style="display: inline-block; background: #0EA5E9; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px;">View File in Drive →</a>` : ''}
    
    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This is an automated notification from ${company.company_name || 'IslaSoft Practice Manager'}.</p>
  </div>
</div>
          `.trim(),
        });

        console.log(`Notified about new upload: ${fileName}`);
      }
    }

    // Save the updated page token
    if (newPageToken) {
      await base44.asServiceRole.entities.SyncState.update(syncRecord.id, {
        page_token: newPageToken,
        last_synced: new Date().toISOString(),
      });
    }

    return Response.json({ status: 'ok', files_detected: newFiles.length });
  } catch (error) {
    console.error('Handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});