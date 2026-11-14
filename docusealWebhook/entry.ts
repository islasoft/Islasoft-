import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    const eventType = body.event_type || body.event;
    if (eventType !== 'form.completed' && eventType !== 'submission.completed') {
      return Response.json({ status: 'ignored', event: eventType });
    }

    const submission = body.data || body.submission;
    if (!submission) return Response.json({ status: 'no_submission_data' });

    const metadata = submission.metadata || {};
    const base44 = createClientFromRequest(req);

    // ── ENGAGEMENT LETTER FLOW ───────────────────────────────────
    if (metadata.engagement_letter_id) {
      const engagementLetterId = metadata.engagement_letter_id;
      const clientId = metadata.client_id;
      const clientName = metadata.client_name;
      const clientEmail = metadata.client_email;
      const driveFolderId = metadata.drive_folder_id;
      const projectId = metadata.project_id; // may be present

      const docusealApiKey = Deno.env.get('DOCUSEAL_API_KEY');
      const submissionRes = await fetch(`https://api.docuseal.com/submissions/${submission.id}`, {
        headers: { 'X-Auth-Token': docusealApiKey },
      });

      let signedDriveId = null;
      let signedDocumentUrl = null;

      if (submissionRes.ok) {
        const submissionData = await submissionRes.json();
        const documentUrl = submissionData.documents?.[0]?.url || submissionData.document_url;
        signedDocumentUrl = documentUrl;

        if (documentUrl && driveFolderId) {
          const pdfRes = await fetch(documentUrl);
          if (pdfRes.ok) {
            const pdfBuffer = await pdfRes.arrayBuffer();
            const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

            const signedFileName = `Engagement Letter - ${clientName} - Signed.pdf`;
            const boundary = '-------314159265358979323846';
            const metadataStr = JSON.stringify({
              name: signedFileName,
              mimeType: 'application/pdf',
              parents: [driveFolderId],
            });
            const encoder = new TextEncoder();
            const partHeader = encoder.encode(
              `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n` +
              `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`
            );
            const partFooter = encoder.encode(`\r\n--${boundary}--`);
            const pdfBytes = new Uint8Array(pdfBuffer);
            const uploadBody = new Uint8Array(partHeader.byteLength + pdfBytes.byteLength + partFooter.byteLength);
            uploadBody.set(partHeader, 0);
            uploadBody.set(pdfBytes, partHeader.byteLength);
            uploadBody.set(partFooter, partHeader.byteLength + pdfBytes.byteLength);

            const uploadRes = await fetch(
              'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': `multipart/related; boundary="${boundary}"`,
                },
                body: uploadBody,
              }
            );

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              signedDriveId = uploadData.id;
              signedDocumentUrl = uploadData.webViewLink || documentUrl;

              await base44.asServiceRole.entities.SharedDocument.create({
                client_id: clientId,
                client_name: clientName,
                document_name: signedFileName,
                document_type: 'engagement_letter',
                file_url: signedDocumentUrl,
                notes: 'Signed engagement letter — auto-attached from DocuSeal',
              });
            }
          }
        }
      }

      // Update EngagementLetter record
      await base44.asServiceRole.entities.EngagementLetter.update(engagementLetterId, {
        status: 'signed',
        signed_at: new Date().toISOString(),
        signed_document_drive_id: signedDriveId,
        signed_document_url: signedDocumentUrl,
      });

      // ── Update linked Project ──────────────────────────────────
      if (projectId) {
        await base44.asServiceRole.entities.Project.update(projectId, {
          status: 'in_progress',
          completion_percentage: 100,
        });

        // Mark the engagement letter task as completed if it exists
        const tasks = await base44.asServiceRole.entities.Task.filter({ project_id: projectId });
        for (const task of tasks) {
          const titleLower = (task.title || '').toLowerCase();
          if (titleLower.includes('engagement letter') || titleLower.includes('sign') || titleLower.includes('authorization')) {
            await base44.asServiceRole.entities.Task.update(task.id, {
              status: 'completed',
            });
          }
        }
      }

      // ── Update related OnboardingWorkflow ─────────────────────
      const workflows = await base44.asServiceRole.entities.OnboardingWorkflow.filter({ client_id: clientId });
      for (const wf of workflows) {
        if (wf.status === 'in_progress') {
          const steps = (wf.steps || []).map(step => {
            const name = (step.step_name || '').toLowerCase();
            if (name.includes('engagement') || name.includes('letter') || name.includes('sign')) {
              return { ...step, status: 'completed', completed_date: new Date().toISOString() };
            }
            return step;
          });
          const completed = steps.filter(s => s.status === 'completed').length;
          const pct = steps.length ? Math.round((completed / steps.length) * 100) : 0;
          await base44.asServiceRole.entities.OnboardingWorkflow.update(wf.id, { steps, completion_percentage: pct });
        }
      }

      if (clientEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: clientEmail,
          subject: 'Your Engagement Letter Has Been Signed',
          body: `<p>Dear ${clientName},</p><p>Thank you! Your signed engagement letter is now on file. We look forward to working with you.</p><p>Best regards,<br/>Isla Accompting Corp</p>`,
        });
      }

      return Response.json({ success: true, type: 'engagement_letter', signed_drive_id: signedDriveId });
    }

    // ── FORM 8879 / TAX AUTHORIZATION FLOW ──────────────────────
    const clientId = metadata.client_id;
    const year = metadata.year;
    const driveFileId = metadata.drive_file_id;
    const preparerEmail = metadata.preparer_email;
    const preparerName = metadata.preparer_name;
    const clientName = metadata.client_name;
    const clientEmail = metadata.client_email;
    const projectId = metadata.project_id; // may be present

    if (!driveFileId || !clientId) {
      return Response.json({ status: 'missing_metadata' });
    }

    const docusealApiKey = Deno.env.get('DOCUSEAL_API_KEY');
    const submissionRes = await fetch(`https://api.docuseal.com/submissions/${submission.id}`, {
      headers: { 'X-Auth-Token': docusealApiKey },
    });

    if (!submissionRes.ok) {
      return Response.json({ error: 'Failed to fetch submission from DocuSeal' }, { status: 500 });
    }

    const submissionData = await submissionRes.json();
    const documentUrl = submissionData.documents?.[0]?.url || submissionData.document_url;

    if (!documentUrl) {
      return Response.json({ error: 'No signed document URL found' }, { status: 500 });
    }

    const pdfRes = await fetch(documentUrl);
    if (!pdfRes.ok) return Response.json({ error: 'Failed to download signed PDF' }, { status: 500 });
    const pdfBuffer = await pdfRes.arrayBuffer();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    const fileMetaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=parents`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const fileMeta = await fileMetaRes.json();
    const parentFolderId = fileMeta.parents?.[0];

    const signedFileName = `8879 ${year} ${clientId} signed.pdf`;
    const boundary = '-------314159265358979323846';
    const metadataStr = JSON.stringify({
      name: signedFileName,
      mimeType: 'application/pdf',
      parents: parentFolderId ? [parentFolderId] : undefined,
    });
    const encoder = new TextEncoder();
    const metaBytes = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`
    );
    const closingBytes = encoder.encode(`\r\n--${boundary}--`);
    const pdfBytes = new Uint8Array(pdfBuffer);
    const multipart = new Uint8Array(metaBytes.length + pdfBytes.length + closingBytes.length);
    multipart.set(metaBytes, 0);
    multipart.set(pdfBytes, metaBytes.length);
    multipart.set(closingBytes, metaBytes.length + pdfBytes.length);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: multipart,
      }
    );

    // ── Update linked Project when 8879 is signed ─────────────
    if (projectId) {
      await base44.asServiceRole.entities.Project.update(projectId, {
        status: 'completed',
        completion_percentage: 100,
      });

      // Mark any signing tasks as completed
      const tasks = await base44.asServiceRole.entities.Task.filter({ project_id: projectId });
      for (const task of tasks) {
        const titleLower = (task.title || '').toLowerCase();
        if (titleLower.includes('8879') || titleLower.includes('sign') || titleLower.includes('authorization') || titleLower.includes('e-file')) {
          await base44.asServiceRole.entities.Task.update(task.id, { status: 'completed' });
        }
      }
    }

    if (clientEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: clientEmail,
        subject: `Your Form 8879 (${year}) Has Been Signed`,
        body: `<p>Dear ${clientName},</p><p>Thank you! Your Form 8879 for tax year ${year} has been successfully signed.</p><p>Best regards,<br/>${preparerName || 'Your Tax Preparer'}</p>`,
      });
    }

    if (preparerEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: preparerEmail,
        subject: `Form 8879 Signed - ${clientName} (${year})`,
        body: `<p>Hi ${preparerName || 'there'},</p><p>${clientName} has signed their Form 8879 for tax year ${year}. The signed document has been saved to Google Drive as: <strong>${signedFileName}</strong></p>`,
      });
    }

    return Response.json({ success: true, type: 'form_8879', file: signedFileName });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});