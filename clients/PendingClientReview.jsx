import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Trash2, Eye, Building2, User, Mail, Phone, Clock, ShieldCheck, MapPin, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}

function ClientReviewDialog({ client, open, onClose, onApprove, onReject }) {
  const isEntity = !!client?.incorporated_as;
  const clientName = isEntity
    ? client?.company_name
    : [client?.name, client?.middle_name, client?.last_name].filter(Boolean).join(' ') || client?.company_name;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEntity ? <Building2 className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-blue-600" />}
            Review — {clientName}
            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">Pending</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Security note */}
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-700">Data submitted by client — encrypted in transit and at rest.</p>
          </div>

          {/* Contact */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" value={client?.email} />
              <Field label="Phone" value={client?.phone} />
              <Field label="Address" value={client?.address} />
              <Field label="City" value={client?.city} />
              <Field label="State" value={client?.state} />
              <Field label="ZIP Code" value={client?.zip_code} />
            </div>
          </section>

          {/* Individual */}
          {!isEntity && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Personal Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" value={client?.name} />
                <Field label="Middle Name" value={client?.middle_name} />
                <Field label="Last Name" value={client?.last_name} />
                <Field label="Date of Birth" value={client?.dob} />
                <Field label="SSN" value={client?.ssn ? '•••-••-' + client.ssn.slice(-4) : null} />
                <Field label="Filing Status" value={client?.filing_status?.replace(/_/g, ' ')} />
                <Field label="Dependents" value={client?.dependents} />
                <Field label="Driver's License ID" value={client?.dl_id} />
                <Field label="DL Issue Date" value={client?.dl_issued} />
                <Field label="DL Expiry Date" value={client?.dl_expire} />
              </div>
            </section>
          )}

          {/* Entity */}
          {isEntity && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Business Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company Name" value={client?.company_name} />
                <Field label="Contact Person" value={client?.contact_person} />
                <Field label="EIN" value={client?.ein} />
                <Field label="Incorporated As" value={client?.incorporated_as} />
                <Field label="Taxed As" value={client?.taxed_as} />
                <Field label="Fiscal Year End" value={client?.year_end} />
              </div>
            </section>
          )}

          {/* Banking */}
          {(client?.bank_name || client?.bank_routing || client?.bank_account) && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Banking Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bank Name" value={client?.bank_name} />
                <Field label="Account Type" value={client?.account_type} />
                <Field label="Routing Number" value={client?.bank_routing ? '•••••' + client.bank_routing.slice(-4) : null} />
                <Field label="Account Number" value={client?.bank_account ? '•••••' + client.bank_account.slice(-4) : null} />
              </div>
            </section>
          )}

          {/* Notes */}
          {client?.notes && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Notes</h3>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{client.notes}</p>
            </section>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t">
            <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700 flex-1">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve & Activate
            </Button>
            <Button onClick={onReject} variant="outline" className="text-red-600 hover:text-red-700 hover:border-red-500">
              <Trash2 className="w-4 h-4 mr-2" />
              Reject & Delete
            </Button>
            <Button onClick={onClose} variant="ghost">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PendingClientReview() {
  const queryClient = useQueryClient();
  const [reviewingClient, setReviewingClient] = useState(null);

  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('client_number'),
  });

  const pendingClients = allClients.filter(c => c.status === 'pending');

  if (pendingClients.length === 0) return null;

  const handleApprove = async (client) => {
    try {
      await base44.entities.Client.update(client.id, { status: 'active' });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`${client.company_name || client.name || 'Client'} approved and activated!`);
      setReviewingClient(null);
    } catch {
      toast.error('Failed to approve client');
    }
  };

  const handleReject = async (client) => {
    if (!window.confirm('Delete this pending client registration? This cannot be undone.')) return;
    try {
      await base44.entities.Client.delete(client.id);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Pending client removed');
      setReviewingClient(null);
    } catch {
      toast.error('Failed to delete client');
    }
  };

  return (
    <>
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-amber-900">
            <Clock className="w-5 h-5 text-amber-600" />
            Pending Client Approvals ({pendingClients.length})
            <span className="text-xs font-normal text-amber-700 ml-1">— Review and approve clients who submitted their intake data</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pendingClients.map((client) => {
              const isEntity = !!client.incorporated_as;
              const clientName = isEntity
                ? client.company_name
                : [client.name, client.last_name].filter(Boolean).join(' ') || client.company_name || 'Unknown';

              return (
                <div key={client.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEntity ? 'bg-blue-100' : 'bg-violet-100'}`}>
                      {isEntity ? <Building2 className="w-4 h-4 text-blue-600" /> : <User className="w-4 h-4 text-violet-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{clientName}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
                        {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{isEntity ? 'Entity' : 'Individual'}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewingClient(client)}
                      className="text-blue-600 hover:text-blue-700 hover:border-blue-400"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(client)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(client)}
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
      </Card>

      {reviewingClient && (
        <ClientReviewDialog
          client={reviewingClient}
          open={!!reviewingClient}
          onClose={() => setReviewingClient(null)}
          onApprove={() => handleApprove(reviewingClient)}
          onReject={() => handleReject(reviewingClient)}
        />
      )}
    </>
  );
}