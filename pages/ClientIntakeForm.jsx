import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Loader2, AlertCircle, Briefcase } from 'lucide-react';

export default function ClientIntakeForm() {
  const [token, setToken] = useState('');
  const [client, setClient] = useState(null);
  const [clientType, setClientType] = useState('individual');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    // Individual fields
    name: '',
    middle_name: '',
    last_name: '',
    dob: '',
    ssn: '',
    filing_status: '',
    dependents: '',
    
    // Entity fields
    company_name: '',
    ein: '',
    incorporated_as: '',
    taxed_as: '',
    year_end: '',
    
    // Common fields
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    
    // Bank info
    bank_name: '',
    bank_routing: '',
    bank_account: '',
    account_type: '',
    
    // Driver's license
    dl_id: '',
    dl_issued: '',
    dl_expire: '',
    
    // Additional info
    notes: ''
  });

  const [projectData, setProjectData] = useState({
    project_type: '',
    project_category: '',
    due_date: '',
    description: '',
  });

  const SERVICE_OPTIONS = [
    { value: 'individual_tax_1040', label: 'Individual Tax Return (1040)', category: 'tax_compliance' },
    { value: 'business_tax_1120', label: 'Business Tax Return (1120)', category: 'tax_compliance' },
    { value: 's_corp_tax_1120s', label: 'S-Corp Tax Return (1120-S)', category: 'tax_compliance' },
    { value: 'partnership_tax_1065', label: 'Partnership Tax Return (1065)', category: 'tax_compliance' },
    { value: 'amended_tax_1040x', label: 'Amended Tax Return (1040-X)', category: 'tax_compliance' },
    { value: 'extension_filing', label: 'Tax Extension Filing', category: 'tax_compliance' },
    { value: 'tax_planning_session', label: 'Tax Planning / Consultation', category: 'tax_compliance' },
    { value: 'monthly_bookkeeping', label: 'Monthly Bookkeeping', category: 'bookkeeping_accounting' },
    { value: 'quarterly_bookkeeping', label: 'Quarterly Bookkeeping', category: 'bookkeeping_accounting' },
    { value: 'annual_bookkeeping', label: 'Annual Bookkeeping / Clean-up', category: 'bookkeeping_accounting' },
    { value: 'financial_statement_prep', label: 'Financial Statement Preparation', category: 'bookkeeping_accounting' },
    { value: 'payroll_setup', label: 'Payroll Setup', category: 'payroll_employment' },
    { value: 'payroll_processing', label: 'Payroll Processing', category: 'payroll_employment' },
    { value: '1099_preparation', label: '1099 Preparation', category: 'payroll_employment' },
    { value: 'entity_formation', label: 'Entity Formation / LLC Setup', category: 'entity_structuring' },
    { value: 'entity_conversion', label: 'Entity Conversion', category: 'entity_structuring' },
    { value: 'irs_notice_review', label: 'IRS Notice Review', category: 'irs_representation' },
    { value: 'penalty_abatement', label: 'Penalty Abatement Request', category: 'irs_representation' },
    { value: 'cash_flow_analysis', label: 'Cash Flow Analysis', category: 'advisory_cfo' },
    { value: 'cfo_services', label: 'CFO / Advisory Services', category: 'advisory_cfo' },
  ];

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const typeParam = urlParams.get('clientType') || 'individual';
    
    if (!tokenParam) {
      setError('Invalid or missing registration link');
      setLoading(false);
      return;
    }
    
    setToken(tokenParam);
    setClientType(typeParam);
    loadClient(tokenParam);
  }, []);

  const loadClient = async (token) => {
    try {
      const result = await base44.functions.invoke('lookupClientByToken', { token });
      const clientData = result.data?.client;

      if (!clientData) {
        setError('Invalid or expired registration link');
        setLoading(false);
        return;
      }

      setClient(clientData);

      // Pre-fill form with existing data
      setFormData(prev => ({
        ...prev,
        ...clientData,
        ssn: '',         // SECURITY: never pre-fill
        bank_routing: '', // SECURITY: never pre-fill
        bank_account: '', // SECURITY: never pre-fill
        dependents: clientData.dependents || '',
      }));

      if (clientData.status === 'active') {
        setSubmitted(true);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load client data');
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProjectChange = (field, value) => {
    setProjectData(prev => {
      const next = { ...prev, [field]: value };
      // Auto-fill category when project_type changes
      if (field === 'project_type') {
        const match = SERVICE_OPTIONS.find(o => o.value === value);
        if (match) next.project_category = match.category;
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await base44.functions.invoke('completeClientOnboarding', {
        token,
        data: {
          ...formData,
          dependents: formData.dependents ? parseInt(formData.dependents) : 0,
        },
        projectData: projectData.project_type ? projectData : null,
      });
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <CardTitle>Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              <CardTitle>Thank You!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Your intake form has been successfully submitted. We'll be in touch soon!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Client Intake Form</CardTitle>
            <CardDescription>
              Please fill out all required information below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs value={clientType} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="individual" disabled>Individual</TabsTrigger>
                  <TabsTrigger value="entity" disabled>Entity</TabsTrigger>
                </TabsList>
                
                <TabsContent value="individual" className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="name">First Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="middle_name">Middle Name</Label>
                        <Input
                          id="middle_name"
                          value={formData.middle_name}
                          onChange={(e) => handleChange('middle_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Last Name *</Label>
                        <Input
                          id="last_name"
                          value={formData.last_name}
                          onChange={(e) => handleChange('last_name', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dob">Date of Birth *</Label>
                        <Input
                          id="dob"
                          type="date"
                          value={formData.dob}
                          onChange={(e) => handleChange('dob', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="ssn">Social Security Number *</Label>
                        <Input
                          id="ssn"
                          value={formData.ssn}
                          onChange={(e) => handleChange('ssn', e.target.value)}
                          placeholder="XXX-XX-XXXX"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="filing_status">Filing Status *</Label>
                        <Select
                          value={formData.filing_status}
                          onValueChange={(value) => handleChange('filing_status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married_joint">Married Filing Jointly</SelectItem>
                            <SelectItem value="married_separate">Married Filing Separately</SelectItem>
                            <SelectItem value="head_of_household">Head of Household</SelectItem>
                            <SelectItem value="qualifying_widow">Qualifying Widow(er)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="dependents">Number of Dependents</Label>
                        <Input
                          id="dependents"
                          type="number"
                          min="0"
                          value={formData.dependents}
                          onChange={(e) => handleChange('dependents', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Driver's License */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Driver's License</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="dl_id">License Number</Label>
                        <Input
                          id="dl_id"
                          value={formData.dl_id}
                          onChange={(e) => handleChange('dl_id', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="dl_issued">Issued Date</Label>
                        <Input
                          id="dl_issued"
                          type="date"
                          value={formData.dl_issued}
                          onChange={(e) => handleChange('dl_issued', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="dl_expire">Expiry Date</Label>
                        <Input
                          id="dl_expire"
                          type="date"
                          value={formData.dl_expire}
                          onChange={(e) => handleChange('dl_expire', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="entity" className="space-y-6">
                  {/* Entity Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Entity Information</h3>
                    <div>
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => handleChange('company_name', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ein">EIN *</Label>
                        <Input
                          id="ein"
                          value={formData.ein}
                          onChange={(e) => handleChange('ein', e.target.value)}
                          placeholder="XX-XXXXXXX"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="year_end">Fiscal Year End</Label>
                        <Input
                          id="year_end"
                          value={formData.year_end}
                          onChange={(e) => handleChange('year_end', e.target.value)}
                          placeholder="MM/DD"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="incorporated_as">Incorporated As *</Label>
                        <Select
                          value={formData.incorporated_as}
                          onValueChange={(value) => handleChange('incorporated_as', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
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
                      <div>
                        <Label htmlFor="taxed_as">Taxed As *</Label>
                        <Select
                          value={formData.taxed_as}
                          onValueChange={(value) => handleChange('taxed_as', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select classification" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                            <SelectItem value="Partnership">Partnership</SelectItem>
                            <SelectItem value="S-Corporation">S-Corporation</SelectItem>
                            <SelectItem value="C-Corporation">C-Corporation</SelectItem>
                            <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip_code">ZIP Code *</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => handleChange('zip_code', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Bank Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Bank Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => handleChange('bank_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_type">Account Type</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(value) => handleChange('account_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_routing">Routing Number</Label>
                    <Input
                      id="bank_routing"
                      value={formData.bank_routing}
                      onChange={(e) => handleChange('bank_routing', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_account">Account Number</Label>
                    <Input
                      id="bank_account"
                      value={formData.bank_account}
                      onChange={(e) => handleChange('bank_account', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Services Requested */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Services Requested</h3>
                </div>
                <p className="text-sm text-gray-500">Tell us what you need help with so we can assign the right team member and get started right away.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="project_type">Service Needed <span className="text-red-500">*</span></Label>
                    <Select value={projectData.project_type} onValueChange={(v) => handleProjectChange('project_type', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null} disabled>Select a service...</SelectItem>
                        <SelectItem value="individual_tax_1040">Individual Tax Return (1040)</SelectItem>
                        <SelectItem value="business_tax_1120">Business Tax Return (1120)</SelectItem>
                        <SelectItem value="s_corp_tax_1120s">S-Corp Tax Return (1120-S)</SelectItem>
                        <SelectItem value="partnership_tax_1065">Partnership Tax Return (1065)</SelectItem>
                        <SelectItem value="amended_tax_1040x">Amended Tax Return (1040-X)</SelectItem>
                        <SelectItem value="extension_filing">Tax Extension Filing</SelectItem>
                        <SelectItem value="tax_planning_session">Tax Planning / Consultation</SelectItem>
                        <SelectItem value="monthly_bookkeeping">Monthly Bookkeeping</SelectItem>
                        <SelectItem value="quarterly_bookkeeping">Quarterly Bookkeeping</SelectItem>
                        <SelectItem value="annual_bookkeeping">Annual Bookkeeping / Clean-up</SelectItem>
                        <SelectItem value="financial_statement_prep">Financial Statement Preparation</SelectItem>
                        <SelectItem value="payroll_setup">Payroll Setup</SelectItem>
                        <SelectItem value="payroll_processing">Payroll Processing</SelectItem>
                        <SelectItem value="1099_preparation">1099 Preparation</SelectItem>
                        <SelectItem value="entity_formation">Entity Formation / LLC Setup</SelectItem>
                        <SelectItem value="entity_conversion">Entity Conversion</SelectItem>
                        <SelectItem value="irs_notice_review">IRS Notice Review</SelectItem>
                        <SelectItem value="penalty_abatement">Penalty Abatement Request</SelectItem>
                        <SelectItem value="cash_flow_analysis">Cash Flow Analysis</SelectItem>
                        <SelectItem value="cfo_services">CFO / Advisory Services</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="due_date">Preferred Completion Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={projectData.due_date}
                      onChange={(e) => handleProjectChange('due_date', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="proj_description">Additional Details / Notes</Label>
                    <Textarea
                      id="proj_description"
                      value={projectData.description}
                      onChange={(e) => handleProjectChange('description', e.target.value)}
                      rows={3}
                      placeholder="Any specific requirements, prior year details, deadlines, or other information we should know..."
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Intake Form'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}