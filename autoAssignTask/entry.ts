import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process new task creations
    if (event.type !== 'create' || !data) {
      return Response.json({ success: true, message: 'Not a create event' });
    }

    // Skip if task is already assigned
    if (data.assigned_to_id) {
      return Response.json({ success: true, message: 'Task already assigned' });
    }

    // Get project to determine category
    let projectCategory = null;
    if (data.project_id) {
      const projects = await base44.asServiceRole.entities.Project.filter({ id: data.project_id });
      projectCategory = projects[0]?.project_category;
    }

    // Get all users to find the best match
    const users = await base44.asServiceRole.entities.User.list();

    // Define assignment rules based on project category
    const categoryAssignmentRules = {
      'tax_compliance': ['cpa', 'senior_staff'],
      'entity_structuring': ['cpa'],
      'bookkeeping_accounting': ['senior_staff', 'staff'],
      'payroll_employment': ['senior_staff', 'staff'],
      'sales_local_tax': ['senior_staff', 'staff'],
      'irs_representation': ['cpa'],
      'advisory_cfo': ['cpa'],
      'audit_assurance': ['cpa', 'senior_staff'],
      'systems_internal': ['senior_staff', 'staff']
    };

    // Find eligible users based on project category
    const eligibleCategories = categoryAssignmentRules[projectCategory] || ['staff', 'senior_staff', 'cpa'];
    const eligibleUsers = users.filter(u => 
      u.team_category && eligibleCategories.includes(u.team_category)
    );

    if (eligibleUsers.length === 0) {
      return Response.json({ success: false, message: 'No eligible users found' });
    }

    // Get task counts for load balancing
    const allTasks = await base44.asServiceRole.entities.Task.filter({ status: { $in: ['todo', 'in_progress'] } });
    const taskCounts = eligibleUsers.map(user => ({
      user,
      count: allTasks.filter(t => t.assigned_to_id === user.id).length
    }));

    // Assign to user with least tasks
    taskCounts.sort((a, b) => a.count - b.count);
    const assignedUser = taskCounts[0].user;

    // Update task with assignment
    await base44.asServiceRole.entities.Task.update(data.id, {
      assigned_to_id: assignedUser.id,
      assigned_to_name: assignedUser.full_name
    });

    // Send notification
    await base44.asServiceRole.entities.Notification.create({
      user_id: assignedUser.id,
      user_email: assignedUser.email,
      type: 'task_assigned',
      title: 'New Task Auto-Assigned',
      message: `You have been automatically assigned: ${data.title}`,
      link: `/TaskDetails?id=${data.id}`,
      related_id: data.id,
      related_type: 'task',
      priority: data.priority === 'urgent' ? 'urgent' : 'high'
    });

    return Response.json({ 
      success: true, 
      assigned_to: assignedUser.full_name,
      category: projectCategory 
    });

  } catch (error) {
    console.error('Error auto-assigning task:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});