import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import nodemailer from 'npm:nodemailer@6.9.7';

Deno.serve(async (req) => {
  try {
    const { token, data, projectData } = await req.json();

    if (!token || !data) {
      return Response.json({ error: 'Missing token or data' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const clients = await base44.asServiceRole.entities.Client.filter({ registration_token: token });

    if (!clients || clients.length === 0) {
      return Response.json({ error: 'Invalid token' }, { status: 404 });
    }

    const client = clients[0];

    // SECURITY: Explicit field allowlist — never trust client-supplied field names
    const ALLOWED_FIELDS = [
      'name', 'middle_name', 'last_name', 'company_name', 'contact_person',
      'email', 'phone', 'address', 'city', 'state', 'zip_code',
      'ein', 'incorporated_as', 'taxed_as', 'year_end',
      'ssn', 'filing_status', 'dependents', 'dl_id', 'dl_issued', 'dl_expire', 'dob',
      'bank_name', 'bank_routing', 'bank_account', 'account_type',
      'notes',
    ];

    const updateData = { status: 'pending' };
    for (const field of ALLOWED_FIELDS) {
      if (data[field] !== undefined && data[field] !== '') {
        updateData[field] = data[field];
      }
    }

    if (updateData.dependents !== undefined) {
      updateData.dependents = parseInt(updateData.dependents) || 0;
    }

    await base44.asServiceRole.entities.Client.update(client.id, updateData);

    // Send confirmation email to client
    try {
      const gmailUser = Deno.env.get('GMAIL_USER');
      const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');
      const companySettings = await base44.asServiceRole.entities.CompanySettings.list();
      const companyName = companySettings[0]?.company_name || 'Isla Accounting Corp';
      
      if (gmailUser && gmailPassword && updateData.email) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: gmailUser, pass: gmailPassword },
        });

        const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0EA5E9; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${companyName}</h1>
    </div>
    <div class="content">
      <h2>Welcome to ${companyName}!</h2>
      <p>Hi ${updateData.name || 'there'},</p>
      <p>Thank you for completing your registration. Your account is now active and ready to go!</p>
      <p>Our team will review your information and reach out shortly to discuss your accounting needs and get started on your project.</p>
      <p>If you have any questions in the meantime, feel free to contact us anytime.</p>
      <p>Best regards,<br><strong>${companyName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message from ${companyName}</p>
    </div>
  </div>
</body>
</html>
        `.trim();

        await transporter.sendMail({
          from: `"${companyName}" <${gmailUser}>`,
          to: updateData.email,
          subject: `Welcome to ${companyName}!`,
          html: emailBody,
        });

        console.log('✅ Onboarding confirmation sent to:', updateData.email);
      }
    } catch (emailError) {
      console.error('Email send failed (non-fatal):', emailError.message);
    }

    // Create project if service was selected
    if (projectData && projectData.project_type) {
      const PROJECT_CATEGORY_MAP = {
        individual_tax_1040: 'tax_compliance',
        business_tax_1120: 'tax_compliance',
        s_corp_tax_1120s: 'tax_compliance',
        partnership_tax_1065: 'tax_compliance',
        nonprofit_tax_990: 'tax_compliance',
        amended_tax_1040x: 'tax_compliance',
        extension_filing: 'tax_compliance',
        estimated_tax_quarterly: 'tax_compliance',
        tax_planning_session: 'tax_compliance',
        entity_formation: 'entity_structuring',
        entity_conversion: 'entity_structuring',
        monthly_bookkeeping: 'bookkeeping_accounting',
        quarterly_bookkeeping: 'bookkeeping_accounting',
        annual_bookkeeping: 'bookkeeping_accounting',
        financial_statement_prep: 'bookkeeping_accounting',
        payroll_setup: 'payroll_employment',
        payroll_processing: 'payroll_employment',
        '1099_preparation': 'payroll_employment',
        irs_notice_review: 'irs_representation',
        penalty_abatement: 'irs_representation',
        cash_flow_analysis: 'advisory_cfo',
        cfo_services: 'advisory_cfo',
      };

      const clientName = updateData.company_name
        || [updateData.name, updateData.last_name].filter(Boolean).join(' ')
        || client.company_name
        || [client.name, client.last_name].filter(Boolean).join(' ')
        || 'New Client';

      const project_category = projectData.project_category
        || PROJECT_CATEGORY_MAP[projectData.project_type]
        || 'tax_compliance';

      // Default due date: 30 days from now if not specified
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 30);
      const due_date = projectData.due_date || defaultDueDate.toISOString().split('T')[0];

      await base44.asServiceRole.entities.Project.create({
        client_id: client.id,
        client_name: clientName,
        project_type: projectData.project_type,
        project_category,
        description: projectData.description || '',
        due_date,
        status: 'not_started',
        priority: 'medium',
        // assigned_to_id will be set by manager later
        assigned_to_id: client.manager_id || '',
        assigned_to_name: client.manager_name || '',
      });
    }

    // Upload any files from intake form to client's Google Drive "For Accountant" folder
    const uploadedFiles = [];
    if (data.uploaded_files && Array.isArray(data.uploaded_files) && data.uploaded_files.length > 0) {
      try {
        const freshClient = await base44.asServiceRole.entities.Client.get(client.id);
        const forAccountantFolderId = freshClient?.drive_folder_ids?.for_accountant;

        if (forAccountantFolderId) {
          const { accessToken: driveToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

          for (const fileUrl of data.uploaded_files) {
            try {
              // Fetch the file from its URL
              const fileRes = await fetch(fileUrl);
              if (!fileRes.ok) continue;

              const fileBytes = await fileRes.arrayBuffer();
              const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';
              const fileName = fileUrl.split('/').pop().split('?')[0] || 'intake-document';

              // Upload to Drive via multipart
              const boundary = '-------intakeupload314159';
              const metadataStr = JSON.stringify({ name: fileName, parents: [forAccountantFolderId] });
              const encoder = new TextEncoder();
              const partHeader = encoder.encode(
                `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n` +
                `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`
              );
              const partFooter = encoder.encode(`\r\n--${boundary}--`);
              const body = new Uint8Array(partHeader.byteLength + fileBytes.byteLength + partFooter.byteLength);
              body.set(partHeader, 0);
              body.set(new Uint8Array(fileBytes), partHeader.byteLength);
              body.set(partFooter, partHeader.byteLength + fileBytes.byteLength);

              const uploadRes = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${driveToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                  },
                  body,
                }
              );
              const uploadResult = await uploadRes.json();
              if (uploadRes.ok) {
                uploadedFiles.push({ name: fileName, driveId: uploadResult.id, url: uploadResult.webViewLink });
                // Log to SharedDocument
                const clientName = client.company_name || `${client.name || ''} ${client.last_name || ''}`.trim();
                await base44.asServiceRole.entities.SharedDocument.create({
                  client_id: client.id,
                  client_name: clientName,
                  document_name: fileName,
                  document_type: 'other',
                  file_url: uploadResult.webViewLink,
                  uploaded_by_id: 'system',
                  uploaded_by_name: 'Client Intake Form',
                  notes: 'Uploaded via client intake form',
                });
              }
            } catch (fileErr) {
              console.error('File upload error (non-fatal):', fileErr.message);
            }
          }
          console.log(`✅ Uploaded ${uploadedFiles.length} intake files to Drive for client ${client.id}`);
        } else {
          console.warn('⚠️ No Drive folder found for client, skipping file upload. Folder setup may not have run yet.');
        }
      } catch (driveErr) {
        console.error('Drive file sync error (non-fatal):', driveErr.message);
      }
    }

    // Auto-trigger the onboarding workflow (async, non-blocking)
    try {
      await base44.asServiceRole.functions.invoke('triggerClientOnboardingWorkflow', { client_id: client.id });
      console.log('✅ Onboarding workflow triggered for client', client.id);
    } catch (wfErr) {
      console.error('Workflow trigger failed (non-fatal):', wfErr.message);
    }

    return Response.json({ success: true, filesUploadedToDrive: uploadedFiles.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});