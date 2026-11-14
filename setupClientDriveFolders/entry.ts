import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || (!['admin', 'cpa', 'senior_staff'].includes(user.team_category) && user.role !== 'admin')) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { client_id } = await req.json();

        // Get client details
        const client = await base44.entities.Client.get(client_id);
        if (!client) {
            return Response.json({ error: 'Client not found' }, { status: 404 });
        }

        // Get Google Drive access token
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

        // Get root folder ID from CompanySettings
        const settingsList = await base44.asServiceRole.entities.CompanySettings.list('created_date');
        const settings = settingsList[0];
        const rootFolderId = settings?.drive_root_folder_id;

        // Build main client folder name: e.g. "I08 - Sandy Lopez Oliva"
        // Format client number: I-008 → I08 (remove dash, strip leading zeros to 2-digit minimum)
        const clientName = client.company_name || `${client.name || ''} ${client.last_name || ''}`.trim() || 'Unknown';
        const rawNum = client.client_number || client_id;
        const numFormatted = rawNum.replace(/^([A-Z]+)-0*(\d+)$/, (_, prefix, num) => `${prefix}${String(parseInt(num)).padStart(2, '0')}`);
        const folderName = `${numFormatted} - ${clientName}`;

        // Create main client folder (inside root folder if set)
        const mainFolderBody = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
        };
        if (rootFolderId) {
            mainFolderBody.parents = [rootFolderId];
        }

        const mainFolderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mainFolderBody),
        });

        const mainFolder = await mainFolderResponse.json();
        if (!mainFolderResponse.ok) {
            return Response.json({ error: 'Failed to create main folder', details: mainFolder }, { status: 500 });
        }

        // Create 3 subfolders
        const subfolders = [
            { name: 'For Accountant', key: 'for_accountant', role: 'writer' },
            { name: 'From Accountant', key: 'from_accountant', role: 'reader' },
            { name: 'Permanent', key: 'permanent', role: null },
        ];

        const folderIds = { main: mainFolder.id };

        for (const subfolder of subfolders) {
            const subfolderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: subfolder.name,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [mainFolder.id],
                }),
            });

            const subfolderData = await subfolderResponse.json();
            if (!subfolderResponse.ok) {
                return Response.json({ error: `Failed to create ${subfolder.name} folder`, details: subfolderData }, { status: 500 });
            }

            folderIds[subfolder.key] = subfolderData.id;

            // Share folder with client if they have email
            if (subfolder.role && client.email) {
                await fetch(`https://www.googleapis.com/drive/v3/files/${subfolderData.id}/permissions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: 'user',
                        role: subfolder.role,
                        emailAddress: client.email,
                    }),
                });
            }
        }

        // Update client record with folder IDs
        await base44.asServiceRole.entities.Client.update(client_id, {
            drive_folder_id: mainFolder.id,
            drive_folder_ids: folderIds,
        });

        return Response.json({
            success: true,
            folders: folderIds,
            message: 'Client folders created successfully',
        });
    } catch (error) {
        console.error('Setup folders error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});