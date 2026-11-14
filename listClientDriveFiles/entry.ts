import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { client_id, folder_type, folder_id } = await req.json();

        // Get client details
        const client = await base44.asServiceRole.entities.Client.get(client_id);
        if (!client || !client.drive_folder_ids) {
            return Response.json({ error: 'Client folders not set up' }, { status: 404 });
        }

        // Check permissions
        const isStaff = ['admin', 'cpa', 'senior_staff', 'staff'].includes(user.team_category) || user.role === 'admin';
        const isClientOwner = user.email === client.email;

        if (folder_type === 'permanent' && !isStaff) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (!isStaff && !isClientOwner) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Allow navigating into a subfolder by passing folder_id directly
        const folderId = folder_id || client.drive_folder_ids[folder_type];
        if (!folderId) {
            return Response.json({ error: 'Folder not found' }, { status: 404 });
        }

        // Get Google Drive access token
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

        // List files AND folders in the target folder
        const listResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,createdTime,modifiedTime,size,webViewLink)&orderBy=folder,modifiedTime+desc`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        const listResult = await listResponse.json();
        if (!listResponse.ok) {
            return Response.json({ error: 'Failed to list files', details: listResult }, { status: 500 });
        }

        return Response.json({
            success: true,
            files: listResult.files || [],
        });
    } catch (error) {
        console.error('List files error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});