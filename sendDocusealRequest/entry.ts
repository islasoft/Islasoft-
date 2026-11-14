import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clientId, clientName, clientEmail, driveFileId, driveFileName, year, preparerEmail, preparerName, projectId } = await req.json();

    if (!clientEmail || !driveFileId) {
      return Response.json({ error: 'Missing required fields: clientEmail, driveFileId' }, { status: 400 });
    }

    // Download the PDF from Google Drive
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!driveRes.ok) {
      const err = await driveRes.text();
      return Response.json({ error: `Failed to download file from Drive: ${err}` }, { status: 500 });
    }

    const pdfBuffer = await driveRes.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    const docusealApiKey = Deno.env.get('DOCUSEAL_API_KEY');

    // Create a template from the PDF
    const templateRes = await fetch('https://api.docuseal.com/templates/pdf', {
      method: 'POST',
      headers: { 'X-Auth-Token': docusealApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Form 8879 - ${clientName} - ${year}`,
        documents: [{ name: driveFileName || `8879_${year}.pdf`, file: pdfBase64 }],
        submitters: [{ name: 'Client', role: 'Signer' }],
      }),
    });

    if (!templateRes.ok) {
      const err = await templateRes.text();
      return Response.json({ error: `Failed to create DocuSeal template: ${err}` }, { status: 500 });
    }

    const template = await templateRes.json();
    const templateId = template.id;

    const submissionRes = await fetch('https://api.docuseal.com/submissions', {
      method: 'POST',
      headers: { 'X-Auth-Token': docusealApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId,
        send_email: true,
        submitters: [{ role: 'Signer', name: clientName, email: clientEmail }],
        metadata: {
          client_id: clientId,
          year: year,
          drive_file_id: driveFileId,
          preparer_email: preparerEmail,
          preparer_name: preparerName,
          client_name: clientName,
          client_email: clientEmail,
          project_id: projectId || '',  // ← passed to webhook for project status update
        },
      }),
    });

    if (!submissionRes.ok) {
      const err = await submissionRes.text();
      return Response.json({ error: `Failed to create DocuSeal submission: ${err}` }, { status: 500 });
    }

    const submission = await submissionRes.json();

    // Mark project as in_progress when 8879 is sent
    if (projectId) {
      await base44.asServiceRole.entities.Project.update(projectId, { status: 'in_progress' });
    }

    return Response.json({ success: true, submission });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});