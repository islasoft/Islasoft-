import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Scheduled automations run without a user session — use service role directly.

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // "YYYY-MM-DD"

    // Load existing notifications created today to prevent duplicates
    const existingToday = await base44.asServiceRole.entities.Notification.list('-created_date', 500);
    const alreadySentToday = new Set(
      existingToday
        .filter(n => {
          const d = n.created_date ? new Date(n.created_date) : null;
          return d && d.toISOString().split('T')[0] === todayStr &&
            (n.type === 'project_overdue' || n.type === 'task_overdue' || n.type === 'deadline_approaching');
        })
        .map(n => `${n.type}:${n.related_id}`)
    );

    const notifications = [];

    // Check overdue projects
    const projects = await base44.asServiceRole.entities.Project.filter({
      status: { $in: ['in_progress', 'not_started'] }
    });

    for (const project of projects) {
      if (!project.due_date || !project.assigned_to_id) continue;

      const dueDate = new Date(project.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 0) {
        const key = `project_overdue:${project.id}`;
        if (!alreadySentToday.has(key)) {
          notifications.push({
            user_id: project.assigned_to_id,
            user_email: project.assigned_to_name,
            type: 'project_overdue',
            title: 'Project Overdue',
            message: `Project "${project.client_name}" was due ${Math.abs(daysUntilDue)} day(s) ago`,
            link: `/ProjectDetails?id=${project.id}`,
            related_id: project.id,
            related_type: 'project',
            priority: 'urgent'
          });
        }
      } else if (daysUntilDue === 1 || daysUntilDue === 3) {
        const key = `deadline_approaching:${project.id}`;
        if (!alreadySentToday.has(key)) {
          notifications.push({
            user_id: project.assigned_to_id,
            user_email: project.assigned_to_name,
            type: 'deadline_approaching',
            title: 'Project Deadline Approaching',
            message: `Project "${project.client_name}" is due in ${daysUntilDue} day(s)`,
            link: `/ProjectDetails?id=${project.id}`,
            related_id: project.id,
            related_type: 'project',
            priority: daysUntilDue === 1 ? 'urgent' : 'high'
          });
        }
      }
    }

    // Check overdue tasks
    const tasks = await base44.asServiceRole.entities.Task.filter({
      status: { $in: ['todo', 'in_progress'] }
    });

    for (const task of tasks) {
      if (!task.due_date || !task.assigned_to_id) continue;

      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 0) {
        const key = `task_overdue:${task.id}`;
        if (!alreadySentToday.has(key)) {
          notifications.push({
            user_id: task.assigned_to_id,
            user_email: task.assigned_to_name,
            type: 'task_overdue',
            title: 'Task Overdue',
            message: `Task "${task.title}" was due ${Math.abs(daysUntilDue)} day(s) ago`,
            link: `/TaskDetails?id=${task.id}`,
            related_id: task.id,
            related_type: 'task',
            priority: 'urgent'
          });
        }
      } else if (daysUntilDue === 1 || daysUntilDue === 3) {
        const key = `deadline_approaching:${task.id}`;
        if (!alreadySentToday.has(key)) {
          notifications.push({
            user_id: task.assigned_to_id,
            user_email: task.assigned_to_name,
            type: 'deadline_approaching',
            title: 'Task Deadline Approaching',
            message: `Task "${task.title}" is due in ${daysUntilDue} day(s)`,
            link: `/TaskDetails?id=${task.id}`,
            related_id: task.id,
            related_type: 'task',
            priority: daysUntilDue === 1 ? 'urgent' : 'high'
          });
        }
      }
    }

    // Bulk create only new (non-duplicate) notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({
      success: true,
      notifications_sent: notifications.length,
      checked_projects: projects.length,
      checked_tasks: tasks.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking overdue items:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});