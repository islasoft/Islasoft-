import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, ClipboardList, Shield } from 'lucide-react';
import { toast } from 'sonner';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function ProspectiveClientIntake() {
  const [form, setForm] = useState({
    filing_type: '',
    full_name: '',
    company_name: '',
    dob: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    entity_type: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.filing_type) { toast.error('Please select a filing type'); return; }
    if (form.filing_type === 'individual' && !form.full_name) { toast.error('Please enter your full name'); return; }
    if (form.filing_type === 'entity' && !form.company_name) { toast.error('Please enter your company name'); return; }
    if (!form.email) { toast.error('Please enter your email'); return; }

    setSubmitting(true);
    const payload = {
      filing_type: form.filing_type,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city,
      state: form.state,
      zip_code: form.zip_code,
      notes: form.notes,
      status: 'pending_review',
    };
    if (form.filing_type === 'individual') {
      payload.full_name = form.full_name;
      if (form.dob) payload.dob = form.dob;
    } else {
      payload.company_name = form.company_name;
      if (form.entity_type) payload.entity_type = form.entity_type;
    }

    try {
      await base44.entities.ProspectiveClient.create(payload);
      setSubmitted(true);
    } catch (err) {
      toast.error('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
          <p className="text-slate-600 text-sm">
            Your information has been received. A member of our team will review your submission and reach out to you shortly.
          </p>
          <p className="text-slate-500 text-xs mt-4">Isla Accounting Corp · <a href="mailto:info@islaaccounting.com" className="text-sky-600 hover:underline">info@islaaccounting.com</a></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Isla Accounting Corp</h1>
            <p className="text-xs text-slate-500">Prospective Client Intake</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Security notice */}
        <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg px-4 py-3 mb-6">
          <Shield className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-sky-700">Your information is encrypted and only used to set up your account with Isla Accounting Corp. We will never share or sell your data.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Prospective Client Intake Form</h2>
          <p className="text-sm text-slate-500 mb-6">Please fill out the form below so we can get started. Fields marked * are required.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Filing Type */}
            <div className="space-y-1.5">
              <Label>Filing Type *</Label>
              <Select value={form.filing_type} onValueChange={(v) => set('filing_type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select filing type…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual / Personal</SelectItem>
                  <SelectItem value="entity">Business / Entity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Individual fields */}
            {form.filing_type === 'individual' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input id="full_name" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
                </div>
              </>
            )}

            {/* Entity fields */}
            {form.filing_type === 'entity' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input id="company_name" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Acme Corp LLC" />
                </div>
                <div className="space-y-1.5">
                  <Label>Entity Type</Label>
                  <Select value={form.entity_type} onValueChange={v => set('entity_type', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {['LLC','Corporation','S-Corp','Partnership','Sole Proprietorship','Nonprofit'].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(305) 555-1234" />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Street Address</Label>
              <Input id="address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-1 sm:col-span-1">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Miami" />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={form.state} onValueChange={v => set('state', v)}>
                  <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>
                    {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input id="zip_code" value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="33101" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Questions or Additional Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any questions or information you'd like to share…" rows={3} />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white text-base py-3 h-auto"
            >
              {submitting ? 'Submitting…' : 'Submit Intake Form'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">© {new Date().getFullYear()} Isla Accounting Corp. All rights reserved.</p>
      </div>
    </div>
  );
}