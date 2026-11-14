import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use service role to access all data
    const projects = await base44.asServiceRole.entities.Project.filter({
      status: { $in: ['not_started', 'in_progress', 'waiting'] }
    });
    
    const reminderSettings = await base44.asServiceRole.entities.ReminderSettings.filter({
      is_active: true
    });
    
    if (!reminderSettings || reminderSettings.length === 0) {
      return Response.json({ message: 'No active reminder settings found', notificationsSent: 0 });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let notificationsSent = 0;
    
    for (const project of projects) {
      if (!project.due_date) continue;
      
      const dueDate = new Date(project.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      // Check each reminder setting
      for (const setting of reminderSettings) {
        if (daysUntilDue === setting.days_before) {
          const notifications = [];
          
          // Notify assigned team member
          if (setting.notify_assigned_member && project.assigned_to_id) {
            const user = await base44.asServiceRole.entities.User.filter({ id: project.assigned_to_id });
            if (user && user.length > 0 && user[0].email) {
              notifications.push({
                user_id: project.assigned_to_id,
                user_email: user[0].email,
                type: 'deadline_approaching',
                title: `Project Deadline Approaching: ${project.project_type}`,
                message: `Project "${project.project_type}" for ${project.client_name} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} (${project.due_date})`,
                related_id: project.id,
                related_type: 'project',
                priority: daysUntilDue <= 3 ? 'high' : 'medium'
              });
            }
          }
          
          // Notify client manager
          if (setting.notify_manager) {
            const client = await base44.asServiceRole.entities.Client.filter({ id: project.client_id });
            if (client && client.length > 0 && client[0].manager_id) {
              const manager = await base44.asServiceRole.entities.User.filter({ id: client[0].manager_id });
              if (manager && manager.length > 0 && manager[0].email) {
                notifications.push({
                  user_id: client[0].manager_id,
                  user_email: manager[0].email,
                  type: 'deadline_approaching',
                  title: `Project Deadline Approaching: ${project.project_type}`,
                  message: `Project "${project.project_type}" for ${project.client_name} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} (${project.due_date})`,
                  related_id: project.id,
                  related_type: 'project',
                  priority: daysUntilDue <= 3 ? 'high' : 'medium'
                });
              }
            }
          }
          
          // Send email to client
          if (setting.notify_client) {
            const client = await base44.asServiceRole.entities.Client.filter({ id: project.client_id });
            if (client && client.length > 0 && client[0].email) {
              try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  from_name: 'Isla Accounting Corp',
                  to: client[0].email,
                  subject: `Upcoming Deadline: ${project.project_type}`,
                  body: `Dear ${client[0].contact_person || client[0].company_name},\n\nThis is a reminder that your project "${project.project_type}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} on ${project.due_date}.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\nIsla Accounting Corp`
                });
                notificationsSent++;
              } catch (error) {
                console.error('Error sending email to client:', error);
              }
            }
          }
          
          // Send emails to additional recipients
          if (setting.additional_recipients && setting.additional_recipients.length > 0) {
            for (const email of setting.additional_recipients) {
              try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  from_name: 'Isla Accounting Corp',
                  to: email,
                  subject: `Project Deadline Alert: ${project.project_type}`,
                  body: `Project "${project.project_type}" for ${project.client_name} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} on ${project.due_date}.\n\nAssigned to: ${project.assigned_to_name}`
                });
                notificationsSent++;
              } catch (error) {
                console.error('Error sending email to additional recipient:', error);
              }
            }
          }
          
          // Create in-app notifications
          if (notifications.length > 0) {
            await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
            notificationsSent += notifications.length;
          }
        }
      }
    }
    
    return Response.json({ 
      message: 'Project deadline check completed', 
      notificationsSent,
      projectsChecked: projects.length,
      activeReminders: reminderSettings.length
    });
    
  } catch (error) {
    console.error('Error checking project deadlines:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});