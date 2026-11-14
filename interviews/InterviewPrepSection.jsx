import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar, CheckCircle2, FileText, Users, Video, Edit3, Save,
  AlertTriangle, Loader2, Sparkles, Clock, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

const STATUS_COLORS = {
  pending_scheduling: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function InterviewPrepSection({ interview, onUpdated, currentUser }) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(interview.meeting_notes || '');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await base44.entities.ClientInterview.update(interview.id, { meeting_notes: notes });
      onUpdated?.({ ...interview, meeting_notes: notes });
      setEditingNotes(false);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkComplete = async (scopeChanged = false) => {
    setMarkingComplete(true);
    try {
      const updates = {
        status: 'completed',
        scope_changed: scopeChanged,
      };
      await base44.entities.ClientInterview.update(interview.id, updates);
      onUpdated?.({ ...interview, ...updates });
      toast.success('Interview marked as completed');
    } catch {
      toast.error('Failed to update interview');
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleRegeneratePrep = async () => {
    setRegenerating(true);
    try {
      const result = await base44.functions.invoke('generateInterviewPrep', {
        clientId: interview.client_id,
        interviewId: interview.id,
      });
      onUpdated?.({
        ...interview,
        suggested_projects: result.data?.suggested_projects || interview.suggested_projects,
        document_checklist: result.data?.document_checklist || interview.document_checklist,
        prep_generated_at: new Date().toISOString(),
      });
      toast.success('Prep materials refreshed');
    } catch {
      toast.error('Failed to regenerate prep');
    } finally {
      setRegenerating(false);
    }
  };

  const isUpcoming = ['pending_scheduling', 'scheduled'].includes(interview.status);

  return (
    <Card className={`border-l-4 ${isUpcoming ? 'border-l-blue-500' : 'border-l-green-500'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-600" />
            {isUpcoming ? 'Upcoming Interview' : 'Interview Record'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[interview.status] || 'bg-gray-100 text-gray-700'}`}>
              {interview.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Meeting Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {interview.scheduled_date && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>{formatDate(interview.scheduled_date)} · {interview.duration_minutes || 60} min</span>
            </div>
          )}
          {interview.accountant_name && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>With {interview.accountant_name}</span>
            </div>
          )}
          {interview.link_sent_at && (
            <div className="flex items-center gap-2 text-gray-500 col-span-2">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">Scheduling link sent {formatDate(interview.link_sent_at)}</span>
            </div>
          )}
        </div>

        {/* Meeting Link */}
        {interview.meeting_link && (
          <a
            href={interview.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Video className="w-4 h-4" />
            Join Meeting
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* Team Attendees */}
        {interview.team_attendees?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Isla Staff Attending</p>
            <div className="flex flex-wrap gap-1.5">
              {interview.team_attendees.map((a, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Client Additional Attendees */}
        {interview.client_additional_attendees?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Client's Additional Attendees</p>
            <div className="flex flex-wrap gap-1.5">
              {interview.client_additional_attendees.map((a, i) => (
                <span key={i} className="text-xs bg-gray-50 text-gray-700 px-2 py-0.5 rounded-full border">
                  {a.name} {a.email && <span className="text-gray-400">({a.email})</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Projects */}
        {(interview.suggested_projects?.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Suggested Projects
              </p>
              <button
                onClick={handleRegeneratePrep}
                disabled={regenerating}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
              </button>
            </div>
            <div className="space-y-1.5">
              {interview.suggested_projects.map((proj, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 bg-amber-50 rounded border border-amber-100">
                  <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${
                    proj.priority === 'high' || proj.priority === 'urgent' ? 'border-red-300 text-red-600' : 'border-amber-300 text-amber-600'
                  }`}>
                    {proj.priority}
                  </Badge>
                  <div>
                    <p className="font-medium text-xs">{(proj.project_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                    <p className="text-xs text-gray-500">{proj.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Checklist */}
        {(interview.document_checklist?.length > 0) && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-green-500" /> Document Checklist
            </p>
            <div className="space-y-1">
              {interview.document_checklist.map((doc, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${doc.required ? 'bg-red-400' : 'bg-gray-300'}`} />
                  <span className="flex-1">{doc.item}</span>
                  {doc.required && <span className="text-red-500 text-[10px]">Required</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meeting Notes (post-interview) */}
        {interview.status === 'completed' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5" /> Meeting Notes
              </p>
              {!editingNotes && (
                <button onClick={() => setEditingNotes(true)} className="text-xs text-blue-500 hover:text-blue-700">Edit</button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Notes from the meeting, scope changes, action items…"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNotes} disabled={saving}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 bg-gray-50 rounded p-2 whitespace-pre-wrap">
                {notes || <span className="text-gray-400 italic">No notes yet</span>}
              </p>
            )}
          </div>
        )}

        {/* Scope Changed Banner */}
        {interview.scope_changed && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Scope changed — a new engagement letter should be generated and sent.
          </div>
        )}

        {/* Action Buttons for upcoming/scheduled */}
        {isUpcoming && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkComplete(false)}
              disabled={markingComplete}
              className="flex-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Mark Completed
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkComplete(true)}
              disabled={markingComplete}
              className="flex-1 text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              Scope Changed
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}