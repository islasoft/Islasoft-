import { base44 } from '@/api/base44Client';

/**
 * Service for creating notifications
 */
export const notificationService = {
  /**
   * Create a notification for a user
   */
  async createNotification({ userId, userEmail, type, title, message, link, relatedId, relatedType, priority = 'medium' }) {
    try {
      // Check user's notification preferences
      const users = await base44.entities.User.list();
      const user = users.find(u => u.id === userId);
      
      const preferences = user?.notification_preferences || {};
      const typePrefs = preferences[type] || { inApp: true, email: false };
      
      // Create in-app notification if enabled
      if (typePrefs.inApp !== false) {
        await base44.entities.Notification.create({
          user_id: userId,
          user_email: userEmail,
          type,
          title,
          message,
          link,
          related_id: relatedId,
          related_type: relatedType,
          priority,
          is_read: false,
        });
      }
      
      // Send email notification if enabled
      if (typePrefs.email) {
        await base44.integrations.Core.SendEmail({
          to: userEmail,
          subject: `[Isla Accounting] ${title}`,
          body: `${message}\n\nView details: ${window.location.origin}${link || ''}`,
          from_name: 'Isla Accounting Corp',
        });
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  },

  /**
   * Notify about task assignment
   */
  async notifyTaskAssignment(task, assignedUser) {
    await this.createNotification({
      userId: assignedUser.id,
      userEmail: assignedUser.email,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned the task: ${task.title}`,
      link: `/Tasks`,
      relatedId: task.id,
      relatedType: 'task',
      priority: task.priority === 'urgent' ? 'urgent' : task.priority === 'high' ? 'high' : 'medium',
    });
  },

  /**
   * Notify about project assignment
   */
  async notifyProjectAssignment(project, assignedUser) {
    await this.createNotification({
      userId: assignedUser.id,
      userEmail: assignedUser.email,
      type: 'project_assigned',
      title: 'New Project Assigned',
      message: `You have been assigned to project: ${project.client_name} - ${project.project_type?.replace(/_/g, ' ')}`,
      link: `/Projects`,
      relatedId: project.id,
      relatedType: 'project',
      priority: 'medium',
    });
  },

  /**
   * Notify about approaching deadline
   */
  async notifyApproachingDeadline(item, user, itemType = 'project') {
    const daysUntil = Math.ceil((new Date(item.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    await this.createNotification({
      userId: user.id,
      userEmail: user.email,
      type: 'deadline_approaching',
      title: `Deadline Approaching`,
      message: `${itemType === 'project' ? 'Project' : 'Task'} "${item.client_name || item.title}" is due in ${daysUntil} day(s)`,
      link: itemType === 'project' ? `/Projects` : `/Tasks`,
      relatedId: item.id,
      relatedType: itemType,
      priority: daysUntil === 1 ? 'urgent' : 'high',
    });
  },

  /**
   * Notify about overdue item
   */
  async notifyOverdue(item, user, itemType = 'project') {
    await this.createNotification({
      userId: user.id,
      userEmail: user.email,
      type: itemType === 'project' ? 'project_overdue' : 'task_overdue',
      title: `${itemType === 'project' ? 'Project' : 'Task'} Overdue`,
      message: `${itemType === 'project' ? 'Project' : 'Task'} "${item.client_name || item.title}" is overdue`,
      link: itemType === 'project' ? `/Projects` : `/Tasks`,
      relatedId: item.id,
      relatedType: itemType,
      priority: 'urgent',
    });
  },

  /**
   * Notify about status change
   */
  async notifyStatusChange(item, oldStatus, newStatus, user, itemType = 'project') {
    await this.createNotification({
      userId: user.id,
      userEmail: user.email,
      type: itemType === 'project' ? 'project_status_changed' : 'task_status_changed',
      title: `${itemType === 'project' ? 'Project' : 'Task'} Status Updated`,
      message: `${itemType === 'project' ? 'Project' : 'Task'} "${item.client_name || item.title}" changed from ${oldStatus} to ${newStatus}`,
      link: itemType === 'project' ? `/Projects` : `/Tasks`,
      relatedId: item.id,
      relatedType: itemType,
      priority: newStatus === 'completed' ? 'low' : 'medium',
    });
  },

  /**
   * Notify about invoice creation
   */
  async notifyInvoiceCreated(invoice, user) {
    await this.createNotification({
      userId: user.id,
      userEmail: user.email,
      type: 'invoice_created',
      title: 'New Invoice Created',
      message: `Invoice #${invoice.invoice_number} for ${invoice.client_name} has been created`,
      link: `/Invoices`,
      relatedId: invoice.id,
      relatedType: 'invoice',
      priority: 'medium',
    });
  },

  /**
   * Notify about time entry submission
   */
  async notifyTimeEntrySubmitted(timeEntry, reviewer) {
    await this.createNotification({
      userId: reviewer.id,
      userEmail: reviewer.email,
      type: 'time_entry_submitted',
      title: 'Time Entry Submitted',
      message: `${timeEntry.staff_name} submitted ${timeEntry.hours} hours for ${timeEntry.project_name}`,
      link: `/TimeTracking`,
      relatedId: timeEntry.id,
      relatedType: 'time_entry',
      priority: 'low',
    });
  },

  /**
   * Notify about new message
   */
  async notifyMessage(message, recipient) {
    await this.createNotification({
      userId: recipient.id,
      userEmail: recipient.email,
      type: 'message_received',
      title: 'New Message',
      message: `${message.sender_name}: ${message.subject}`,
      link: `/Communications`,
      relatedId: message.id,
      relatedType: 'message',
      priority: 'medium',
    });
  },
};