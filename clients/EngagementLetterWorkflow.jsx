import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  X, FileText, Loader2, CheckCircle2, Send, Edit3, ShieldCheck,
  AlertTriangle, Clock, PenLine, ExternalLink, Download, FolderKanban, Video
} from 'lucide-react';
import MessageBubble from '../agents/MessageBubble';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import InterviewSchedulerDialog from '../interviews/InterviewSchedulerDialog';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Edit3 },
  pending_review: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  sent: { label: 'Sent for Signature', color: 'bg-blue-100 text-blue-700', icon: Send },
  signed: { label: 'Signed', color: 'bg-emerald-100 text-emerald-700', icon: PenLine },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── AI Draft Tab ──────────────────────────────────────────────────
function DraftTab({ client, onDraftSaved }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cleanup = () => {};
    const init = async () => {
      const conv = await base44.agents.createConversation({
        agent_name: 'engagement_letter_generator',
        metadata: { name: `Engagement Letter - ${client.company_name || client.company_name}`, client_id: client.id },
      });
      setConversation(conv);
      setMessages(conv.messages || []);
      const unsub = base44.agents.subscribeToConversation(conv.id, (data) => setMessages(data.messages));
      cleanup = unsub;
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `Generate a professional engagement letter for client: ${client.company_name || [client.name, client.last_name].filter(Boolean).join(' ')}, Contact: ${client.contact_person || ''}, Email: ${client.email || ''}. Please ask about services needed and any other details required.`,
      });
    };
    init();
    return () => cleanup();
  }, [client]);

  const handleSend = async () => {
    if (!input.trim() || !conversation || sending) return;
    setSending(true);
    const text = input;
    setInput('');
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: text });
    } finally {
      setSending(false);
    }
  };

  const getLetterText = () => {
    const assistantMsgs = messages.filter(m => m.role === 'assistant' && m.content);
    return assistantMsgs.length ? assistantMsgs[assistantMsgs.length - 1].content : null;
  };

  const handleSaveForReview = async () => {
    const content = getLetterText();
    if (!content) { toast.error('Generate the letter first'); return; }
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const clientName = client.company_name || [client.name, client.last_name].filter(Boolean).join(' ');
      const letter = await base44.entities.EngagementLetter.create({
        client_id: client.id,
        client_name: clientName,
        client_email: client.email,
        content,
        status: 'pending_review',
        created_by_id: user.id,
        created_by_name: user.full_name,
        fiscal_year: String(new Date().getFullYear()),
      });
      toast.success('Letter saved and submitted for CPA review');
      onDraftSaved(letter);
    } catch (e) {
      toast.error('Failed to save letter');
    } finally {
      setSaving(false);
    }
  };

  const letterText = getLetterText();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Initializing AI assistant…
          </div>
        )}
      </div>
      <div className="border-t p-4 space-y-2 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Add instructions or refinements… (Shift+Enter for new line)"
            className="flex-1 min-h-[56px]"
          />
          <Button onClick={handleSend} disabled={!input.trim() || sending} className="self-end">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <Button
          className="w-full bg-amber-600 hover:bg-amber-700"
          onClick={handleSaveForReview}
          disabled={!letterText || saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
          Submit for CPA Review
        </Button>
      </div>
    </div>
  );
}

// ── CPA Review Tab ────────────────────────────────────────────────
function ReviewTab({ letter, currentUser, onUpdated }) {
  const [content, setContent] = useState(letter?.content || '');
  const [reviewNotes, setReviewNotes] = useState(letter?.review_notes || '');
  const [submitting, setSubmitting] = useState(false);

  const isCPA = currentUser?.role === 'admin' || ['cpa', 'senior_staff'].includes(currentUser?.team_category);

  const handleAction = async (action) => {
    setSubmitting(true);
    try {
      const updates = {
        content,
        review_notes: reviewNotes,
        reviewed_by_id: currentUser.id,
        reviewed_by_name: currentUser.full_name,
        reviewed_at: new Date().toISOString(),
        status: action,
      };
      await base44.entities.EngagementLetter.update(letter.id, updates);
      toast.success(action === 'approved' ? 'Letter approved! Ready to send.' : 'Letter rejected and returned to draft.');
      onUpdated({ ...letter, ...updates });
    } catch {
      toast.error('Failed to update letter');
    } finally {
      setSubmitting(false);
    }
  };

  if (!letter) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-8">
        <ShieldCheck className="w-12 h-12" />
        <p className="text-center text-sm">No letter submitted for review yet.<br />Generate a draft in the AI Draft tab first.</p>
      </div>
    );
  }

  if (letter.status === 'draft') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-8">
        <Clock className="w-12 h-12" />
        <p className="text-center text-sm">Letter is still being drafted. Submit it for review first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-y-auto">
      {/* Status banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={letter.status} />
          {letter.reviewed_at && (
            <span className="text-xs text-gray-500">
              Reviewed by {letter.reviewed_by_name} on {format(new Date(letter.reviewed_at), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      {/* Content editor */}
      <div className="flex-1 space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <Edit3 className="w-3.5 h-3.5" /> Letter Content {isCPA && <span className="text-xs text-amber-600 font-normal">(editable by CPA)</span>}
        </label>
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          disabled={!isCPA || !['pending_review', 'approved'].includes(letter.status)}
          className="min-h-[280px] font-mono text-sm"
        />
      </div>

      {/* Review notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Review Notes</label>
        <Textarea
          value={reviewNotes}
          onChange={e => setReviewNotes(e.target.value)}
          placeholder="Add comments or notes about this review…"
          disabled={!isCPA}
          className="min-h-[80px]"
        />
      </div>

      {/* CPA action buttons */}
      {isCPA && letter.status === 'pending_review' && (
        <div className="flex gap-3 pt-2 border-t">
          <Button
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => handleAction('draft')}
            disabled={submitting}
          >
            <AlertTriangle className="w-4 h-4 mr-2" /> Request Revisions
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => handleAction('approved')}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Approve Letter
          </Button>
        </div>
      )}

      {letter.status === 'approved' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">This letter has been approved and is ready to be sent for signature.</p>
        </div>
      )}
    </div>
  );
}

