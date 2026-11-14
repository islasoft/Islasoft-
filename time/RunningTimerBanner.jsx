import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';

function formatTime(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function RunningTimerBanner({ entry, onStop }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!entry?.timer_start) return;

    const calc = () => {
      const acc = entry.timer_accumulated || 0;
      const sinceStart = (Date.now() - entry.timer_start) / 1000;
      setElapsed(acc + sinceStart);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [entry?.timer_start, entry?.timer_accumulated]);

  if (!entry) return null;

  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        {/* Pulsing red dot */}
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
        </span>
        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Timer Running</p>
          <p className="text-sm font-bold text-slate-800">
            {entry.client_name && <span>{entry.client_name} — </span>}
            {entry.project_name?.split(' - ').slice(1).join(' - ') || entry.project_name}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-2xl font-mono font-bold text-slate-800">
          {formatTime(elapsed)}
        </span>
        <Button
          onClick={() => onStop(entry)}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold"
          size="sm"
        >
          <Square className="w-4 h-4 mr-1.5" />
          Stop Timer
        </Button>
      </div>
    </div>
  );
}