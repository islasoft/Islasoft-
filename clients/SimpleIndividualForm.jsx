import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save } from 'lucide-react';
import { generateNextClientNumber } from '@/lib/clientNumberGenerator';

export default function SimpleIndividualForm({ client, teamMembers, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(client || {
    client_number: '',
    name: '',
    middle_name: '',
    last_name: '',
    dob: '',
    ssn: '',
    filing_status: '',
    dependents: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    dl_id: '',
    dl_issued: '',
    dl_expire: '',
    bank_name: '',
    bank_account: '',
    bank_routing: '',
    account_type: '',
    manager_id: '',
    manager_name: '',
    status: 'active',
    company_name: '',
  });

  // Auto-generate client number for new clients
  useEffect(() => {
    if (!client && !formData.client_number) {
      generateNextClientNumber(true).then(number => {
        setFormData(prev => ({ ...prev, client_number: number }));
      });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      company_name: formData.company_name || `${formData.name} ${formData.last_name}`.trim() || 'Individual Client',
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{client ? 'Edit Individual' : 'Add New Individual'}</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label htmlFor="client_number" className="text-xs font-medium">Client Number</Label>
          <Input
            id="client_number"
            value={formData.client_number}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              // Auto-add "I-" prefix if user just types numbers
              if (val && !val.startsWith('I-') && /^\d/.test(val)) {
                setFormData({ ...formData, client_number: 'I-' + val });
              } else {
                setFormData({ ...formData, client_number: val });
              }
            }}
            placeholder="I-001"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="status" className="text-xs font-medium">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs font-medium">First Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value, company_name: `${e.target.value} ${formData.last_name}`.trim() || 'Individual Client' })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="middle_name" className="text-xs font-medium">Middle Name</Label>
          <Input
            id="middle_name"
            value={formData.middle_name}
            onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="last_name" className="text-xs font-medium">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value, company_name: `${formData.name} ${e.target.value}`.trim() || 'Individual Client' })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="dob" className="text-xs font-medium">DOB</Label>
          <Input
            id="dob"
            type="date"
            value={formData.dob}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ssn" className="text-xs font-medium">SSN</Label>
          <Input
            id="ssn"
            value={formData.ssn}
            onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="filing_status" className="text-xs font-medium">Filing Status</Label>
          <Select value={formData.filing_status} onValueChange={(value) => setFormData({ ...formData, filing_status: value })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select" />
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

        <div className="space-y-1">
          <Label htmlFor="dependents" className="text-xs font-medium">Dependents</Label>
          <Input
            id="dependents"
            type="number"
            value={formData.dependents}
            onChange={(e) => setFormData({ ...formData, dependents: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="phone" className="text-xs font-medium">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs font-medium">Email</Label>
          <Input
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="address" className="text-xs font-medium">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="city" className="text-xs font-medium">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="state" className="text-xs font-medium">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="zip_code" className="text-xs font-medium">ZIP</Label>
          <Input
            id="zip_code"
            value={formData.zip_code}
            onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="dl_id" className="text-xs font-medium">DL ID</Label>
          <Input
            id="dl_id"
            value={formData.dl_id}
            onChange={(e) => setFormData({ ...formData, dl_id: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="dl_issued" className="text-xs font-medium">DL Issued</Label>
          <Input
            id="dl_issued"
            type="date"
            value={formData.dl_issued}
            onChange={(e) => setFormData({ ...formData, dl_issued: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="dl_expire" className="text-xs font-medium">DL Expire</Label>
          <Input
            id="dl_expire"
            type="date"
            value={formData.dl_expire}
            onChange={(e) => setFormData({ ...formData, dl_expire: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="bank_name" className="text-xs font-medium">Bank Name</Label>
          <Input
            id="bank_name"
            value={formData.bank_name}
            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="bank_account" className="text-xs font-medium">Bank Account</Label>
          <Input
            id="bank_account"
            value={formData.bank_account}
            onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="bank_routing" className="text-xs font-medium">Bank Routing</Label>
          <Input
            id="bank_routing"
            value={formData.bank_routing}
            onChange={(e) => setFormData({ ...formData, bank_routing: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="account_type" className="text-xs font-medium">Account Type</Label>
          <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checking">Checking</SelectItem>
              <SelectItem value="savings">Savings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {client ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}