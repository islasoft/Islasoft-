import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }
    
    // Use service role to access all data
    const clients = await base44.asServiceRole.entities.Client.list();
    
    const reminderSettings = await base44.asServiceRole.entities.ReminderSettings.filter({
      is_active: true,
      reminder_type: 'communication_followup'
    });
    
    if (!reminderSettings || reminderSettings.length === 0) {
      return Response.json({ message: 'No active communication followup settings found', notificationsSent: 0 });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let notificationsSent = 0;
    
    for (const client of clients) {
      // Get last communication for this client (messages or emails)
      const messages = await base44.asServiceRole.entities.Message.filter(
        { client_id: client.id },
        '-created_date',
        1
      );
      
      const emailTracking = await base44.asServiceRole.entities.EmailTracking.filter(
        { client_id: client.id },
        '-sent_date',
        1
      );
      
      // Determine last communication date
      let lastCommDate = null;
      
      if (messages.length > 0) {
        lastCommDate = new Date(messages[0].created_date);
      }
      
      if (emailTracking.length > 0) {
        const emailDate = new Date(emailTracking[0].sent_date);
        if (!lastCommDate || emailDate > lastCommDate) {
          lastCommDate = emailDate;
        }
      }
      
      // Skip if no communication history
      if (!lastCommDate) continue;
      
      lastCommDate.setHours(0, 0, 0, 0);
      const daysSinceLastComm = Math.floor((today - lastCommDate) / (1000 * 60 * 60 * 24));
      
      // Check each reminder setting
      for (const setting of reminderSettings) {
        if (daysSinceLastComm === setting.days_after) {
          const notifications = [];
          
          // Notify client manager
          if (setting.notify_manager && client.manager_id) {
            const manager = await base44.asServiceRole.entities.User.filter({ id: client.manager_id });
            if (manager && manager.length > 0 && manager[0].email) {
              notifications.push({
                user_id: client.manager_id,
                user_email: manager[0].email,
                type: 'message_received',
                title: `Follow Up Reminder: ${client.company_name}`,
                message: `It's been ${daysSinceLastComm} days since last communication with ${client.company_name}. Consider reaching out to maintain engagement.`,
                related_id: client.id,
                related_type: 'client',
                priority: daysSinceLastComm >= 14 ? 'high' : 'medium'
              });
              
              // Send email to manager
              try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  from_name: 'Isla Accounting Corp',
                  to: manager[0].email,
                  subject: `Follow Up Reminder: ${client.company_name}`,
                  body: `Hi ${manager[0].full_name},\n\nThis is a reminder that it's been ${daysSinceLastComm} days since the last communication with ${client.company_name}.\n\nLast communication was on ${lastCommDate.toLocaleDateString()}.\n\nConsider reaching out to maintain client engagement and ensure all needs are being met.\n\nClient Contact: ${client.contact_person || 'N/A'}\nClient Email: ${client.email}\nClient Phone: ${client.phone || 'N/A'}\n\nBest regards,\nIsla Accounting Corp`
                });
                notificationsSent++;
              } catch (error) {
                console.error('Error sending email to manager:', error);
              }
            }
          }
          
          // Send email to client if enabled
          if (setting.notify_client && client.email) {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                from_name: 'Isla Accounting Corp',
                to: client.email,
                subject: `Checking In - ${client.company_name}`,
                body: `Dear ${client.contact_person || client.company_name},\n\nWe hope this message finds you well! It's been a while since we last connected, and we wanted to reach out to see how things are going.\n\nIf you have any questions, need assistance, or would like to discuss your accounting needs, please don't hesitate to contact us.\n\nWe look forward to hearing from you.\n\nBest regards,\nIsla Accounting Corp\nPhone: (305) 290-1145\nEmail: info@islaccounting.com`
              });
              notificationsSent++;
            } catch (error) {
              console.error('Error sending email to client:', error);
            }
          }
          
          // Send emails to additional recipients
          if (setting.additional_recipients && setting.additional_recipients.length > 0) {
            for (const email of setting.additional_recipients) {
              try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  from_name: 'Isla Accounting Corp',
                  to: email,
                  subject: `Follow Up Alert: ${client.company_name}`,
                  body: `${daysSinceLastComm} days have passed since last communication with ${client.company_name}.\n\nClient Manager: ${client.manager_name || 'Unassigned'}\nLast Communication: ${lastCommDate.toLocaleDateString()}`
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
      message: 'Communication followup check completed', 
      notificationsSent,
      clientsChecked: clients.length,
      activeReminders: reminderSettings.length
    });
    
  } catch (error) {
    console.error('Error checking communication followups:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});