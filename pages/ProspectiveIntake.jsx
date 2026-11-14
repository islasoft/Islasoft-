import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, FileText, Shield, Loader2, Building2, User } from 'lucide-react';

export default function ProspectiveIntake() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filingType, setFilingType] = useState('');
  const [form, setForm] = useState({
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

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!filingType) return;
    setSubmitting(true);
    try {
      await base44.entities.ProspectiveClient.create({
        ...form,
        filing_type: filingType,
        status: 'pending_review',
      });
      setSubmitted(true);
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl text-center">
          <CardContent className="py-12 space-y-5">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Thank You!</h2>
              <p className="text-slate-600 mt-2">
                Your information has been received. Our team will review your submission and reach out within 1–2 business days.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
              <Shield className="w-4 h-4 inline mr-1" />
              Your information is encrypted and kept strictly confidential.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-sky-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-slate-800">Isla Accounting Corp</h1>
              <p className="text-sm text-slate-500">Licensed CPA Firm</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Prospective Client Intake</h2>
          <p className="text-slate-600 mt-2">Please fill out the form below so we can get started.</p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5" />
            Secure form — your information is encrypted and confidential
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Filing Type */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Are you filing as an individual or business entity? *</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setFilingType('individual')}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      filingType === 'individual'
                        ? 'border-sky-500 bg-sky-50 text-sky-800'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <User className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Individual</p>
                      <p className="text-xs text-slate-500 mt-0.5">Personal tax return</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilingType('entity')}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      filingType === 'entity'
                        ? 'border-sky-500 bg-sky-50 text-sky-800'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Building2 className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Business Entity</p>
                      <p className="text-xs text-slate-500 mt-0.5">LLC, Corp, Partnership…</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Individual fields */}
              {filingType === 'individual' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={e => set('full_name', e.target.value)}
                      placeholder="First Middle Last"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={form.dob}
                      onChange={e => set('dob', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Entity fields */}
              {filingType === 'entity' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={form.company_name}
                      onChange={e => set('company_name', e.target.value)}
                      placeholder="Acme LLC"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="entity_type">Entity Type</Label>
                    <select
                      id="entity_type"
                      value={form.entity_type}
                      onChange={e => set('entity_type', e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Select type…</option>
                      <option>LLC</option>
                      <option>Corporation</option>
                      <option>S-Corp</option>
                      <option>Partnership</option>
                      <option>Sole Proprietorship</option>
                      <option>Nonprofit</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_name">Contact Person Name</Label>
                    <Input
                      id="contact_name"
                      value={form.full_name}
                      onChange={e => set('full_name', e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>
              )}

              {/* Common contact fields */}
              {filingType && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        placeholder="(305) 555-0100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={e => set('address', e.target.value)}
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Miami" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="state">State</Label>
                      <Input id="state" value={form.state} onChange={e => set('state', e.target.value)} placeholder="FL" maxLength={2} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="zip_code">ZIP Code</Label>
                      <Input id="zip_code" value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="33020" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Questions or Notes</Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={e => set('notes', e.target.value)}
                      placeholder="Tell us about your tax situation, questions, or any other details…"
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-600">
                    By submitting this form, you acknowledge that the information provided is accurate to the best of your knowledge.
                    Isla Accounting Corp will keep your information strictly confidential per our privacy policy and professional standards.
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white h-11 text-base font-semibold"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</>
                    ) : (
                      'Submit Intake Form'
                    )}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}