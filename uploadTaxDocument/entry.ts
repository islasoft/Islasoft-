import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const client_id = formData.get('client_id');
        const project_id = formData.get('project_id');   // optional
        const project_name = formData.get('project_name') || 'General Documents';
        const file = formData.get('file');

        if (!file || !client_id) {
            return Response.json({ error: 'Missing required fields: client_id and file' }, { status: 400 });
        }

        // Load client to get Drive folder IDs
        const client = await base44.asServiceRole.entities.Client.get(client_id);
        if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

        // Permission check: staff or the client owner
        const isStaff = ['admin', 'cpa', 'senior_staff', 'staff'].includes(user.team_category) || user.role === 'admin';
        const isClientOwner = user.email === client.email || (client.user_id && user.id === client.user_id);
        if (!isStaff && !isClientOwner) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (!client.drive_folder_ids?.for_accountant) {
            return Response.json({ error: 'Google Drive folders not set up for this client. Please ask your accountant to set them up first.' }, { status: 400 });
        }

        const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
        const parentFolderId = client.drive_folder_ids.for_accountant;

        // --- Find or create a subfolder named after the project ---
        const safeProjectName = project_name.replace(/[\/\\:*?"<>|]/g, '-').trim() || 'General Documents';

        // Search for existing subfolder with that name under "For Accountant"
        const searchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(safeProjectName)}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const searchData = await searchRes.json();
        let projectFolderId;

        if (searchData.files && searchData.files.length > 0) {
            projectFolderId = searchData.files[0].id;
        } else {
            // Create the project subfolder
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: safeProjectName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentFolderId],
                }),
            });
            const created = await createRes.json();
            if (!createRes.ok) return Response.json({ error: 'Failed to create project folder', details: created }, { status: 500 });
            projectFolderId = created.id;
        }

        // --- Upload file into the project subfolder ---
        const fileBytes = await file.arrayBuffer();
        const boundary = '-------taxdoc314159265';
        const metadataStr = JSON.stringify({ name: file.name, parents: [projectFolderId] });
        const encoder = new TextEncoder();

        const partHeader = encoder.encode(
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n` +
            `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`
        );
        const partFooter = encoder.encode(`\r\n--${boundary}--`);

        const body = new Uint8Array(partHeader.byteLength + fileBytes.byteLength + partFooter.byteLength);
        body.set(partHeader, 0);
        body.set(new Uint8Array(fileBytes), partHeader.byteLength);
        body.set(partFooter, partHeader.byteLength + fileBytes.byteLength);

        const uploadRes = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body,
            }
        );

        const uploadResult = await uploadRes.json();
        if (!uploadRes.ok) {
            return Response.json({ error: 'Failed to upload file to Drive', details: uploadResult }, { status: 500 });
        }

        // --- Log to SharedDocument entity ---
        const clientDisplayName = client.company_name || `${client.name || ''} ${client.last_name || ''}`.trim();
        await base44.asServiceRole.entities.SharedDocument.create({
            client_id,
            client_name: clientDisplayName,
            document_name: file.name,
            document_type: 'other',
            file_url: uploadResult.webViewLink,
            uploaded_by_id: user.id,
            uploaded_by_name: user.full_name || user.email,
            notes: project_id ? `Linked to project: ${project_name}` : 'General document upload',
        });

        return Response.json({
            success: true,
            file: uploadResult,
            project_folder_id: projectFolderId,
        });
    } catch (error) {
        console.error('uploadTaxDocument error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});