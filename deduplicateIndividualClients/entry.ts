import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { dryRun = true } = await req.json().catch(() => ({ dryRun: true }));

    // Fetch all individual clients (client_number starts with I-)
    const allClients = await base44.asServiceRole.entities.Client.filter({
      status: { $in: ['active', 'pending', 'inactive'] }
    }, '-created_date', 2000);

    const individualClients = allClients.filter(c => 
      c.client_number && c.client_number.startsWith('I-')
    );

    // Group by a unique key: email OR (name + last_name + dob)
    const seen = new Map();
    const toDelete = [];

    // Sort so we keep the oldest record (lowest client_number or earliest created)
    const sorted = [...individualClients].sort((a, b) => {
      // Keep the one with lower client_number (older)
      if (a.client_number && b.client_number) {
        return a.client_number.localeCompare(b.client_number, undefined, { numeric: true });
      }
      return new Date(a.created_date) - new Date(b.created_date);
    });

    for (const client of sorted) {
      // Build dedup keys
      const emailKey = client.email ? `email:${client.email.toLowerCase().trim()}` : null;
      const nameKey = (client.name && client.last_name)
        ? `name:${client.name.toLowerCase().trim()}|${client.last_name.toLowerCase().trim()}|${client.dob || ''}`
        : null;
      const ssnKey = client.ssn ? `ssn:${client.ssn.trim()}` : null;

      const keys = [emailKey, nameKey, ssnKey].filter(Boolean);
      let isDuplicate = false;

      for (const key of keys) {
        if (seen.has(key)) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        toDelete.push(client);
      } else {
        // Mark all keys as seen
        for (const key of keys) {
          seen.set(key, client.id);
        }
      }
    }

    let deletedCount = 0;
    if (!dryRun && toDelete.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize);
        for (const client of batch) {
          await base44.asServiceRole.entities.Client.delete(client.id);
          deletedCount++;
        }
        // Small delay between batches to avoid rate limits
        if (i + batchSize < toDelete.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      total_individual_clients: individualClients.length,
      duplicates_found: toDelete.length,
      duplicates_deleted: dryRun ? 0 : deletedCount,
      duplicates: toDelete.map(c => ({
        id: c.id,
        client_number: c.client_number,
        name: `${c.name || ''} ${c.last_name || ''}`.trim(),
        email: c.email,
        created_date: c.created_date
      }))
    });

  } catch (error) {
    console.error('Deduplication error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});