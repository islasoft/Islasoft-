import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import jsPDF from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { engagementLetterId, projectId } = await req.json();
    if (!engagementLetterId) {
      return Response.json({ error: 'engagementLetterId is required' }, { status: 400 });
    }

    const letter = await base44.asServiceRole.entities.EngagementLetter.get(engagementLetterId);
    if (!letter) return Response.json({ error: 'Engagement letter not found' }, { status: 404 });

    if (letter.status !== 'approved') {
      return Response.json({ error: 'Letter must be approved by a CPA before sending' }, { status: 400 });
    }

    const client = await base44.asServiceRole.entities.Client.get(letter.client_id);
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const docusealApiKey = Deno.env.get('DOCUSEAL_API_KEY');
    if (!docusealApiKey) return Response.json({ error: 'DOCUSEAL_API_KEY not configured' }, { status: 500 });

    // Generate PDF from letter content
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Isla Accompting Corp', 20, 20);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('2325 Wiley St, Hollywood, FL 33020', 20, 27);
    doc.text('Phone: (305) 290-1145 | Email: info@islaccounting.com', 20, 32);
    doc.setLineWidth(0.5);
    doc.line(20, 36, 190, 36);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(letter.content || '', 170);
    let y = 44;
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 6;
    }
    if (y > 240) { doc.addPage(); y = 20; }
    y += 10;
    doc.setFont(undefined, 'bold');
    doc.text('Client Signature:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text('_______________________________', 20, y + 8);
    doc.text('Date: _________________________', 20, y + 18);

    const pdfBase64 = doc.output('datauristring').split(',')[1];

    const clientName = letter.client_name || client.company_name || [client.name, client.last_name].filter(Boolean).join(' ');
    const templateName = `Engagement Letter - ${clientName} - ${new Date().getFullYear()}`;

    const templateRes = await fetch('https://api.docuseal.com/templates/pdf', {
      method: 'POST',
      headers: { 'X-Auth-Token': docusealApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateName,
        documents: [{ name: `${templateName}.pdf`, file: pdfBase64 }],
        submitters: [{ name: 'Client', role: 'Signer' }],
      }),
    });

    if (!templateRes.ok) {
      const err = await templateRes.text();
      return Response.json({ error: `DocuSeal template creation failed: ${err}` }, { status: 500 });
    }

    const template = await templateRes.json();
    const templateId = template.id;

    const submissionRes = await fetch('https://api.docuseal.com/submissions', {
      method: 'POST',
      headers: { 'X-Auth-Token': docusealApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId,
        send_email: true,
        email_subject: `Engagement Letter between Isla Accompting Corp & ${clientName}`,
        submitters: [
          {
            role: 'Signer',
            name: clientName,
            email: letter.client_email || client.email,
          },
        ],
        metadata: {
          engagement_letter_id: engagementLetterId,
          client_id: letter.client_id,
          client_name: clientName,
          client_email: letter.client_email || client.email,
          reviewer_name: letter.reviewed_by_name || user.full_name,
          drive_folder_id: client.drive_folder_ids?.from_accountant || client.drive_folder_id || '',
          project_id: projectId || '',  // ← passed to webhook for project status update
        },
      }),
    });

    if (!submissionRes.ok) {
      const err = await submissionRes.text();
      return Response.json({ error: `DocuSeal submission creation failed: ${err}` }, { status: 500 });
    }

    const submission = await submissionRes.json();
    const signerSlug = submission.submitters?.[0]?.slug;
    const signerLink = signerSlug ? `https://docuseal.com/s/${signerSlug}` : null;

    await base44.asServiceRole.entities.EngagementLetter.update(engagementLetterId, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      docuseal_template_id: String(templateId),
      docuseal_submission_id: String(submission.id),
      docuseal_signer_link: signerLink,
    });

    // If a project was linked, mark it in_progress
    if (projectId) {
      await base44.asServiceRole.entities.Project.update(projectId, {
        status: 'in_progress',
      });
    }

    return Response.json({ success: true, submission_id: submission.id, signer_link: signerLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});