import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Video } from 'lucide-react';
import InterviewPrepSection from '../interviews/InterviewPrepSection';
import InterviewSchedulerDialog from '../interviews/InterviewSchedulerDialog';

export default function InterviewPrepSectionTab({ client, currentUser }) {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);

  useEffect(() => {
    if (!client?.id) return;
    base44.entities.ClientInterview.filter({ client_id: client.id })
      .then(setInterviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [client?.id]);

  const handleUpdated = (updated) => {
    setInterviews(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleScheduled = (interview) => {
    setInterviews(prev => {
      const exists = prev.find(i => i.id === interview.id);
      return exists ? prev.map(i => i.id === interview.id ? interview : i) : [interview, ...prev];
    });
    setShowScheduler(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Client Interviews</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowScheduler(true)}
          className="text-blue-600 border-blue-300 hover:bg-blue-50"
        >
          <Video className="w-3.5 h-3.5 mr-1" />
          Schedule Interview
        </Button>
      </div>

      {interviews.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Video className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No interviews scheduled yet.</p>
          <p className="text-xs mt-1">Schedule an interview after the client signs their engagement letter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map(interview => (
            <InterviewPrepSection
              key={interview.id}
              interview={interview}
              onUpdated={handleUpdated}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      <InterviewSchedulerDialog
        client={client}
        open={showScheduler}
        onOpenChange={setShowScheduler}
        onScheduled={handleScheduled}
      />
    </div>
  );
}