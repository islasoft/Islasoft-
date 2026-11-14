import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isManager = user.role === 'admin' || user.team_category === 'cpa' || user.team_category === 'senior_staff';
    if (!isManager) {
      return Response.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { file_url, client_type } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'No file URL provided' }, { status: 400 });
    }

    // Fetch the CSV file
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to fetch file' }, { status: 400 });
    }

    const csvText = await fileResponse.text();
    const lines = csvText.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return Response.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 });
    }

    // Parse CSV
    const headers = lines[0].split(',').map(h => h.trim());
    const clients = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const client = {};
      
      headers.forEach((header, index) => {
        const value = values[index];
        if (value) {
          // Convert numeric fields
          if (header === 'dependents') {
            const num = parseFloat(value);
            client[header] = isNaN(num) ? null : num;
          } else {
            client[header] = value;
          }
        }
      });

      // Only add if has email
      if (client.email) {
        clients.push(client);
      }
    }

    return Response.json({ 
      success: true,
      clients: clients,
      count: clients.length
    });
  } catch (error) {
    console.error('Parse error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});