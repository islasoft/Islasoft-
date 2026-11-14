import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Calendar, Users, Send, Video, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => chars[b % chars.length]).join('');
};

export default function InterviewSchedulerDialog({ client, engagementLetter, open, onOpenChange, onScheduled }) {
  const [step, setStep] = useState('setup'); // setup | prep | sent
  const [interview, setInterview] = useState(null);
  const [meetingLink, setMeetingLink] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [duration, setDuration] = useState(60);
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => base44.entities.User.list(),
  });

  // Check for existing interview
  useEffect(() => {
    if (!client?.id || !open) return;
    base44.entities.ClientInterview.filter({ client_id: client.id })
      .then(list => {
        const active = list.find(i => ['pending_scheduling', 'scheduled'].includes(i.status));
        if (active) {
          setInterview(active);
          setMeetingLink(active.meeting_link || '');
          setScheduledDate(active.scheduled_date ? active.scheduled_date.slice(0, 16) : '');
          setDuration(active.duration_minutes || 60);
          setSelectedTeam(active.team_attendees?.map(a => a.user_id) || []);
          if (active.suggested_projects?.length || active.document_checklist?.length) {
            setStep('prep');
          }
        }
      })
      .catch(() => {});
  }, [client?.id, open]);

  const handleSaveInterview = async () => {
    setSaving(true);
    try {
      const teamAttendees = teamMembers
        .filter(m => selectedTeam.includes(m.id))
        .map(m => ({ user_id: m.id, name: m.full_name, email: m.email }));

      const payload = {
        client_id: client.id,
        client_name: client.company_name || [client.name, client.last_name].filter(Boolean).join(' '),
        client_email: client.email,
        engagement_letter_id: engagementLetter?.id,
        accountant_id: currentUser?.id,
        accountant_name: currentUser?.full_name,
        accountant_email: currentUser?.email,
        meeting_link: meetingLink,
        scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
        duration_minutes: duration,
        team_attendees: teamAttendees,
        status: 'pending_scheduling',
        scheduling_token: interview?.scheduling_token || generateToken(),
      };

      let saved;
      if (interview?.id) {
        await base44.entities.ClientInterview.update(interview.id, payload);
        saved = { ...interview, ...payload };
      } else {
        saved = await base44.entities.ClientInterview.create(payload);
      }
      setInterview(saved);
      toast.success('Interview saved — generating prep materials…');

      // Generate AI prep
      setGenerating(true);
      const result = await base44.functions.invoke('generateInterviewPrep', {
        clientId: client.id,
        interviewId: saved.id,
      });
      const updated = {
        ...saved,
        suggested_projects: result.data?.suggested_projects || [],
        document_checklist: result.data?.document_checklist || [],
        prep_generated_at: new Date().toISOString(),
      };
      setInterview(updated);
      setStep('prep');
      toast.success('Interview prep materials generated!');
    } catch (e) {
      toast.error('Failed to save interview: ' + (e?.response?.data?.error || e.message));
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  };

  const handleSendLink = async () => {
    if (!interview?.id) return;
    setSending(true);
    try {
      await base44.functions.invoke('sendInterviewSchedulingLink', { interviewId: interview.id });
      await base44.entities.ClientInterview.update(interview.id, { link_sent_at: new Date().toISOString() });
      setStep('sent');
      toast.success(`Scheduling link sent to ${client.email}`);
      onScheduled?.(interview);
    } catch (e) {
      toast.error('Failed to send link: ' + (e?.response?.data?.error || e.message));
    } finally {
      setSending(false);
    }
  };

  const clientName = client?.company_name || [client?.name, client?.last_name].filter(Boolean).join(' ') || 'Client';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            Schedule Interview — {clientName}
          </DialogTitle>
        </DialogHeader>

        {step === 'setup' && (
          <div className="space-y-5">
            {/* Meeting Link */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-500" />
                Google Meet / Calendar Link
              </Label>
              <Input
                placeholder="https://meet.google.com/xxx-xxxx-xxx or Calendly link"
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
              />
              <p className="text-xs text-gray-500">The client will see "Schedule Your Appointment" — not the raw URL.</p>
            </div>

            {/* Date & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  Proposed Date & Time
                </Label>
                <Input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>

            {/* Team Attendees */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                Add Isla Team Members to Meeting
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {teamMembers.filter(m => m.id !== currentUser?.id).map(member => (
                  <label key={member.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedTeam.includes(member.id)}
                      onCheckedChange={checked => {
                        setSelectedTeam(prev =>
                          checked ? [...prev, member.id] : prev.filter(id => id !== member.id)
                        );
                      }}
                    />
                    <span>{member.full_name}</span>
                  </label>
                ))}
                {teamMembers.length === 0 && <p className="text-xs text-gray-400 col-span-2">No team members found</p>}
              </div>
              <p className="text-xs text-gray-500">The client can also add up to 2 additional attendees via the scheduling link.</p>
            </div>

            <Button
              onClick={handleSaveInterview}
              disabled={saving || generating}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {saving || generating ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {saving ? 'Saving…' : 'Generating prep materials…'}</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Save & Generate Prep Materials</>
              )}
            </Button>
          </div>
        )}

        {step === 'prep' && interview && (
          <div className="space-y-5">
            {/* Suggested Projects */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> AI-Suggested Projects
              </h3>
              <div className="space-y-2">
                {(interview.suggested_projects || []).map((proj, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
                    <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      proj.priority === 'high' || proj.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      proj.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                    }`}>{proj.priority}</div>
                    <div>
                      <p className="text-sm font-medium">{(proj.project_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                      <p className="text-xs text-gray-500">{proj.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Checklist */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Document Checklist for Client
              </h3>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {(interview.document_checklist || []).map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${doc.required ? 'bg-red-400' : 'bg-gray-300'}`} />
                    <span className="flex-1">{doc.item}</span>
                    <span className="text-xs text-gray-400">{doc.category}</span>
                    {doc.required && <span className="text-[10px] text-red-500 font-medium">Required</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 border-t pt-4">
              <Button variant="outline" onClick={() => setStep('setup')} className="flex-1">
                ← Edit Details
              </Button>
              <Button
                onClick={handleSendLink}
                disabled={sending || !interview.scheduling_token}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending…</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send Scheduling Link to Client</>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'sent' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Scheduling Link Sent!</h3>
              <p className="text-sm text-gray-500 mt-1">
                The client will receive an email with a <strong>"Schedule Your Appointment"</strong> link.<br />
                They can confirm attendees and review the prep checklist.
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="mt-2">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}