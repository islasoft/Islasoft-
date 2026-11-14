import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const TIMEOUT_MINUTES = 30;
const WARNING_MINUTES = 5;

export default function SessionTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(WARNING_MINUTES * 60);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const resetTimer = () => {
    setLastActivity(Date.now());
    setShowWarning(false);
    setRemainingSeconds(WARNING_MINUTES * 60);
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [showWarning]);

  useEffect(() => {
    const interval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      const inactiveMinutes = inactiveTime / (1000 * 60);

      if (inactiveMinutes >= TIMEOUT_MINUTES) {
        handleLogout();
      } else if (inactiveMinutes >= (TIMEOUT_MINUTES - WARNING_MINUTES) && !showWarning) {
        setShowWarning(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, showWarning]);

  useEffect(() => {
    if (showWarning) {
      const countdown = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdown);
    }
  }, [showWarning]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Timeout Warning</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Your session will expire in <span className="font-bold text-red-600">{formatTime(remainingSeconds)}</span> due to inactivity.
          </p>
          <p className="text-sm text-gray-500">
            Click "Stay Logged In" to continue working, or you'll be automatically logged out for security.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleLogout}>
            Logout Now
          </Button>
          <Button onClick={resetTimer} className="bg-blue-600 hover:bg-blue-700">
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}