import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process task updates
    if (event.type !== 'update' || !data || !data.project_id) {
      return Response.json({ success: true, message: 'Not a relevant update' });
    }

    // Get all tasks for this project
    const projectTasks = await base44.asServiceRole.entities.Task.filter({ 
      project_id: data.project_id 
    });

    if (projectTasks.length === 0) {
      return Response.json({ success: true, message: 'No tasks found' });
    }

    // Check if all tasks are completed
    const allCompleted = projectTasks.every(task => task.status === 'completed');
    const anyInProgress = projectTasks.some(task => task.status === 'in_progress');
    
    // Get project
    const projects = await base44.asServiceRole.entities.Project.filter({ 
      id: data.project_id 
    });
    const project = projects[0];

    if (!project) {
      return Response.json({ success: false, message: 'Project not found' });
    }

    let newStatus = null;
    let notifyUser = false;

    // Determine new project status
    if (allCompleted && project.status !== 'completed') {
      newStatus = 'completed';
      notifyUser = true;
    } else if (anyInProgress && project.status === 'not_started') {
      newStatus = 'in_progress';
      notifyUser = true;
    }

    // Update project if status changed
    if (newStatus) {
      await base44.asServiceRole.entities.Project.update(project.id, {
        status: newStatus,
        ...(newStatus === 'completed' && { completion_percentage: 100 })
      });

      // Notify assigned user
      if (notifyUser && project.assigned_to_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: project.assigned_to_id,
          user_email: project.assigned_to_name,
          type: 'project_status_changed',
          title: 'Project Status Updated',
          message: `Project "${project.client_name}" is now ${newStatus.replace('_', ' ')}`,
          link: `/ProjectDetails?id=${project.id}`,
          related_id: project.id,
          related_type: 'project',
          priority: newStatus === 'completed' ? 'low' : 'medium'
        });
      }

      return Response.json({ 
        success: true, 
        old_status: project.status,
        new_status: newStatus,
        completed_tasks: projectTasks.filter(t => t.status === 'completed').length,
        total_tasks: projectTasks.length
      });
    }

    return Response.json({ success: true, message: 'No status change needed' });

  } catch (error) {
    console.error('Error updating project status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});