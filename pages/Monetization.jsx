import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, Tag, Zap, Package } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const FEATURE_LABELS = { partnership_1065: 'Partnership 1065', equity_split_pro: 'EquitySplit Pro' };

export default function Monetization() {
  const queryClient = useQueryClient();
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: '', description: '', discount_type: 'free', discount_value: 0, feature: 'partnership_1065', is_active: true, max_uses: 0 });

  const { data: promoCodes = [], isLoading: loadingCodes } = useQuery({
    queryKey: ['promoCodes'],
    queryFn: () => base44.entities.PromoCode.list('-created_date'),
  });

  const { data: addons = [], isLoading: loadingAddons } = useQuery({
    queryKey: ['featureAddonsAll'],
    queryFn: () => base44.entities.FeatureAddon.list('-created_date'),
  });

  const createPromoMutation = useMutation({
    mutationFn: (data) => base44.entities.PromoCode.create({ ...data, code: data.code.toUpperCase().trim(), times_used: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoCodes'] });
      setShowAddPromo(false);
      setPromoForm({ code: '', description: '', discount_type: 'free', discount_value: 0, feature: 'partnership_1065', is_active: true, max_uses: 0 });
      toast.success('Promo code created');
    },
  });

  const togglePromoMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.PromoCode.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promoCodes'] }),
  });

  const partnership1065Addons = addons.filter(a => a.feature === 'partnership_1065');
  const equityAddons = addons.filter(a => a.feature === 'equity_split_pro');
  const totalRevenue = addons.filter(a => a.status === 'active').reduce((s, a) => s + (a.amount_paid || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Monetization</h1>
        <p className="text-slate-500 text-sm mt-1">Manage feature add-ons and promo codes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center"><Package className="w-5 h-5 text-sky-600" /></div>
          <div><p className="text-xs text-slate-500">Active Add-ons</p><p className="text-xl font-bold">{addons.filter(a => a.status === 'active').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><Zap className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-slate-500">Total Revenue</p><p className="text-xl font-bold">${totalRevenue}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center"><Tag className="w-5 h-5 text-violet-600" /></div>
          <div><p className="text-xs text-slate-500">Promo Codes</p><p className="text-xl font-bold">{promoCodes.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center"><Tag className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-slate-500">Promo Uses</p><p className="text-xl font-bold">{promoCodes.reduce((s, c) => s + (c.times_used || 0), 0)}</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="promoCodes">
        <TabsList>
          <TabsTrigger value="promoCodes">Promo Codes</TabsTrigger>
          <TabsTrigger value="1065">Partnership 1065</TabsTrigger>
          <TabsTrigger value="equity">EquitySplit Pro</TabsTrigger>
        </TabsList>

        {/* Promo Codes Tab */}
        <TabsContent value="promoCodes" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-slate-700">All Promo Codes</h3>
            <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={() => setShowAddPromo(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Code
            </Button>
          </div>
          {loadingCodes ? <p className="text-sm text-slate-400">Loading...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-slate-500 text-xs">
                  <th className="text-left py-2 pr-3">Code</th>
                  <th className="text-left py-2 pr-3">Feature</th>
                  <th className="text-left py-2 pr-3">Discount</th>
                  <th className="text-right py-2 pr-3">Uses</th>
                  <th className="text-right py-2 pr-3">Max Uses</th>
                  <th className="text-left py-2 pr-3">Expires</th>
                  <th className="text-center py-2">Active</th>
                </tr></thead>
                <tbody>
                  {promoCodes.map(c => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2 pr-3 font-mono font-bold text-slate-800">{c.code}</td>
                      <td className="py-2 pr-3"><Badge variant="outline" className="text-xs">{FEATURE_LABELS[c.feature] || c.feature}</Badge></td>
                      <td className="py-2 pr-3 text-slate-600">
                        {c.discount_type === 'free' ? 'Free' : c.discount_type === 'percent' ? `${c.discount_value}% off` : `$${c.discount_value} off`}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{c.times_used || 0}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{c.max_uses === 0 ? '∞' : c.max_uses}</td>
                      <td className="py-2 pr-3 text-slate-500 text-xs">{c.expires_at ? format(new Date(c.expires_at), 'MMM d, yyyy') : '—'}</td>
                      <td className="py-2 text-center">
                        <Switch checked={!!c.is_active} onCheckedChange={v => togglePromoMutation.mutate({ id: c.id, is_active: v })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Partnership 1065 Activations */}
        <TabsContent value="1065" className="mt-4">
          <AddonTable addons={partnership1065Addons} isLoading={loadingAddons} />
        </TabsContent>

        {/* EquitySplit Pro Activations */}
        <TabsContent value="equity" className="mt-4">
          <AddonTable addons={equityAddons} isLoading={loadingAddons} />
        </TabsContent>
      </Tabs>

      {/* Add Promo Dialog */}
      <Dialog open={showAddPromo} onOpenChange={setShowAddPromo}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Promo Code</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Code *</Label>
                <Input placeholder="MYCODE2025" value={promoForm.code} onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Description</Label>
                <Input value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Feature</Label>
                <Select value={promoForm.feature} onValueChange={v => setPromoForm({ ...promoForm, feature: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partnership_1065">Partnership 1065</SelectItem>
                    <SelectItem value="equity_split_pro">EquitySplit Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Discount Type</Label>
                <Select value={promoForm.discount_type} onValueChange={v => setPromoForm({ ...promoForm, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="percent">Percent Off</SelectItem>
                    <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {promoForm.discount_type !== 'free' && (
                <div className="space-y-1">
                  <Label>{promoForm.discount_type === 'percent' ? 'Percent (%)' : 'Amount ($)'}</Label>
                  <Input type="number" min={0} value={promoForm.discount_value} onChange={e => setPromoForm({ ...promoForm, discount_value: +e.target.value })} />
                </div>
              )}
              <div className="space-y-1">
                <Label>Max Uses <span className="text-slate-400 font-normal">(0 = unlimited)</span></Label>
                <Input type="number" min={0} value={promoForm.max_uses} onChange={e => setPromoForm({ ...promoForm, max_uses: +e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPromo(false)}>Cancel</Button>
            <Button onClick={() => createPromoMutation.mutate(promoForm)} disabled={!promoForm.code || createPromoMutation.isPending} className="bg-sky-600 hover:bg-sky-700">
              {createPromoMutation.isPending ? 'Creating...' : 'Create Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddonTable({ addons, isLoading }) {
  if (isLoading) return <p className="text-sm text-slate-400 py-4">Loading...</p>;
  if (addons.length === 0) return <Card><CardContent className="py-8 text-center text-slate-400 text-sm">No activations yet.</CardContent></Card>;

  const STATUS_COLORS = { active: 'bg-green-100 text-green-800', expired: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-700' };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-slate-500 text-xs">
          <th className="text-left py-2 pr-3">Tenant ID</th>
          <th className="text-left py-2 pr-3">Activated</th>
          <th className="text-right py-2 pr-3">Amount Paid</th>
          <th className="text-left py-2 pr-3">Promo Used</th>
          <th className="text-left py-2 pr-3">Activated By</th>
          <th className="text-center py-2">Status</th>
        </tr></thead>
        <tbody>
          {addons.map(a => (
            <tr key={a.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="py-2 pr-3 font-mono text-xs text-slate-600">{a.tenant_id}</td>
              <td className="py-2 pr-3 text-slate-600">{a.activated_at ? format(new Date(a.activated_at), 'MMM d, yyyy') : '—'}</td>
              <td className="py-2 pr-3 text-right tabular-nums font-medium">${a.amount_paid || 0}</td>
              <td className="py-2 pr-3 font-mono text-xs">{a.promo_code_used || '—'}</td>
              <td className="py-2 pr-3 text-xs text-slate-500">{a.activated_by_id || '—'}</td>
              <td className="py-2 text-center"><Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}