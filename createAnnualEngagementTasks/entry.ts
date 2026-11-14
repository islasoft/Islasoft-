import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    const todayMMDD = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

    // Get all active clients
    const clients = await base44.asServiceRole.entities.Client.filter({ status: 'active' });

    // Get existing annual engagement tasks created this year to avoid duplicates
    const currentYear = today.getFullYear();
    const existingTasks = await base44.asServiceRole.entities.Task.filter({});
    const annualTasksThisYear = existingTasks.filter(t =>
      t.title?.includes('Annual Engagement Letter') &&
      t.created_date &&
      new Date(t.created_date).getFullYear() === currentYear
    );
    const existingClientIds = new Set(annualTasksThisYear.map(t => t.client_id));

    let created = 0;

    for (const client of clients) {
      if (existingClientIds.has(client.id)) continue;

      // Check if today matches the anniversary or it's Jan 1
      const createdDate = client.created_date ? new Date(client.created_date) : null;
      const anniversaryMMDD = createdDate
        ? `${String(createdDate.getMonth() + 1).padStart(2, '0')}/${String(createdDate.getDate()).padStart(2, '0')}`
        : '01/01';

      const isAnniversaryToday = anniversaryMMDD === todayMMDD;
      const isJan1 = todayMMDD === '01/01' && !createdDate;

      if (!isAnniversaryToday && !isJan1) continue;

      const clientName = client.company_name || [client.name, client.last_name].filter(Boolean).join(' ');
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 14); // 2 weeks from today

      await base44.asServiceRole.entities.Task.create({
        title: `Send Annual Engagement Letter — ${clientName}`,
        description: `Annual engagement letter renewal for ${clientName}. Review the current terms, update if needed, and send a new engagement letter for the upcoming year. Client ID: ${client.id}`,
        client_id: client.id,
        client_name: clientName,
        assigned_to_id: client.manager_id || null,
        assigned_to_name: client.manager_name || null,
        priority: 'medium',
        status: 'todo',
        due_date: dueDate.toISOString().split('T')[0],
        tags: ['annual-engagement', 'engagement-letter'],
        source: 'ai_generated',
      });

      created++;
    }

    return Response.json({ success: true, tasks_created: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});