import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LiveTimerClock from './LiveTimerClock';

export default function GlobalTimerWidget() {
  const queryClient = useQueryClient();

  const { data: runningEntries = [] } = useQuery({
    queryKey: ['globalRunningTimer'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const entries = await base44.entities.TimeEntry.filter({ staff_id: user.id });
      return entries.filter(e => e.timer_start);
    },
    refetchInterval: 30000,
    placeholderData: (prev) => prev, // keep previous data while refetching — prevents flicker
  });

  const stopMutation = useMutation({
    mutationFn: async (entry) => {
      const sinceStart = Math.floor((Date.now() - entry.timer_start) / 1000);
      const totalSeconds = (entry.timer_accumulated || 0) + sinceStart;
      const roundedSeconds = Math.ceil(Math.ceil(totalSeconds / 60) / 5) * 5 * 60;
      return base44.entities.TimeEntry.update(entry.id, {
        timer_start: null,
        timer_accumulated: roundedSeconds,
        hours: roundedSeconds / 3600,
      });
    },
    onMutate: async (entry) => {
      // Optimistically remove from widget immediately
      queryClient.setQueryData(['globalRunningTimer'], (old = []) =>
        old.filter(e => e.id !== entry.id)
      );
      queryClient.setQueryData(['runningTimer'], (old = []) =>
        old.filter(e => e.id !== entry.id)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalRunningTimer'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['runningTimer'] });
      toast.success('Timer stopped');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['globalRunningTimer'] });
      toast.error('Failed to stop timer');
    },
  });

  if (runningEntries.length === 0) return null;

  // Show a compact summary in the header
  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5 shadow-sm">
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>

      {runningEntries.length === 1 ? (
        // Single timer: show clock + stop button
        <>
          <div className="flex flex-col leading-tight min-w-0">
            <LiveTimerClock entry={runningEntries[0]} className="text-sm text-amber-900" />
            <span className="text-xs text-amber-700 truncate max-w-[120px]">
              {runningEntries[0].client_name || runningEntries[0].project_name || 'Tracking...'}
            </span>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 px-2 text-xs flex-shrink-0"
            onClick={() => stopMutation.mutate(runningEntries[0])}
            disabled={stopMutation.isPending}
          >
            <Square className="w-3 h-3 mr-1" />
            Stop
          </Button>
        </>
      ) : (
        // Multiple timers: show count
        <span className="text-sm font-bold text-amber-900">
          {runningEntries.length} timers running
        </span>
      )}
    </div>
  );
}