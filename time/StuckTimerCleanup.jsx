import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wrench } from 'lucide-react';
import { toast } from 'sonner';

export default function StuckTimerCleanup() {
  const [fixing, setFixing] = useState(false);
  const queryClient = useQueryClient();

  const { data: stuckEntries = [], isLoading } = useQuery({
    queryKey: ['stuckTimers'],
    queryFn: async () => {
      const all = await base44.entities.TimeEntry.list();
      // Stuck = timer_start is set but hours == 0 and timer_accumulated == 0 (or missing)
      return all.filter(e =>
        e.timer_start &&
        (!e.hours || e.hours === 0) &&
        (!e.timer_accumulated || e.timer_accumulated === 0)
      );
    },
  });

  const handleFix = async () => {
    if (stuckEntries.length === 0) return;
    setFixing(true);
    try {
      for (const entry of stuckEntries) {
        await base44.entities.TimeEntry.update(entry.id, {
          timer_start: null,
          timer_accumulated: 0,
          hours: 0,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['stuckTimers'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['allTimeEntries'] });
      toast.success(`Fixed ${stuckEntries.length} stuck timer(s). Please re-enter hours manually.`);
    } catch (err) {
      toast.error('Failed to fix some entries: ' + err.message);
    } finally {
      setFixing(false);
    }
  };

  if (isLoading || stuckEntries.length === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-900">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>{stuckEntries.length} stuck timer{stuckEntries.length > 1 ? 's' : ''}</strong> found with no hours recorded.
          These were started but never stopped properly.
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-400 text-amber-900 hover:bg-amber-100 flex-shrink-0"
        onClick={handleFix}
        disabled={fixing}
      >
        <Wrench className="w-3 h-3 mr-1" />
        {fixing ? 'Fixing...' : 'Fix Now'}
      </Button>
    </div>
  );
}