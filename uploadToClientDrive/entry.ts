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
        const folder_type = formData.get('folder_type'); // 'for_accountant', 'from_accountant', 'permanent'
        const file = formData.get('file');

        if (!file || !client_id || !folder_type) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get client details
        const client = await base44.asServiceRole.entities.Client.get(client_id);
        if (!client || !client.drive_folder_ids) {
            return Response.json({ error: 'Client folders not set up' }, { status: 404 });
        }

        // Check permissions
        const isStaff = ['admin', 'cpa', 'senior_staff', 'staff'].includes(user.team_category) || user.role === 'admin';
        const isClientOwner = user.email === client.email;

        if ((folder_type === 'from_accountant' || folder_type === 'permanent') && !isStaff) {
            return Response.json({ error: 'Only staff can upload to this folder' }, { status: 403 });
        }

        if (folder_type === 'for_accountant' && !isStaff && !isClientOwner) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const folderId = client.drive_folder_ids[folder_type];
        if (!folderId) {
            return Response.json({ error: 'Folder not found' }, { status: 404 });
        }

        // Get Google Drive access token
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

        // Read file bytes
        const fileBytes = await file.arrayBuffer();
        const boundary = '-------314159265358979323846';

        // Build multipart body correctly using Uint8Array to preserve binary data
        const metadataStr = JSON.stringify({ name: file.name, parents: [folderId] });
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

        const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,modifiedTime,size,webViewLink', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
        });

        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) {
            return Response.json({ error: 'Failed to upload file', details: uploadResult }, { status: 500 });
        }

        return Response.json({
            success: true,
            file: uploadResult,
            message: 'File uploaded successfully',
        });
    } catch (error) {
        console.error('Upload error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});