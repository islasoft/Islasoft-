import React, { useState, useEffect } from 'react';
import InterviewPrepSectionTab from './InterviewPrepSectionTab';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PaymentTracker from './PaymentTracker';
import ClientReferralTab from './ClientReferralTab';
import EquitySplitTab from './EquitySplitTab';
import OnboardingLinkSection from './OnboardingLinkSection';
import { SelectItem } from '@/components/ui/select';
import { generateNextClientNumber } from '@/lib/clientNumberGenerator';

export default function ClientForm({ client, teamMembers, onSubmit, onCancel, defaultClientType = 'entity' }) {
  const [formData, setFormData] = useState(client || {
    client_number: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    group: '',
    ein: '',
    document_number: '',
    incorporated_as: '',
    taxed_as: '',
    year_end: '',
    bank_name: '',
    bank_routing: '',
    bank_account: '',
    bank_username: '',
    bank_password: '',
    eftps_number: '',
    eftps_pin: '',
    eftps_password: '',
    rt_account: '',
    rt_username: '',
    rt_password: '',
    business_partner_number: '',
    eserv_fl_username: '',
    eserv_fl_password: '',
    manager_id: '',
    manager_name: '',
    status: 'active',
    notes: '',
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Auto-generate client number for new clients
  useEffect(() => {
    if (!client && !formData.client_number) {
      generateNextClientNumber(false).then(number => {
        setFormData(prev => ({ ...prev, client_number: number }));
      });
    }
  }, [client]);

  // Auto-generate registration_token for new clients
  useEffect(() => {
    if (!client && !formData.registration_token) {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(36)))
        .map(b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[b % 62])
        .join('');
      setFormData(prev => ({ ...prev, registration_token: token }));
    }
  }, [client]);

  const handleManagerChange = (managerId) => {
    const manager = teamMembers.find(m => m.id === managerId);
    setFormData({
      ...formData,
      manager_id: managerId,
      manager_name: manager?.full_name || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Duplicate check by company name or EIN — only within this firm's clients
    if (!client) {
      const allClients = await base44.entities.Client.list();

      if (formData.ein) {
        const einMatch = allClients.find(c => c.ein && c.ein.trim() === formData.ein.trim() && c.id !== client?.id);
        if (einMatch) {
          alert(`A client with EIN ${formData.ein} already exists in your firm: ${einMatch.company_name} (${einMatch.client_number})`);
          return;
        }
      }
      if (formData.company_name) {
        const nameMatch = allClients.find(c => c.company_name && c.company_name.trim().toLowerCase() === formData.company_name.trim().toLowerCase() && c.id !== client?.id);
        if (nameMatch) {
          alert(`A client named "${formData.company_name}" already exists in your firm (${nameMatch.client_number}). Please verify this is not a duplicate.`);
          return;
        }
      }
    }

    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{client ? 'Edit Client' : 'Add New Client'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            {(() => {
              const isPartnership = formData.incorporated_as === 'Partnership' || formData.taxed_as === 'Partnership';
              let colClass = 'grid-cols-4';
              if (client && isPartnership) colClass = 'grid-cols-8';
              else if (client) colClass = 'grid-cols-7';
              return (
                <TabsList className={`grid w-full ${colClass}`}>
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="entity">Entity Info</TabsTrigger>
                  <TabsTrigger value="banking">Banking</TabsTrigger>
                  <TabsTrigger value="credentials">Credentials</TabsTrigger>
                  {client && <TabsTrigger value="payments">Payments</TabsTrigger>}
                  {client && <TabsTrigger value="referral">Referral</TabsTrigger>}
                  {client && <TabsTrigger value="interview">Interview</TabsTrigger>}
                  {client && isPartnership && <TabsTrigger value="equity_split">Equity Split</TabsTrigger>}
                </TabsList>
              );
            })()}

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_number">Client Number</Label>
                  <Input
                    id="client_number"
                    value={formData.client_number}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      if (val && !val.startsWith('E-') && /^\d/.test(val)) {
                        setFormData({ ...formData, client_number: 'E-' + val });
                      } else {
                        setFormData({ ...formData, client_number: val });
                      }
                    }}
                    placeholder="E-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <MobileSelect
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    placeholder="Select status"
                  >
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </MobileSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager_id">Client Manager</Label>
                  <MobileSelect
                    value={formData.manager_id}
                    onValueChange={handleManagerChange}
                    placeholder="Select manager"
                  >
                    {teamMembers?.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </MobileSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group">Group</Label>
                  <Input
                    id="group"
                    value={formData.group}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Onboarding link — only shown when editing an existing client */}
              {client && (
                <OnboardingLinkSection
                  client={{ ...client, registration_token: formData.registration_token }}
                  currentUser={currentUser}
                  onTokenRegenerated={(newToken) => setFormData(prev => ({ ...prev, registration_token: newToken }))}
                />
              )}
            </TabsContent>

            <TabsContent value="entity" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN</Label>
                  <Input
                    id="ein"
                    value={formData.ein}
                    onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document_number">Document #</Label>
                  <Input
                    id="document_number"
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incorporated_as">Incorporated As</Label>
                  <MobileSelect
                    value={formData.incorporated_as}
                    onValueChange={(value) => setFormData({ ...formData, incorporated_as: value })}
                    placeholder="Select type"
                  >
                    <SelectItem value="LLC">LLC</SelectItem>
                    <SelectItem value="Corporation">Corporation</SelectItem>
                    <SelectItem value="S-Corp">S-Corp</SelectItem>
                    <SelectItem value="Partnership">Partnership</SelectItem>
                    <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                    <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                  </MobileSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxed_as">Taxed As</Label>
                  <MobileSelect
                    value={formData.taxed_as}
                    onValueChange={(value) => setFormData({ ...formData, taxed_as: value })}
                    placeholder="Select tax classification"
                  >
                    <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                    <SelectItem value="Partnership">Partnership</SelectItem>
                    <SelectItem value="S-Corporation">S-Corporation</SelectItem>
                    <SelectItem value="C-Corporation">C-Corporation</SelectItem>
                    <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                  </MobileSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year_end">Year-End (MM/DD)</Label>
                  <Input
                    id="year_end"
                    placeholder="12/31"
                    value={formData.year_end}
                    onChange={(e) => setFormData({ ...formData, year_end: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_partner_number">Business Partner #</Label>
                  <Input
                    id="business_partner_number"
                    value={formData.business_partner_number}
                    onChange={(e) => setFormData({ ...formData, business_partner_number: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="banking" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_routing">Bank Routing</Label>
                  <Input
                    id="bank_routing"
                    value={formData.bank_routing}
                    onChange={(e) => setFormData({ ...formData, bank_routing: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account">Bank Account</Label>
                  <Input
                    id="bank_account"
                    type="password"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_username">Bank Username</Label>
                  <Input
                    id="bank_username"
                    value={formData.bank_username}
                    onChange={(e) => setFormData({ ...formData, bank_username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_password">Bank Password</Label>
                  <Input
                    id="bank_password"
                    type="password"
                    value={formData.bank_password}
                    onChange={(e) => setFormData({ ...formData, bank_password: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="credentials" className="space-y-4 mt-4">
              <h3 className="font-semibold text-sm">EFTPS</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eftps_number">EFTPS Number</Label>
                  <Input
                    id="eftps_number"
                    value={formData.eftps_number}
                    onChange={(e) => setFormData({ ...formData, eftps_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eftps_pin">EFTPS PIN</Label>
                  <Input
                    id="eftps_pin"
                    type="password"
                    value={formData.eftps_pin}
                    onChange={(e) => setFormData({ ...formData, eftps_pin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eftps_password">EFTPS Password</Label>
                  <Input
                    id="eftps_password"
                    type="password"
                    value={formData.eftps_password}
                    onChange={(e) => setFormData({ ...formData, eftps_password: e.target.value })}
                  />
                </div>
              </div>

              <h3 className="font-semibold text-sm mt-6">RT (Revenue)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rt_account">RT Account</Label>
                  <Input
                    id="rt_account"
                    value={formData.rt_account}
                    onChange={(e) => setFormData({ ...formData, rt_account: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rt_username">RT Username</Label>
                  <Input
                    id="rt_username"
                    value={formData.rt_username}
                    onChange={(e) => setFormData({ ...formData, rt_username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rt_password">RT Password</Label>
                  <Input
                    id="rt_password"
                    type="password"
                    value={formData.rt_password}
                    onChange={(e) => setFormData({ ...formData, rt_password: e.target.value })}
                  />
                </div>
              </div>

              <h3 className="font-semibold text-sm mt-6">e-Services Florida</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eserv_fl_username">e-Serv FL Username</Label>
                  <Input
                    id="eserv_fl_username"
                    value={formData.eserv_fl_username}
                    onChange={(e) => setFormData({ ...formData, eserv_fl_username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eserv_fl_password">e-Serv FL Password</Label>
                  <Input
                    id="eserv_fl_password"
                    type="password"
                    value={formData.eserv_fl_password}
                    onChange={(e) => setFormData({ ...formData, eserv_fl_password: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            {client && (
              <TabsContent value="payments">
                <PaymentTracker
                  clientId={client.id}
                  clientName={client.company_name || `${client.name} ${client.last_name}`}
                />
              </TabsContent>
            )}
            {client && (
              <TabsContent value="referral">
                <ClientReferralTab client={client} />
              </TabsContent>
            )}
            {client && (
              <TabsContent value="interview">
                <InterviewPrepSectionTab client={client} currentUser={currentUser} />
              </TabsContent>
            )}
            {client && (formData.incorporated_as === 'Partnership' || formData.taxed_as === 'Partnership') && (
              <TabsContent value="equity_split">
                <EquitySplitTab client={client} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {client ? 'Update' : 'Create'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}