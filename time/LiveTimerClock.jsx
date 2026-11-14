import React, { useState, useEffect } from 'react';

function formatTime(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Shows a live ticking clock for a running timer entry.
 * Pass entry with timer_start (timestamp ms) and timer_accumulated (seconds).
 */
export default function LiveTimerClock({ entry, className = '' }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!entry?.timer_start) {
      setElapsed((entry?.timer_accumulated || 0));
      return;
    }
    const calc = () => {
      const sinceStart = (Date.now() - entry.timer_start) / 1000;
      setElapsed((entry.timer_accumulated || 0) + sinceStart);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [entry?.timer_start, entry?.timer_accumulated]);

  return (
    <span className={`font-mono font-bold tabular-nums ${className}`}>
      {formatTime(elapsed)}
    </span>
  );
}