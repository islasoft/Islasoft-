import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Send } from 'lucide-react';
import { toast } from 'sonner';

// Stripe per-seat payment link — same as registration subscription link
const STRIPE_SEAT_PAYMENT_URL = 'https://buy.stripe.com/14A28s1B5a76gJI7ja0Ba01';

export default function InviteUserDialog({ onClose, currentUser }) {
  const [step, setStep] = useState('details'); // skip payment step
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [teamCategory, setTeamCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [billableRate, setBillableRate] = useState('');
  const [contractorForm, setContractorForm] = useState('w9');
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    // Get current user's tenant_id to pass to the invited user
    base44.auth.me().then(me => {
      if (me?.tenant_id) setTenantId(me.tenant_id);
    });
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setIsLoading(true);
    try {
      // Store invitation with full details so Registration auto-onboards the user
      await base44.entities.PendingInvitation.create({
        email: email.trim(),
        intended_name: name.trim(),
        contractor_form: contractorForm,
        processed: false,
        tenant_id: tenantId,
        role: role,
        team_category: teamCategory || '',
      });

      // Invite via Base44 auth
      await base44.users.inviteUser(email.trim(), role === 'master_admin' ? 'admin' : role);

      // Try to update the user record if they already exist
      await new Promise(resolve => setTimeout(resolve, 1000));
      const users = await base44.entities.User.list();
      const newUser = users.find(u => u.email === email.trim());
      if (newUser) {
        await base44.entities.User.update(newUser.id, {
          display_name: name.trim(),
          team_category: teamCategory || undefined,
          phone: phone || undefined,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
          billable_rate: billableRate ? parseFloat(billableRate) : undefined,
        });
      }

      toast.success(`Invitation sent to ${email}`);
      onClose();
    } catch (error) {
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fill in user details
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
        <p className="text-sm text-slate-500">The invited user will receive an email to join your firm.</p>
      </CardHeader>
      <form onSubmit={handleInvite}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@yourfirm.com"
              required
            />
            <p className="text-xs text-slate-500">They'll log in with this email (Google account).</p>
          </div>

          {/* Role Hierarchy — Line 1: Admin Roles */}
          <div className="space-y-2">
            <Label>Access Role</Label>
            <div className="grid grid-cols-1 gap-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Admin Roles</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`rounded-lg border-2 p-3 text-left transition-colors ${
                    role === 'admin'
                      ? 'border-sky-500 bg-sky-50 text-sky-800'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <p className="font-semibold text-sm">Admin</p>
                  <p className="text-xs text-slate-500 mt-0.5">Full access, can invite users</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`rounded-lg border-2 p-3 text-left transition-colors ${
                    role === 'user'
                      ? 'border-sky-500 bg-sky-50 text-sky-800'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <p className="font-semibold text-sm">User</p>
                  <p className="text-xs text-slate-500 mt-0.5">Standard access</p>
                </button>
              </div>

              {/* Line 2: Staff Roles */}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-2">Staff Category</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'staff', label: 'Staff', desc: 'General staff' },
                  { value: 'senior_staff', label: 'Senior Staff', desc: 'Senior level' },
                  { value: 'cpa', label: 'CPA', desc: 'Certified accountant' },
                ].map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setTeamCategory(cat.value)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      teamCategory === cat.value
                        ? 'border-violet-500 bg-violet-50 text-violet-800'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <p className="font-semibold text-sm">{cat.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{cat.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(305) 555-0100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Pay Rate ($/hr)</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="50.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billableRate">Billable Rate ($/hr)</Label>
              <Input
                id="billableRate"
                type="number"
                step="0.01"
                value={billableRate}
                onChange={(e) => setBillableRate(e.target.value)}
                placeholder="150.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractorForm">Required Tax Form</Label>
            <Select value={contractorForm} onValueChange={setContractorForm}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="w9">W-9 (Independent Contractor)</SelectItem>
                <SelectItem value="w4">W-4 (Employee)</SelectItem>
                <SelectItem value="international">International Contractor Agreement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading || !name.trim() || !email.trim()}>
              <Send className="w-4 h-4 mr-2" />
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}