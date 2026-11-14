import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  UserPlus, Eye, Trash2, CheckCircle, Clock, Building2, User,
  Mail, Phone, MapPin, ShieldCheck, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}

function ProspectDetailDialog({ prospect, open, onClose, onApprove, onReject }) {
  const isEntity = prospect?.filing_type === 'entity';
  const displayName = isEntity
    ? prospect?.company_name
    : prospect?.full_name || prospect?.company_name || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEntity ? <Building2 className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-blue-600" />}
            Prospect Review — {displayName}
            <Badge className="ml-2 bg-amber-100 text-amber-700 border-0">Pending Review</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-700">Submitted via secure public intake form. Data encrypted in transit and at rest.</p>
          </div>

          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Filing Type</h3>
            <Badge variant="outline" className="capitalize">{prospect?.filing_type}</Badge>
            {prospect?.entity_type && <Badge variant="outline" className="ml-2">{prospect.entity_type}</Badge>}
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" value={prospect?.full_name} />
              <Field label="Company Name" value={prospect?.company_name} />
              <Field label="Email" value={prospect?.email} />
              <Field label="Phone" value={prospect?.phone} />
              <Field label="Date of Birth" value={prospect?.dob ? formatDate(prospect.dob) : null} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Address</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Street" value={prospect?.address} />
              <Field label="City" value={prospect?.city} />
              <Field label="State" value={prospect?.state} />
              <Field label="ZIP" value={prospect?.zip_code} />
            </div>
          </section>

          {prospect?.notes && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Notes / Questions</h3>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{prospect.notes}</p>
            </section>
          )}

          <div className="text-xs text-slate-400">
            Submitted: {prospect?.created_date ? formatDate(prospect.created_date) : '—'}
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700 flex-1 gap-2">
              <UserPlus className="w-4 h-4" />
              Approve &amp; Create Client
            </Button>
            <Button onClick={onReject} variant="outline" className="text-red-600 hover:text-red-700 hover:border-red-500 gap-2">
              <Trash2 className="w-4 h-4" />
              Reject
            </Button>
            <Button onClick={onClose} variant="ghost">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProspectiveClientReview() {
  const queryClient = useQueryClient();
  const [reviewingProspect, setReviewingProspect] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ['prospective_clients'],
    queryFn: () => base44.entities.ProspectiveClient.filter({ status: 'pending_review' }, '-created_date'),
    enabled: !!currentUser,
  });

  if (isLoading || prospects.length === 0) return null;

  const handleApprove = async (prospect) => {
    try {
      const user = await base44.auth.me();
      const isEntity = prospect.filing_type === 'entity';

      // Build client record from prospect
      const clientData = {
        email: prospect.email,
        phone: prospect.phone,
        address: prospect.address,
        city: prospect.city,
        state: prospect.state,
        zip_code: prospect.zip_code,
        notes: prospect.notes,
        status: 'active',
        manager_id: user.id,
        manager_name: user.full_name,
      };

      if (isEntity) {
        clientData.company_name = prospect.company_name || prospect.full_name;
        clientData.contact_person = prospect.full_name;
        clientData.incorporated_as = prospect.entity_type || 'LLC';
      } else {
        // Parse full_name into first/last
        const nameParts = (prospect.full_name || '').trim().split(' ');
        clientData.name = nameParts[0] || '';
        clientData.last_name = nameParts.slice(1).join(' ') || '';
        clientData.dob = prospect.dob;
      }

      const newClient = await base44.entities.Client.create(clientData);

      // Mark prospect as approved
      await base44.entities.ProspectiveClient.update(prospect.id, {
        status: 'approved',
        converted_client_id: newClient.id,
        reviewed_by_id: user.id,
        reviewed_by_name: user.full_name,
        reviewed_at: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['prospective_clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Client created: ${clientData.company_name || clientData.name + ' ' + clientData.last_name}`);
      setReviewingProspect(null);
    } catch {
      toast.error('Failed to create client from prospect');
    }
  };

  const handleReject = async (prospect) => {
    if (!window.confirm('Reject and delete this prospect submission? This cannot be undone.')) return;
    try {
      const user = await base44.auth.me();
      await base44.entities.ProspectiveClient.update(prospect.id, {
        status: 'rejected',
        reviewed_by_id: user.id,
        reviewed_by_name: user.full_name,
        reviewed_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['prospective_clients'] });
      toast.success('Prospect rejected');
      setReviewingProspect(null);
    } catch {
      toast.error('Failed to reject prospect');
    }
  };

  return (
    <>
      <Card className="border-sky-200 bg-sky-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-sky-900">
              <Clock className="w-5 h-5 text-sky-600" />
              Prospective Clients — Pending Review ({prospects.length})
              <span className="text-xs font-normal text-sky-700 ml-1">— Submitted via intake form</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(v => !v)} className="text-sky-600">
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
            </Button>
          </div>
        </CardHeader>
        {expanded && (
          <CardContent>
            <div className="space-y-2">
              {prospects.map((prospect) => {
                const isEntity = prospect.filing_type === 'entity';
                const displayName = isEntity
                  ? prospect.company_name
                  : prospect.full_name || prospect.company_name || 'Unknown';

                return (
                  <div key={prospect.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-sky-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEntity ? 'bg-blue-100' : 'bg-violet-100'}`}>
                        {isEntity ? <Building2 className="w-4 h-4 text-blue-600" /> : <User className="w-4 h-4 text-violet-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{displayName}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {prospect.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{prospect.email}</span>}
                          {prospect.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{prospect.phone}</span>}
                          <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">{prospect.filing_type}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewingProspect(prospect)}
                        className="text-blue-600 hover:text-blue-700 hover:border-blue-400"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(prospect)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(prospect)}
                        className="text-red-600 hover:text-red-700 hover:border-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {reviewingProspect && (
        <ProspectDetailDialog
          prospect={reviewingProspect}
          open={!!reviewingProspect}
          onClose={() => setReviewingProspect(null)}
          onApprove={() => handleApprove(reviewingProspect)}
          onReject={() => handleReject(reviewingProspect)}
        />
      )}
    </>
  );
}