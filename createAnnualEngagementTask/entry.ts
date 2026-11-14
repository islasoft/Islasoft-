import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get all active clients with a manager assigned
    const clients = await base44.asServiceRole.entities.Client.filter({ status: 'active' });

    const today = new Date();
    const todayMMDD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const createdTasks = [];

    for (const client of clients) {
      if (!client.manager_id) continue;

      // Determine anniversary date: use created_date, fallback to Jan 1
      let anniversaryMMDD = '01-01';
      if (client.created_date) {
        const created = new Date(client.created_date);
        anniversaryMMDD = `${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
      }

      if (anniversaryMMDD !== todayMMDD) continue;

      const clientName = client.company_name ||
        [client.name, client.last_name].filter(Boolean).join(' ') || 'Client';

      // Check if task already exists for this year
      const existingTasks = await base44.asServiceRole.entities.Task.filter({
        client_id: client.id,
      });
      const thisYear = String(today.getFullYear());
      const alreadyCreated = existingTasks.some(
        t => t.title?.includes('Annual Engagement Letter') && t.created_date?.startsWith(thisYear)
      );
      if (alreadyCreated) continue;

      // Due date: 30 days from today
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const task = await base44.asServiceRole.entities.Task.create({
        title: `Send Annual Engagement Letter — ${clientName}`,
        description: `It's time to review and update the engagement letter for ${clientName}. Please review their current terms, confirm services for ${thisYear}, update fees if needed, and re-send the engagement letter for signature via the Engagement Letter workflow on the client record.`,
        client_id: client.id,
        client_name: clientName,
        assigned_to_id: client.manager_id,
        assigned_to_name: client.manager_name || '',
        priority: 'high',
        status: 'todo',
        due_date: dueDateStr,
        source: 'ai_generated',
        tags: ['annual-engagement', 'engagement-letter'],
      });
      createdTasks.push(task.id);
    }

    return Response.json({ created: createdTasks.length, task_ids: createdTasks });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});