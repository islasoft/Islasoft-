import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle, Loader2, Building2, User, CalendarIcon } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ClientRegistration() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clientType, setClientType] = useState('individual'); // 'individual' or 'entity'
  const [formData, setFormData] = useState({
    email: '',
    // Individual fields
    name: '',
    middle_name: '',
    last_name: '',
    dob: '',
    ssn: '',
    filing_status: '',
    dependents: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    dl_id: '',
    dl_issued: '',
    dl_expire: '',
    account_type: '',
    bank_name: '',
    bank_routing: '',
    bank_account: '',
    // Entity fields
    company_name: '',
    ein: '',
    incorporated_as: '',
    taxed_as: '',
    contact_person: '',
    year_end: '',
    document_number: '',
    group: '',
    business_partner_number: '',
    bank_name: '',
    bank_routing: '',
    bank_account: '',
    bank_username: '',
    bank_password: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.email) {
      toast.error('Email is required');
      return;
    }

    if (clientType === 'individual') {
      if (!formData.name || !formData.last_name) {
        toast.error('Please fill in first name and last name');
        return;
      }
    } else {
      if (!formData.company_name) {
        toast.error('Please fill in company name');
        return;
      }
    }

    try {
      setLoading(true);

      // Create client with pending status
      const clientData = {
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        status: 'pending'
      };

      if (clientType === 'individual') {
        Object.assign(clientData, {
          name: formData.name,
          middle_name: formData.middle_name,
          last_name: formData.last_name,
          dob: formData.dob,
          ssn: formData.ssn,
          filing_status: formData.filing_status,
          dependents: formData.dependents ? parseInt(formData.dependents) : 0,
          dl_id: formData.dl_id,
          dl_issued: formData.dl_issued,
          dl_expire: formData.dl_expire,
          account_type: formData.account_type,
          bank_name: formData.bank_name,
          bank_routing: formData.bank_routing,
          bank_account: formData.bank_account,
          company_name: `${formData.name} ${formData.last_name}`
        });
      } else {
        Object.assign(clientData, {
          company_name: formData.company_name,
          ein: formData.ein,
          incorporated_as: formData.incorporated_as,
          taxed_as: formData.taxed_as,
          contact_person: formData.contact_person,
          year_end: formData.year_end,
          document_number: formData.document_number,
          group: formData.group,
          business_partner_number: formData.business_partner_number,
          bank_name: formData.bank_name,
          bank_routing: formData.bank_routing,
          bank_account: formData.bank_account,
          bank_username: formData.bank_username,
          bank_password: formData.bank_password
        });
      }

      await base44.entities.Client.create(clientData);
      setSubmitted(true);
      toast.success('Registration submitted successfully!');
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
            <p className="text-gray-600">
              Thank you for submitting your information. Our team will review your registration and contact you shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Client Registration Form</CardTitle>
            <p className="text-gray-600 mt-2">Please select your client type and fill out the required information</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client Type Selection */}
              <div>
                <Label>Client Type *</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setClientType('individual')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      clientType === 'individual'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <User className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <p className="font-medium">Individual</p>
                    <p className="text-xs text-gray-500">Personal tax client</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientType('entity')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      clientType === 'entity'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <p className="font-medium">Entity</p>
                    <p className="text-xs text-gray-500">Business client</p>
                  </button>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip_code">ZIP Code</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => handleChange('zip_code', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Individual-specific fields */}
              {clientType === 'individual' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="dob">Date of Birth</Label>
                      <div className="flex gap-2">
                        <Input
                          id="dob"
                          placeholder="MM/DD/YYYY"
                          value={formData.dob ? format(new Date(formData.dob + 'T00:00:00'), 'MM/dd/yyyy') : ''}
                          onChange={(e) => {
                            const typed = e.target.value;
                            // Try to parse typed date MM/DD/YYYY
                            const parsed = parse(typed, 'MM/dd/yyyy', new Date());
                            if (isValid(parsed)) {
                              handleChange('dob', format(parsed, 'yyyy-MM-dd'));
                            } else {
                              // store raw typed value temporarily
                              handleChange('dob', typed);
                            }
                          }}
                          className="flex-1"
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="icon" className="flex-shrink-0">
                              <CalendarIcon className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={formData.dob && isValid(new Date(formData.dob + 'T00:00:00')) ? new Date(formData.dob + 'T00:00:00') : undefined}
                              onSelect={(date) => date && handleChange('dob', format(date, 'yyyy-MM-dd'))}
                              captionLayout="dropdown"
                              fromYear={1920}
                              toYear={new Date().getFullYear()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="ssn">Social Security Number</Label>
                      <Input
                        id="ssn"
                        value={formData.ssn}
                        onChange={(e) => handleChange('ssn', e.target.value)}
                        placeholder="XXX-XX-XXXX"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="filing_status">Filing Status</Label>
                      <Select value={formData.filing_status} onValueChange={(val) => handleChange('filing_status', val)}>
                        <SelectTrigger id="filing_status">
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
                        value={formData.dependents}
                        onChange={(e) => handleChange('dependents', e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-4 mt-6">Identification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dl_id">Driver's License ID</Label>
                      <Input
                        id="dl_id"
                        value={formData.dl_id}
                        onChange={(e) => handleChange('dl_id', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dl_issued">DL Issue Date</Label>
                      <Input
                        id="dl_issued"
                        type="date"
                        value={formData.dl_issued}
                        onChange={(e) => handleChange('dl_issued', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dl_expire">DL Expiry Date</Label>
                      <Input
                        id="dl_expire"
                        type="date"
                        value={formData.dl_expire}
                        onChange={(e) => handleChange('dl_expire', e.target.value)}
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-4 mt-6">Banking Information (for refunds)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input
                        id="bank_name"
                        value={formData.bank_name}
                        onChange={(e) => handleChange('bank_name', e.target.value)}
                        placeholder="e.g., Chase, Bank of America"
                      />
                    </div>
                    <div>
                      <Label htmlFor="account_type">Bank Account Type</Label>
                      <Select value={formData.account_type} onValueChange={(val) => handleChange('account_type', val)}>
                        <SelectTrigger id="account_type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">Checking</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="bank_routing">Routing Number</Label>
                      <Input
                        id="bank_routing"
                        value={formData.bank_routing}
                        onChange={(e) => handleChange('bank_routing', e.target.value)}
                        placeholder="9-digit routing number"
                        maxLength={9}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bank_account">Account Number</Label>
                      <Input
                        id="bank_account"
                        value={formData.bank_account}
                        onChange={(e) => handleChange('bank_account', e.target.value)}
                        placeholder="Account number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Entity-specific fields */}
              {clientType === 'entity' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => handleChange('company_name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="ein">EIN</Label>
                      <Input
                        id="ein"
                        value={formData.ein}
                        onChange={(e) => handleChange('ein', e.target.value)}
                        placeholder="XX-XXXXXXX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_person">Contact Person</Label>
                      <Input
                        id="contact_person"
                        value={formData.contact_person}
                        onChange={(e) => handleChange('contact_person', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="incorporated_as">Incorporated As</Label>
                      <Select value={formData.incorporated_as} onValueChange={(val) => handleChange('incorporated_as', val)}>
                        <SelectTrigger id="incorporated_as">
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
                      <Label htmlFor="taxed_as">Taxed As</Label>
                      <Select value={formData.taxed_as} onValueChange={(val) => handleChange('taxed_as', val)}>
                        <SelectTrigger id="taxed_as">
                          <SelectValue placeholder="Select type" />
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="year_end">Fiscal Year End (MM/DD)</Label>
                      <Input
                        id="year_end"
                        value={formData.year_end}
                        onChange={(e) => handleChange('year_end', e.target.value)}
                        placeholder="12/31"
                      />
                    </div>
                    <div>
                      <Label htmlFor="document_number">Business Document Number</Label>
                      <Input
                        id="document_number"
                        value={formData.document_number}
                        onChange={(e) => handleChange('document_number', e.target.value)}
                        placeholder="State filing number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="group">Business Category/Group</Label>
                      <Input
                        id="group"
                        value={formData.group}
                        onChange={(e) => handleChange('group', e.target.value)}
                        placeholder="e.g., Retail, Services, Manufacturing"
                      />
                    </div>
                    <div>
                      <Label htmlFor="business_partner_number">Business Partner Number</Label>
                      <Input
                        id="business_partner_number"
                        value={formData.business_partner_number}
                        onChange={(e) => handleChange('business_partner_number', e.target.value)}
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-4 mt-6">Banking Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input
                        id="bank_name"
                        value={formData.bank_name}
                        onChange={(e) => handleChange('bank_name', e.target.value)}
                        placeholder="e.g., Chase, Bank of America"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bank_routing">Routing Number</Label>
                      <Input
                        id="bank_routing"
                        value={formData.bank_routing}
                        onChange={(e) => handleChange('bank_routing', e.target.value)}
                        placeholder="9-digit routing number"
                        maxLength={9}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="bank_account">Account Number</Label>
                      <Input
                        id="bank_account"
                        value={formData.bank_account}
                        onChange={(e) => handleChange('bank_account', e.target.value)}
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bank_username">Bank Username</Label>
                      <Input
                        id="bank_username"
                        value={formData.bank_username}
                        onChange={(e) => handleChange('bank_username', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="bank_password">Bank Password</Label>
                      <Input
                        id="bank_password"
                        type="password"
                        value={formData.bank_password}
                        onChange={(e) => handleChange('bank_password', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Registration'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}