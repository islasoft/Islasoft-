import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

// Height of the sticky PageHeader (h-14 = 56px) + safe-area-inset-top.
// We offset the pull indicator so it never overlaps the header.
const HEADER_OFFSET = 56; // px — matches PageHeader h-14

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0); // 0-100
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === 0) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && delta < 120) {
      setPulling(true);
      setPullProgress(Math.min(100, Math.round((delta / 80) * 100)));
    }
  };

  const handleTouchEnd = async () => {
    if (pullProgress >= 100) {
      setRefreshing(true);
      setPulling(false);
      setPullProgress(0);
      await onRefresh?.();
      setRefreshing(false);
    } else {
      setPulling(false);
      setPullProgress(0);
    }
    startY.current = 0;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Indicator — positioned BELOW the sticky PageHeader so they never overlap */}
      {(pulling || refreshing) && (
        <div
          className="fixed left-0 right-0 flex justify-center z-30 pointer-events-none"
          style={{ top: `calc(${HEADER_OFFSET}px + env(safe-area-inset-top))` }}
        >
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-full p-2 mt-2">
            <RefreshCw
              className={`w-5 h-5 text-blue-600 dark:text-blue-400 ${refreshing ? 'animate-spin' : ''}`}
              style={pulling && !refreshing ? { transform: `rotate(${pullProgress * 3.6}deg)` } : undefined}
            />
          </div>
        </div>
      )}

      {/* Content shifts down slightly when pulling so it doesn't hide behind indicator */}
      <div
        style={{
          transform: pulling ? `translateY(${Math.min(pullProgress * 0.6, 60)}px)` : 'none',
          transition: pulling ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
