import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSignature, Send, Loader2, AlertCircle, FolderKanban } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Dialog to send a Tax Return Authorization (Form 8879) directly from a client Drive file.
 * Supports linking a project so the webhook can auto-update project status when signed.
 */
export default function TaxAuthorizationDialog({ open, onOpenChange, client }) {
  const currentYear = new Date().getFullYear();
  const [driveFileId, setDriveFileId] = useState('');
  const [year, setYear] = useState(String(currentYear - 1));
  const [sending, setSending] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);

  const clientName = client?.company_name || [client?.name, client?.last_name].filter(Boolean).join(' ') || '';
  const clientEmail = client?.email || '';

  useEffect(() => {
    if (!open || !client?.id) return;
    setLoadingProjects(true);
    base44.entities.Project.filter({ client_id: client.id })
      .then(p => setProjects(p.filter(pr => pr.status !== 'completed')))
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, [open, client?.id]);

  const handleSend = async () => {
    if (!driveFileId.trim()) {
      toast.error('Please enter the Google Drive file ID');
      return;
    }
    if (!clientEmail) {
      toast.error('Client has no email address on file');
      return;
    }

    setSending(true);
    try {
      const user = await base44.auth.me();
      const res = await base44.functions.invoke('sendDocusealRequest', {
        clientId: client.id,
        clientName,
        clientEmail,
        driveFileId: driveFileId.trim(),
        driveFileName: `Form_8879_${year}.pdf`,
        year,
        preparerEmail: user?.email,
        preparerName: user?.full_name,
        projectId: selectedProjectId || undefined,
      });

      if (res.data?.error) throw new Error(res.data.error);

      toast.success(`Form 8879 sent to ${clientEmail} for signature via DocuSeal${selectedProjectId ? ' — project marked In Progress' : ''}`);
      onOpenChange(false);
      setDriveFileId('');
      setSelectedProjectId('');
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || 'Failed to send form');
    } finally {
      setSending(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 1 - i));

  const projectTypeLabel = (type) => {
    if (!type) return 'Unnamed Project';
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-violet-600" />
            Send Tax Return Authorization
          </DialogTitle>
          <DialogDescription>
            Send Form 8879 (IRS e-file Authorization) to <strong>{clientName || 'client'}</strong> for electronic signature via DocuSeal.
            When signed, the project status will update automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Client email check */}
          {!clientEmail && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>No email on file. Please add the client's email before sending.</span>
            </div>
          )}

          {/* Tax year */}
          <div className="space-y-1.5">
            <Label>Tax Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Drive file ID */}
          <div className="space-y-1.5">
            <Label htmlFor="driveFileId">Google Drive File ID</Label>
            <Input
              id="driveFileId"
              value={driveFileId}
              onChange={e => setDriveFileId(e.target.value)}
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            />
            <p className="text-xs text-slate-500">
              Open the PDF in Google Drive → copy the ID from the URL: <code>/d/</code><em>FILE_ID</em><code>/</code>
            </p>
          </div>

          {/* Link to project */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-violet-500" />
              Link to Project <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            {loadingProjects ? (
              <div className="text-xs text-slate-500 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Loading projects…</div>
            ) : (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project to auto-update on signing…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {projectTypeLabel(p.project_type)} {p.due_date ? `· Due ${p.due_date}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedProjectId && (
              <p className="text-xs text-violet-600">✓ Project will be marked <strong>In Progress</strong> when sent and <strong>Completed</strong> upon signing.</p>
            )}
          </div>

          {/* Recipient */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
            <Send className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
            Sending to: <strong>{clientEmail || '—'}</strong>
          </div>

          <Button
            className="w-full bg-violet-600 hover:bg-violet-700"
            onClick={handleSend}
            disabled={sending || !clientEmail || !driveFileId.trim()}
          >
            {sending
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</>
              : <><FileSignature className="w-4 h-4 mr-2" />Send for Signature</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}