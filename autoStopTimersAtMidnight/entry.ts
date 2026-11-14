import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all time entries that have a running timer (timer_start is set)
    const allEntries = await base44.asServiceRole.entities.TimeEntry.filter({});
    const runningEntries = allEntries.filter(e => e.timer_start != null);

    if (runningEntries.length === 0) {
      return Response.json({ stopped: 0, message: 'No running timers found' });
    }

    let stopped = 0;
    for (const entry of runningEntries) {
      const now = Date.now();
      const sinceStart = Math.floor((now - entry.timer_start) / 1000);
      const totalSeconds = (entry.timer_accumulated || 0) + sinceStart;
      // Round up to nearest 5 minutes
      const roundedSeconds = Math.ceil(Math.ceil(totalSeconds / 60) / 5) * 5 * 60;

      await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
        timer_start: null,
        timer_accumulated: roundedSeconds,
        hours: roundedSeconds / 3600,
        submitted: true,
      });
      stopped++;
    }

    return Response.json({ stopped, message: `Auto-stopped and released ${stopped} timer(s) at midnight` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});