// ── Send & Signature Tab ──────────────────────────────────────────
function SendTab({ letter, client, onUpdated, onScheduleInterview }) {
  const [sending, setSending] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (!client?.id) return;
    setLoadingProjects(true);
    base44.entities.Project.filter({ client_id: client.id })
      .then(p => setProjects(p.filter(pr => pr.status !== 'completed')))
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, [client?.id]);

  const handleSend = async () => {
    setSending(true);
    try {
      await base44.functions.invoke('sendEngagementLetterDocuseal', {
        engagementLetterId: letter.id,
        projectId: selectedProjectId || undefined,
      });
      const updated = await base44.entities.EngagementLetter.filter({ client_id: client.id });
      const refreshed = updated.find(l => l.id === letter.id);
      if (refreshed) onUpdated(refreshed);
      toast.success(`Engagement letter sent to ${letter.client_email || client.email} for signature${selectedProjectId ? ' — project marked In Progress' : ''}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to send letter');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPreview = async () => {
    if (!letter?.content) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Isla Accompting Corp', 20, 20);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('2325 Wiley St, Hollywood, FL 33020', 20, 27);
    doc.text('Phone: (305) 290-1145 | Email: info@islaccounting.com', 20, 32);
    doc.line(20, 36, 190, 36);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(letter.content, 170);
    let y = 44;
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 6;
    }
    doc.save(`Engagement_Letter_${(letter.client_name || '').replace(/\s+/g, '_')}.pdf`);
  };

  if (!letter) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-8">
        <Send className="w-12 h-12" />
        <p className="text-center text-sm">Complete the draft and CPA review first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 h-full overflow-y-auto">
      {/* Status timeline */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Document Timeline</h3>
        {[
          { key: 'draft', label: 'Draft Created', done: true, date: letter.created_date },
          { key: 'pending_review', label: 'Submitted for Review', done: ['pending_review','approved','sent','signed'].includes(letter.status) },
          { key: 'approved', label: 'CPA Approved', done: ['approved','sent','signed'].includes(letter.status), date: letter.reviewed_at, by: letter.reviewed_by_name },
          { key: 'sent', label: 'Sent for Signature', done: ['sent','signed'].includes(letter.status), date: letter.sent_at },
          { key: 'signed', label: 'Client Signed', done: letter.status === 'signed', date: letter.signed_at },
        ].map(step => (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-green-500' : 'bg-gray-200'}`}>
              {step.done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</p>
              {step.date && <p className="text-xs text-gray-400">{format(new Date(step.date), 'MMM d, yyyy h:mm a')}{step.by ? ` · ${step.by}` : ''}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Action area */}
      <div className="border-t pt-4 space-y-3">
        <Button variant="outline" className="w-full" onClick={handleDownloadPreview} disabled={!letter?.content}>
          <Download className="w-4 h-4 mr-2" /> Download Preview PDF
        </Button>

        {letter.status === 'approved' && (
          <div className="space-y-3">
            {/* Link to project */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-blue-500" />
                Link to Project <span className="text-gray-400 font-normal text-xs">(optional — auto-updates status on signing)</span>
              </label>
              {loadingProjects ? (
                <div className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {(p.project_type || 'Project').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      {p.due_date ? ` · Due ${p.due_date}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {selectedProjectId && (
                <p className="text-xs text-blue-600">✓ Project will be marked <strong>In Progress</strong> when sent and <strong>Completed</strong> upon client signing.</p>
              )}
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send to Client for Signature (DocuSeal)
            </Button>
          </div>
        )}

        {letter.status === 'sent' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Awaiting client signature
            </p>
            <p className="text-xs text-blue-600">Sent to <strong>{letter.client_email || client.email}</strong> via DocuSeal. The signed document will automatically be attached to Drive upon completion.</p>
            {letter.docuseal_signer_link && (
              <a href={letter.docuseal_signer_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-700 underline">
                <ExternalLink className="w-3 h-3" /> View in DocuSeal
              </a>
            )}
          </div>
        )}

        {letter.status === 'signed' && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
            <p className="text-sm font-medium text-emerald-800 flex items-center gap-2">
              <PenLine className="w-4 h-4" /> Signed & complete!
            </p>
            <p className="text-xs text-emerald-700">The signed document has been automatically saved to the client's Google Drive folder.</p>
            {letter.signed_document_url && (
              <a href={letter.signed_document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-700 underline">
                <ExternalLink className="w-3 h-3" /> View Signed Document
              </a>
            )}
            <Button
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => onScheduleInterview?.()}
            >
              <Video className="w-4 h-4 mr-2" />
              Schedule Client Interview
            </Button>
          </div>
        )}

        {!['approved','sent','signed'].includes(letter?.status) && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              The letter must be <strong>approved by a CPA</strong> before it can be sent.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Existing Letters Panel ────────────────────────────────────────
function ExistingLettersList({ letters, selectedId, onSelect }) {
  if (!letters.length) return null;
  return (
    <div className="border-b px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Previous Letters</p>
      <div className="flex flex-wrap gap-2">
        {letters.map(l => (
          <button
            key={l.id}
            onClick={() => onSelect(l)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
              selectedId === l.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-400'
            }`}
          >
            <FileText className="w-3 h-3" />
            {l.fiscal_year || 'N/A'} · <StatusBadge status={l.status} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function EngagementLetterWorkflow({ client, onClose }) {
  const [currentLetter, setCurrentLetter] = useState(null);
  const [allLetters, setAllLetters] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('draft');
  const [showInterviewScheduler, setShowInterviewScheduler] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [user, letters] = await Promise.all([
        base44.auth.me(),
        base44.entities.EngagementLetter.filter({ client_id: client.id }, '-created_date'),
      ]);
      setCurrentUser(user);
      setAllLetters(letters);
      if (letters.length) {
        const latest = letters[0];
        setCurrentLetter(latest);
        // Auto-navigate to the right tab
        if (['pending_review', 'approved'].includes(latest.status)) setActiveTab('review');
        else if (['sent', 'signed'].includes(latest.status)) setActiveTab('send');
      }
      setLoading(false);
    };
    init();
  }, [client]);

  const handleDraftSaved = (letter) => {
    setCurrentLetter(letter);
    setAllLetters(prev => [letter, ...prev]);
    setActiveTab('review');
  };

  const handleLetterUpdated = (updated) => {
    setCurrentLetter(updated);
    setAllLetters(prev => prev.map(l => l.id === updated.id ? updated : l));
    if (updated.status === 'approved') setActiveTab('send');
    if (updated.status === 'draft') setActiveTab('draft');
  };

  const clientName = client.company_name || [client.name, client.last_name].filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="flex flex-col w-full max-w-3xl h-[90vh] shadow-2xl">
        {/* Header */}
        <CardHeader className="flex-shrink-0 border-b py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Engagement Letter</CardTitle>
                <p className="text-xs text-gray-500">{clientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentLetter && <StatusBadge status={currentLetter.status} />}
              <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardHeader>

        {/* Previous letters */}
        {allLetters.length > 0 && (
          <ExistingLettersList
            letters={allLetters}
            selectedId={currentLetter?.id}
            onSelect={l => { setCurrentLetter(l); setActiveTab('review'); }}
          />
        )}

        {/* Tabs */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="flex-shrink-0 mx-4 mt-3 grid w-auto grid-cols-3">
              <TabsTrigger value="draft" className="text-xs">
                <Edit3 className="w-3.5 h-3.5 mr-1" /> AI Draft
              </TabsTrigger>
              <TabsTrigger value="review" className="text-xs">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> CPA Review
                {currentLetter?.status === 'pending_review' && (
                  <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                )}
              </TabsTrigger>
              <TabsTrigger value="send" className="text-xs">
                <Send className="w-3.5 h-3.5 mr-1" /> Send & Sign
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draft" className="flex-1 min-h-0 overflow-hidden mt-0">
              <DraftTab client={client} onDraftSaved={handleDraftSaved} />
            </TabsContent>
            <TabsContent value="review" className="flex-1 min-h-0 overflow-hidden mt-0">
              <ReviewTab letter={currentLetter} currentUser={currentUser} onUpdated={handleLetterUpdated} />
            </TabsContent>
            <TabsContent value="send" className="flex-1 min-h-0 overflow-hidden mt-0">
              <SendTab letter={currentLetter} client={client} onUpdated={handleLetterUpdated} onScheduleInterview={() => setShowInterviewScheduler(true)} />
            </TabsContent>
          </Tabs>
        )}
      </Card>

      {showInterviewScheduler && (
        <InterviewSchedulerDialog
          client={client}
          engagementLetter={currentLetter}
          open={showInterviewScheduler}
          onOpenChange={setShowInterviewScheduler}
          onScheduled={() => setShowInterviewScheduler(false)}
        />
      )}
    </div>
  );
}