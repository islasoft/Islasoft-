import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isManager = user.role === 'admin' || user.team_category === 'cpa' || user.team_category === 'senior_staff';

    // Get projects based on user role
    let projects;
    if (isManager) {
      projects = await base44.entities.Project.filter({
        status: { $in: ['not_started', 'in_progress', 'waiting'] }
      });
    } else {
      projects = await base44.entities.Project.filter({
        assigned_to_id: user.id,
        status: { $in: ['not_started', 'in_progress', 'waiting'] }
      });
    }

    if (!projects || projects.length === 0) {
      return Response.json({ message: 'No active projects found', eventsCreated: 0 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    let eventsCreated = 0;
    const errors = [];

    for (const project of projects) {
      if (!project.due_date) continue;

      try {
        const event = {
          summary: `[Project] ${project.project_type?.replace(/_/g, ' ')} - ${project.client_name}`,
          description: `Project: ${project.project_type}\nClient: ${project.client_name}\nAssigned to: ${project.assigned_to_name}\nStatus: ${project.status}`,
          start: {
            date: project.due_date
          },
          end: {
            date: project.due_date
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 60 } // 1 hour before
            ]
          }
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        });

        if (!response.ok) {
          const error = await response.text();
          errors.push(`Failed to create event for project ${project.id}: ${error}`);
          console.error('Calendar API error:', error);
        } else {
          eventsCreated++;
        }
      } catch (error) {
        errors.push(`Error processing project ${project.id}: ${error.message}`);
        console.error('Error creating calendar event:', error);
      }
    }

    return Response.json({ 
      success: true,
      message: `Successfully synced ${eventsCreated} project deadline(s) to Google Calendar`,
      eventsCreated,
      totalProjects: projects.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ 
      error: error.message || 'Failed to sync to Google Calendar' 
    }, { status: 500 });
  }
});