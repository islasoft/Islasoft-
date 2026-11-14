import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Select no longer needed - using inline search
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Square, Clock, Check, Plus } from 'lucide-react';
import LiveTimerClock from '../components/time/LiveTimerClock';
import { format } from 'date-fns';
import { formatDate } from '@/lib/utils';
import TimeEntryCard from '../components/time/TimeEntryCard';
import ProjectSearchTimer from '../components/time/ProjectSearchTimer';
import { toast } from 'sonner';
import PageHeader from '../components/mobile/PageHeader';

function ManualProjectSearch({ allProjects, selectedId, onSelect }) {
  const [query, setQuery] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const ref = React.useRef(null);

  const selectedProject = allProjects.find(p => p.id === selectedId);

  const results = query.trim().length > 0
    ? allProjects.filter(p => {
        const q = query.toLowerCase();
        return (
          p.client_name?.toLowerCase().includes(q) ||
          p.project_type?.toLowerCase().replace(/_/g, ' ').includes(q)
        );
      }).slice(0, 4)
    : [];

  React.useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} className="relative">
      {selectedProject ? (
        <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-blue-50">
          <span className="text-sm font-medium">{selectedProject.client_name} — {selectedProject.project_type?.replace(/_/g, ' ')}</span>
          <button type="button" onClick={() => { onSelect({ id: '' }); setQuery(''); }} className="text-slate-400 hover:text-slate-600 ml-2">✕</button>
        </div>
      ) : (
        <Input
          placeholder="Search projects…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDrop(true); }}
          onFocus={() => setShowDrop(true)}
        />
      )}
      {showDrop && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {results.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => { onSelect(p); setQuery(''); setShowDrop(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0"
            >
              <span className="font-medium">{p.client_name}</span>
              <span className="text-slate-400 ml-2">— {p.project_type?.replace(/_/g, ' ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TimeTracking() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryMode, setManualEntryMode] = useState('hours');
  const [manualEntry, setManualEntry] = useState({ project_id: '', hours: '', description: '' });
  const queryClient = useQueryClient();

  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Check if contractor needs to complete onboarding
  const needsOnboarding = user?.contractor_form && 
    user?.contractor_onboarding_status !== 'completed';

  useEffect(() => {
    if (needsOnboarding) {
      navigate('/ContractorOnboarding');
    }
  }, [needsOnboarding, navigate]);

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries', user?.id, selectedDate],
    queryFn: async () => {
      try {
        return await base44.entities.TimeEntry.filter({
          staff_id: user.id,
          date: format(selectedDate, 'yyyy-MM-dd')
        });
      } catch (error) {
        console.error('Error loading time entries:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  // All today's active entries: running OR stopped-but-not-yet-released
  const { data: activeEntries = [] } = useQuery({
    queryKey: ['runningTimer', user?.id],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return base44.entities.TimeEntry.filter({ staff_id: user.id, date: today });
    },
    enabled: !!user,
    select: (entries) => entries.filter(e => !e.submitted && (e.timer_start != null || (e.timer_accumulated > 0))),
    refetchInterval: 10000,
    placeholderData: (prev) => prev,
  });

  // Subset: only those actively ticking
  const runningTimerEntries = activeEntries.filter(e => e.timer_start != null);

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const allProjects = await base44.entities.Project.list();
        return allProjects.filter(p => p.status !== 'completed');
      } catch (error) {
        console.error('Error loading projects:', error);
        return [];
      }
    },
    enabled: !!user,
  });



  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        return await base44.entities.Client.list();
      } catch (error) {
        console.error('Error loading clients:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  const PROJECT_TYPES = [
    { value: 'individual_tax_1040', label: 'Individual Tax - 1040' },
    { value: 'business_tax_1120', label: 'Business Tax - 1120' },
    { value: 's_corp_tax_1120s', label: 'S-Corp Tax - 1120S' },
    { value: 'partnership_tax_1065', label: 'Partnership Tax - 1065' },
    { value: 'monthly_bookkeeping', label: 'Monthly Bookkeeping' },
    { value: 'quarterly_bookkeeping', label: 'Quarterly Bookkeeping' },
    { value: 'payroll_processing', label: 'Payroll Processing' },
    { value: 'tax_planning_session', label: 'Tax Planning Session' },
    { value: 'irs_notice_review', label: 'IRS Notice Review' },
    { value: 'consulting', label: 'Consulting' },
  ];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey: ['timeEntries'] });
      const previousEntries = queryClient.getQueryData(['timeEntries', user?.id, selectedDate]);
      const tempId = 'temp-' + Date.now();

      queryClient.setQueryData(['timeEntries', user?.id, selectedDate], (old = []) => [
        ...old,
        { ...newEntry, id: tempId }
      ]);

      // Also optimistically add to runningTimer cache so the panel shows immediately
      if (newEntry.timer_start) {
        queryClient.setQueryData(['runningTimer', user?.id], (old = []) => [
          ...old,
          { ...newEntry, id: tempId }
        ]);
      }

      return { previousEntries };
    },
    onError: (error, newEntry, context) => {
      queryClient.setQueryData(['timeEntries', user?.id, selectedDate], context.previousEntries);
      console.error('Create mutation error:', error);
      toast.error(error.message || 'Failed to create time entry');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['runningTimer'] });
      queryClient.invalidateQueries({ queryKey: ['globalRunningTimer'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['timeEntries'] });
      const previousEntries = queryClient.getQueryData(['timeEntries', user?.id, selectedDate]);

      queryClient.setQueryData(['timeEntries', user?.id, selectedDate], (old = []) =>
        old.map((entry) => (entry.id === id ? { ...entry, ...data } : entry))
      );

      // Optimistically update runningTimer cache (remove if timer_start was cleared)
      if (data.timer_start === null || data.timer_start === undefined) {
        queryClient.setQueryData(['runningTimer', user?.id], (old = []) =>
          old.filter(e => e.id !== id)
        );
      } else if (data.timer_start) {
        queryClient.setQueryData(['runningTimer', user?.id], (old = []) =>
          old.map(e => e.id === id ? { ...e, ...data } : e)
        );
      }

      return { previousEntries };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['timeEntries', user?.id, selectedDate], context.previousEntries);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['runningTimer'] });
      queryClient.invalidateQueries({ queryKey: ['globalRunningTimer'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeEntry.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['timeEntries'] });
      const previousEntries = queryClient.getQueryData(['timeEntries', user?.id, selectedDate]);
      
      queryClient.setQueryData(['timeEntries', user?.id, selectedDate], (old = []) =>
        old.filter((entry) => entry.id !== id)
      );
      
      return { previousEntries };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['timeEntries', user?.id, selectedDate], context.previousEntries);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });

  const startTimer = async (project) => {
    if (!user) {
      toast.error('User not loaded. Please refresh the page.');
      return;
    }

    // Check if a timer is already running for this project
    const alreadyRunning = runningTimerEntries.find(e => e.project_id === project.id);
    if (alreadyRunning) {
      toast.error('A timer is already running for this project');
      return;
    }

    try {
      const now = Date.now();
      const newEntry = {
        project_id: project.id,
        project_name: `${project.client_name || ''} - ${(project.project_type || '').replace(/_/g, ' ')}`,
        client_id: project.client_id,
        client_name: project.client_name,
        staff_id: user.id,
        staff_name: user.full_name,
        date: format(new Date(), 'yyyy-MM-dd'),
        hours: 0,
        timer_start: now,
        timer_accumulated: 0,
        submitted: false,
        billable: true,
      };

      await createMutation.mutateAsync(newEntry);
      setSelectedDate(new Date());
      queryClient.invalidateQueries({ queryKey: ['runningTimer'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['globalRunningTimer'] });
      toast.success('Timer started');
    } catch (error) {
      console.error('Timer start error:', error);
      toast.error(error?.response?.data?.message || 'Failed to start timer');
    }
  };

  const resumeTimer = async (entry) => {
    const now = Date.now();
    await updateMutation.mutateAsync({
      id: entry.id,
      data: { ...entry, timer_start: now }
    });
    queryClient.invalidateQueries({ queryKey: ['runningTimer'] });
    queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    queryClient.invalidateQueries({ queryKey: ['globalRunningTimer'] });
  };

  const stopTimer = (entry) => {
    if (!entry?.timer_start) return;
    const elapsed = Math.floor((Date.now() - entry.timer_start) / 1000);
    const totalSeconds = (entry.timer_accumulated || 0) + elapsed;
    const roundedSeconds = Math.ceil(Math.ceil(totalSeconds / 60) / 5) * 5 * 60;
    updateMutation.mutate({
      id: entry.id,
      data: {
        ...entry,
        timer_accumulated: roundedSeconds,
        timer_start: null,
        hours: roundedSeconds / 3600
      }
    });
    queryClient.invalidateQueries({ queryKey: ['runningTimer'] });
    queryClient.invalidateQueries({ queryKey: ['globalRunningTimer'] });
  };

  // Stop all active entries (running or paused) and mark as submitted
  const releaseAll = async () => {
    if (activeEntries.length === 0) return;
    for (const entry of activeEntries) {
      let totalSeconds = entry.timer_accumulated || 0;
      if (entry.timer_start) {
        const elapsed = Math.floor((Date.now() - entry.timer_start) / 1000);
        totalSeconds += elapsed;
      }
      const roundedSeconds = Math.ceil(Math.ceil(totalSeconds / 60) / 5) * 5 * 60;
      await updateMutation.mutateAsync({
        id: entry.id,
        data: {
          ...entry,
          timer_accumulated: roundedSeconds,
          timer_start: null,
          hours: roundedSeconds / 3600,
          submitted: true,
        }
      });
    }
    queryClient.invalidateQueries({ queryKey: ['runningTimer'] });
    queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    queryClient.invalidateQueries({ queryKey: ['globalRunningTimer'] });
    toast.success(`Released ${activeEntries.length} timer(s) for the day!`);
  };

  const submitDay = async () => {
    const unsubmitted = timeEntries.filter(e => !e.submitted && e.hours > 0);
    
    for (const entry of unsubmitted) {
      await updateMutation.mutateAsync({
        id: entry.id,
        data: { ...entry, submitted: true }
      });
    }
  };

  const handleManualEntry = async () => {
    if (!manualEntry.project_id) {
      toast.error('Please select a project');
      return;
    }

    const project = allProjects.find(p => p.id === manualEntry.project_id);
    if (!project) {
      toast.error('Project not found');
      return;
    }

    if (manualEntryMode === 'timer') {
      // Start a real timer for this project
      setShowManualEntry(false);
      setManualEntry({ project_id: '', hours: '', description: '' });
      await startTimer(project);
      return;
    }

    const hours = parseFloat(manualEntry.hours);
    if (isNaN(hours) || hours <= 0) {
      toast.error('Please enter a valid number of hours');
      return;
    }

    try {
      const entry = {
        project_id: project.id,
        client_id: project.client_id,
        client_name: project.client_name || '',
        project_name: `${project.client_name} - ${project.project_type?.replace(/_/g, ' ')}`,
        staff_id: user.id,
        staff_name: user.full_name,
        date: format(selectedDate, 'yyyy-MM-dd'),
        hours: hours,
        description: manualEntry.description || '',
        submitted: false,
        billable: true,
        timer_accumulated: hours * 3600,
      };

      await createMutation.mutateAsync(entry);
      toast.success('Time entry added successfully');
      setManualEntry({ project_id: '', hours: '', description: '' });
      setShowManualEntry(false);
    } catch (error) {
      console.error('Manual entry error:', error);
      toast.error(error.message || 'Failed to add time entry');
    }
  };

  const todaySubmitted = timeEntries.some(e => e.submitted && !e.timer_start);
  const canEdit = true;

  const stuckEntries = timeEntries.filter(e =>
    e.timer_start && (!e.hours || e.hours <= 0) && (!e.timer_accumulated || e.timer_accumulated <= 0)
  );

  const fixStuckTimers = async () => {
    if (stuckEntries.length === 0) return;
    for (const entry of stuckEntries) {
      await updateMutation.mutateAsync({
        id: entry.id,
        data: { ...entry, timer_start: null, hours: 0, timer_accumulated: 0 }
      });
    }
    toast.success(`Fixed ${stuckEntries.length} stuck timer(s).`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Time Tracking" showBack={true} />
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Time Tracking</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track your daily work hours</p>
      </div>

      {/* Active Timers Panel — running or paused-but-not-released */}
      {activeEntries.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {runningTimerEntries.length > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                </span>
              )}
              <span className="text-sm font-bold text-amber-800 uppercase tracking-wide">
                {runningTimerEntries.length > 0
                  ? `${runningTimerEntries.length} Running · ${activeEntries.length - runningTimerEntries.length > 0 ? `${activeEntries.length - runningTimerEntries.length} Paused` : ''}`
                  : `${activeEntries.length} Paused — Ready to Release`}
              </span>
            </div>
            <Button
              onClick={releaseAll}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              size="sm"
              disabled={updateMutation.isPending}
            >
              <Check className="w-4 h-4 mr-1.5" />
              Release All for Today
            </Button>
          </div>
          <div className="space-y-2">
            {activeEntries.map(entry => {
              const isRunning = !!entry.timer_start;
              return (
                <div key={entry.id} className={`flex items-center justify-between bg-white rounded-lg px-4 py-3 shadow-sm border ${isRunning ? 'border-amber-200' : 'border-slate-200'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate">
                      {entry.client_name && <span className="text-slate-500">{entry.client_name} — </span>}
                      {entry.project_name?.split(' - ').slice(1).join(' - ') || entry.project_name}
                    </p>
                    {!isRunning && (
                      <p className="text-xs text-slate-400 mt-0.5">Paused · {(entry.hours || 0).toFixed(2)}h logged</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    {isRunning ? (
                      <>
                        <LiveTimerClock entry={entry} className="text-xl text-red-600" />
                        <Button onClick={() => stopTimer(entry)} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                          <Square className="w-3.5 h-3.5 mr-1" />Stop
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-mono text-slate-500">{(entry.hours || 0).toFixed(2)}h</span>
                        <Button onClick={() => resumeTimer(entry)} size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50">
                          <Play className="w-3.5 h-3.5 mr-1" />Resume
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Timer & Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Manual Entry Dialog */}
          <Dialog open={showManualEntry} onOpenChange={(open) => {
            setShowManualEntry(open);
            if (open) {
              setManualEntryMode('hours');
              setManualEntry({ project_id: '', hours: '', description: '' });
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Time Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={manualEntryMode === 'hours' ? 'default' : 'outline'} className="flex-1" onClick={() => setManualEntryMode('hours')}>
                    <Clock className="w-4 h-4 mr-2" />Enter Hours
                  </Button>
                  <Button type="button" size="sm" variant={manualEntryMode === 'timer' ? 'default' : 'outline'} className="flex-1" onClick={() => setManualEntryMode('timer')}>
                    <Play className="w-4 h-4 mr-2" />Start Timer
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Project *</Label>
                  <ManualProjectSearch allProjects={allProjects} selectedId={manualEntry.project_id} onSelect={(p) => setManualEntry({ ...manualEntry, project_id: p.id })} />
                </div>
                {manualEntryMode === 'hours' && (
                  <>
                    <div className="space-y-2">
                      <Label>Hours *</Label>
                      <Input type="text" inputMode="decimal" placeholder="e.g. 1.5" value={manualEntry.hours} onChange={(e) => setManualEntry({...manualEntry, hours: e.target.value})} autoComplete="off" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Input placeholder="Work description..." value={manualEntry.description} onChange={(e) => setManualEntry({...manualEntry, description: e.target.value})} />
                    </div>
                  </>
                )}
                {manualEntryMode === 'timer' && (
                  <p className="text-sm text-gray-500 bg-blue-50 rounded p-3">A live timer will start for the selected project. You can run multiple timers simultaneously.</p>
                )}
                <Button onClick={handleManualEntry} className="w-full">
                  {manualEntryMode === 'timer' ? <><Play className="w-4 h-4 mr-2" />Start Timer</> : <><Check className="w-4 h-4 mr-2" />Add Time Entry</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Project Search Timer */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Start Timer</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowManualEntry(true)}>
                  <Plus className="w-4 h-4 mr-2" />Manual Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ProjectSearchTimer allProjects={allProjects} activeTimer={null} onStartTimer={startTimer} />
              <p className="text-xs text-slate-400 mt-2">You can run multiple timers at once — one per project</p>
            </CardContent>
          </Card>

          {/* Time Entries for Selected Day */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Time Entries — {formatDate(selectedDate)}</CardTitle>
                <div className="flex gap-2">
                  {stuckEntries.length > 0 && (
                    <Button onClick={fixStuckTimers} variant="outline" size="sm" className="border-orange-400 text-orange-700 hover:bg-orange-50">
                      ⚠️ Fix {stuckEntries.length} Stuck
                    </Button>
                  )}
                  {canEdit && timeEntries.filter(e => !e.submitted && e.hours > 0).length > 0 && (
                    <Button onClick={submitDay} className="bg-green-600 hover:bg-green-700">
                      <Check className="w-4 h-4 mr-2" />Submit Day
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {todaySubmitted && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-medium">✓ Time entries submitted</p>
                </div>
              )}
              <div className="space-y-3">
                {timeEntries.map(entry => (
                  <TimeEntryCard
                    key={entry.id}
                    entry={entry}
                    canEdit={canEdit}
                    onResume={resumeTimer}
                    onStop={stopTimer}
                    onUpdate={(data) => updateMutation.mutate({ id: entry.id, data })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    currentUser={user}
                    allProjects={allProjects}
                  />
                ))}
                {timeEntries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No time entries for this day</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}