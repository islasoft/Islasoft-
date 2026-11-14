import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Loader2, AlertTriangle, Building2, User, ShieldCheck, Clock, ExternalLink, FileCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ClientOnboarding() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | invalid | ready | submitted
  const [client, setClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [affirmed, setAffirmed] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    lookupToken();
  }, [token]);

  const lookupToken = async () => {
    try {
      const result = await base44.functions.invoke('lookupClientByToken', { token });
      if (result.data?.client) {
        const c = result.data.client;
        setClient(c);
        setFormData({
          name: c.name || '',
          middle_name: c.middle_name || '',
          last_name: c.last_name || '',
          company_name: c.company_name || '',
          contact_person: c.contact_person || '',
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          city: c.city || '',
          state: c.state || '',
          zip_code: c.zip_code || '',
          ein: c.ein || '',
          incorporated_as: c.incorporated_as || '',
          taxed_as: c.taxed_as || '',
          year_end: c.year_end || '',
          ssn: '', // SECURITY: never pre-fill sensitive PII from server
          dob: c.dob || '',
          filing_status: c.filing_status || '',
          dependents: c.dependents ?? '',
          dl_id: c.dl_id || '',
          dl_issued: c.dl_issued || '',
          dl_expire: c.dl_expire || '',
          bank_name: c.bank_name || '',
          bank_routing: '', // SECURITY: never pre-fill bank credentials
          bank_account: '', // SECURITY: never pre-fill bank credentials
          account_type: c.account_type || '',
        });
        setStatus('ready');
      } else {
        setStatus('invalid');
      }
    } catch {
      setStatus('invalid');
    }
  };

  const isIndividual = !client?.incorporated_as && !client?.company_name?.includes(' LLC') && !client?.company_name?.includes(' Corp');
  // Determine type from entity data
  const clientType = client?.incorporated_as ? 'entity' : 'individual';

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email) { toast.error('Email is required'); return; }
    if (!affirmed) { toast.error('You must read and accept the Client Acknowledgment before submitting.'); return; }

    setSaving(true);
    try {
      const updateData = {
        ...formData,
        status: 'pending',
        dependents: formData.dependents !== '' ? parseInt(formData.dependents) : undefined,
      };
      // Use the backend function to update (bypasses RLS)
      await base44.functions.invoke('completeClientOnboarding', { token, data: updateData });
      setStatus('submitted');
    } catch (err) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertTriangle className="w-14 h-14 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Invalid or Expired</h2>
            <p className="text-gray-600">
              This link is invalid or has expired. Please contact{' '}
              <strong>Isla Accompting Corp</strong> at{' '}
              <a href="tel:3059544607" className="text-blue-600 underline">(305) 954-4607</a>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you! 🎉</h2>
            <p className="text-gray-600 mb-3">
              Your information has been submitted successfully and is <strong>pending review</strong> by our team.
            </p>
            <p className="text-gray-500 text-sm">
              We'll reach out shortly to confirm your account and get started. Questions? Call us at{' '}
              <a href="tel:3052901145" className="text-blue-600 underline">(305) 290-1145</a>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = clientType === 'entity'
    ? client?.company_name
    : [client?.name, client?.last_name].filter(Boolean).join(' ') || client?.company_name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            {clientType === 'entity'
              ? <Building2 className="w-8 h-8 text-white" />
              : <User className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Client Onboarding</h1>
          <p className="text-gray-500 mt-1">Isla Accompting Corp</p>
          {displayName && (
            <p className="text-blue-700 font-medium mt-2">Welcome, {displayName}</p>
          )}
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
          <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Secure & Encrypted</p>
            <p className="text-xs text-green-700">All data including your SSN and banking details is transmitted over HTTPS and stored with bank-level encryption. Your information is never shared with third parties.</p>
          </div>
        </div>

        {/* Pending review notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Pending Review</p>
            <p className="text-xs text-amber-700">After you submit, your information will be reviewed by our accounting team before your account is activated. We'll contact you shortly.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Please complete your information below</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Contact Info */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <Label>Email *</Label>
                    <Input type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={formData.phone} onChange={e => handleChange('phone', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Address</Label>
                    <Input value={formData.address} onChange={e => handleChange('address', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>City</Label>
                    <Input value={formData.city} onChange={e => handleChange('city', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>State</Label>
                    <Input value={formData.state} onChange={e => handleChange('state', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>ZIP Code</Label>
                    <Input value={formData.zip_code} onChange={e => handleChange('zip_code', e.target.value)} />
                  </div>
                </div>
              </section>

              {/* Individual fields */}
              {clientType === 'individual' && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>First Name *</Label>
                      <Input value={formData.name} onChange={e => handleChange('name', e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <Label>Middle Name</Label>
                      <Input value={formData.middle_name} onChange={e => handleChange('middle_name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Last Name *</Label>
                      <Input value={formData.last_name} onChange={e => handleChange('last_name', e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1">
                      <Label>Social Security Number</Label>
                      <Input value={formData.ssn} onChange={e => handleChange('ssn', e.target.value)} placeholder="XXX-XX-XXXX" />
                    </div>
                    <div className="space-y-1">
                      <Label>Filing Status</Label>
                      <Select value={formData.filing_status} onValueChange={v => handleChange('filing_status', v)}>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married_joint">Married Filing Jointly</SelectItem>
                          <SelectItem value="married_separate">Married Filing Separately</SelectItem>
                          <SelectItem value="head_of_household">Head of Household</SelectItem>
                          <SelectItem value="qualifying_widow">Qualifying Widow(er)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Number of Dependents</Label>
                      <Input type="number" min="0" value={formData.dependents} onChange={e => handleChange('dependents', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Date of Birth</Label>
                      <Input type="date" value={formData.dob} onChange={e => handleChange('dob', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Driver's License ID</Label>
                      <Input value={formData.dl_id} onChange={e => handleChange('dl_id', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>DL Issue Date</Label>
                      <Input type="date" value={formData.dl_issued} onChange={e => handleChange('dl_issued', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>DL Expiry Date</Label>
                      <Input type="date" value={formData.dl_expire} onChange={e => handleChange('dl_expire', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1">
                      <Label>Bank Name</Label>
                      <Input value={formData.bank_name} onChange={e => handleChange('bank_name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Account Type</Label>
                      <Select value={formData.account_type} onValueChange={v => handleChange('account_type', v)}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">Checking</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Routing Number</Label>
                      <Input value={formData.bank_routing} onChange={e => handleChange('bank_routing', e.target.value)} maxLength={9} />
                    </div>
                    <div className="space-y-1">
                      <Label>Account Number</Label>
                      <Input value={formData.bank_account} onChange={e => handleChange('bank_account', e.target.value)} />
                    </div>
                  </div>
                </section>
              )}

              {/* Entity fields */}
              {clientType === 'entity' && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <Label>Company Name *</Label>
                      <Input value={formData.company_name} onChange={e => handleChange('company_name', e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <Label>EIN</Label>
                      <Input value={formData.ein} onChange={e => handleChange('ein', e.target.value)} placeholder="XX-XXXXXXX" />
                    </div>
                    <div className="space-y-1">
                      <Label>Contact Person</Label>
                      <Input value={formData.contact_person} onChange={e => handleChange('contact_person', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Incorporated As</Label>
                      <Select value={formData.incorporated_as} onValueChange={v => handleChange('incorporated_as', v)}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LLC">LLC</SelectItem>
                          <SelectItem value="Corporation">Corporation</SelectItem>
                          <SelectItem value="S-Corp">S-Corp</SelectItem>
                          <SelectItem value="Partnership">Partnership</SelectItem>
                          <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                          <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Taxed As</Label>
                      <Select value={formData.taxed_as} onValueChange={v => handleChange('taxed_as', v)}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                          <SelectItem value="Partnership">Partnership</SelectItem>
                          <SelectItem value="S-Corporation">S-Corporation</SelectItem>
                          <SelectItem value="C-Corporation">C-Corporation</SelectItem>
                          <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Fiscal Year End (MM/DD)</Label>
                      <Input value={formData.year_end} onChange={e => handleChange('year_end', e.target.value)} placeholder="12/31" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1">
                      <Label>Bank Name</Label>
                      <Input value={formData.bank_name} onChange={e => handleChange('bank_name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Routing Number</Label>
                      <Input value={formData.bank_routing} onChange={e => handleChange('bank_routing', e.target.value)} maxLength={9} />
                    </div>
                    <div className="space-y-1">
                      <Label>Account Number</Label>
                      <Input value={formData.bank_account} onChange={e => handleChange('bank_account', e.target.value)} />
                    </div>
                  </div>
                </section>
              )}

              {/* IRS Online Account Suggestion */}
              <section className="border border-blue-200 bg-blue-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">💡 Recommended: Create Your IRS Online Account</h4>
                    <p className="text-sm text-blue-800 mb-2">
                      We strongly encourage all clients to set up a free <strong>IRS Online Account</strong> at{' '}
                      <a href="https://www.irs.gov/payments/your-online-account" target="_blank" rel="noopener noreferrer" className="underline font-medium">irs.gov/payments/your-online-account</a>.
                      This gives you direct access to your tax records, payment history, and transcripts — and allows us to serve you faster.
                    </p>
                    <p className="text-sm text-blue-700 font-medium mb-1">How to create it (takes ~5 minutes):</p>
                    <ol className="text-sm text-blue-800 space-y-1 pl-4 list-decimal">
                      <li>Go to <strong>irs.gov</strong> and click <em>"Sign in to your account"</em>.</li>
                      <li>Select <strong>"Create an account"</strong> and verify your identity through <strong>ID.me</strong> (requires a photo ID and selfie).</li>
                      <li>Once verified, you'll have full access to transcripts, payment plans, notices, and more.</li>
                    </ol>
                    <p className="text-xs text-blue-600 mt-2">Having an IRS account is not required to work with us, but it helps us resolve any IRS issues on your behalf much more quickly.</p>
                  </div>
                </div>
              </section>

              {/* Client Affirmation / Acknowledgment */}
              <section className="border border-slate-300 bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck className="w-5 h-5 text-slate-600" />
                  <h4 className="font-semibold text-slate-800">Client Acknowledgment & Authorization</h4>
                </div>
                <div className="text-xs text-slate-700 space-y-2 mb-4 leading-relaxed max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-white">
                  <p><strong>1. Accuracy of Information.</strong> I certify that all information provided in this onboarding form is true, correct, and complete to the best of my knowledge. I understand that providing false or misleading information may result in penalties under federal and state law, including but not limited to penalties under IRC § 6662 and § 7206.</p>
                  <p><strong>2. Scope of Services.</strong> I understand that Isla Accounting Corp's services are limited to those specifically agreed upon in writing. No advice, oral or written, provided during this engagement shall constitute legal advice. I am advised to seek independent legal counsel for legal matters.</p>
                  <p><strong>3. Client Responsibilities.</strong> I acknowledge that I am responsible for providing complete, accurate, and timely information and documents. Isla Accounting Corp will rely on information furnished by me and is not required to audit or independently verify it, in accordance with <strong>AICPA Statements on Standards for Tax Services (SSTS)</strong>.</p>
                  <p><strong>4. Limitation of Liability.</strong> I agree that Isla Accounting Corp's liability, if any, shall be limited to fees paid for the specific services giving rise to any claim. Isla Accounting Corp shall not be liable for any indirect, incidental, or consequential damages.</p>
                  <p><strong>5. Florida Board of Accountancy Compliance.</strong> I acknowledge that Isla Accounting Corp is licensed by the <strong>Florida Board of Accountancy</strong> (Chapter 473, Florida Statutes) and that all services will be performed in accordance with applicable professional standards, including AICPA ethical standards (ET § 1.000 et seq.) and Florida Administrative Code Rule 61H1.</p>
                  <p><strong>6. Confidentiality.</strong> I understand that my information is held in strict confidence pursuant to IRC § 7216 and applicable state law, and will not be disclosed to third parties without my written consent, except as required by law or professional standards.</p>
                  <p><strong>7. Dispute Resolution.</strong> Any dispute arising out of or relating to the services provided shall first be subject to good-faith mediation before any legal action is initiated, in accordance with AICPA professional standards.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="affirm"
                    checked={affirmed}
                    onCheckedChange={setAffirmed}
                    className="mt-0.5"
                  />
                  <label htmlFor="affirm" className="text-sm text-slate-700 cursor-pointer leading-snug">
                    <strong>I have read, understand, and agree</strong> to the Client Acknowledgment above. I authorize Isla Accounting Corp to use the information provided to perform the requested accounting, tax, and/or advisory services on my behalf, in compliance with AICPA standards and the Florida Board of Accountancy rules.
                  </label>
                </div>
              </section>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={saving || !affirmed} className="bg-blue-600 hover:bg-blue-700 px-8 disabled:opacity-50">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Submit & Complete Onboarding'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}