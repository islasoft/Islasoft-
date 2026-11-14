import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Structure: Drive / Client Folder / From Accountant / Year / 8879_{year}_{clientCode}.pdf
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { client_id, year } = await req.json();

        if (!client_id || !year) {
            return Response.json({ error: 'Missing client_id or year' }, { status: 400 });
        }

        const client = await base44.asServiceRole.entities.Client.get(client_id);
        if (!client || !client.drive_folder_ids?.from_accountant) {
            return Response.json({ error: 'Client "From Accountant" folder not set up' }, { status: 404 });
        }

        const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
        const fromAccountantFolderId = client.drive_folder_ids.from_accountant;

        // Step 1: Find the year subfolder inside "From Accountant"
        const yearFolderRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${fromAccountantFolderId}'+in+parents+and+name='${year}'+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const yearFolderData = await yearFolderRes.json();
        const yearFolder = yearFolderData.files?.[0];

        if (!yearFolder) {
            return Response.json({ error: `No folder found for year ${year} inside "From Accountant"` }, { status: 404 });
        }

        // Step 2: Find the 8879 file inside the year folder
        // Expected name pattern: 8879_{year}_{clientCode} (case-insensitive contains check)
        const clientCode = (client.client_number || '').replace(/[^a-zA-Z0-9]/g, '');
        const filesRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${yearFolder.id}'+in+parents+and+trashed=false+and+name+contains+'8879'&fields=files(id,name,mimeType,webViewLink,size,modifiedTime)&orderBy=modifiedTime+desc`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const filesData = await filesRes.json();
        const allFiles = filesData.files || [];

        // Prefer a file that matches 8879_{year}_{clientCode}, fall back to any 8879 file
        const targetName = `8879_${year}_${clientCode}`.toLowerCase();
        let match = allFiles.find(f => f.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').includes(targetName));
        if (!match) {
            // Fallback: any file containing "8879"
            match = allFiles.find(f => f.name.toLowerCase().includes('8879'));
        }

        return Response.json({
            success: true,
            yearFolderId: yearFolder.id,
            file: match || null,
            allFiles,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});