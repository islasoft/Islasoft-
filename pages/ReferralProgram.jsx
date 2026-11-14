import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Users, TrendingUp, CheckCircle, Clock, Star, Plus, Search, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  earned: 'bg-blue-100 text-blue-800',
  redeemed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const REWARD_LABELS = {
  credit: 'Account Credit',
  discount: 'Discount',
  gift_card: 'Gift Card',
};

export default function ReferralProgram() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRedeemDialog, setShowRedeemDialog] = useState(null);
  const [form, setForm] = useState({
    referrer_client_id: '',
    referred_client_id: '',
    reward_type: 'credit',
    reward_value: 100,
    reward_recipient: 'referrer',
    notes: '',
  });

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['referral_rewards'],
    queryFn: () => base44.entities.ReferralReward.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients_for_referral'],
    queryFn: () => base44.entities.Client.list('company_name'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const referrer = clients.find(c => c.id === data.referrer_client_id);
      const referred = clients.find(c => c.id === data.referred_client_id);
      return base44.entities.ReferralReward.create({
        ...data,
        referrer_client_name: referrer?.company_name || referrer?.name || '',
        referred_client_name: referred?.company_name || referred?.name || '',
        referral_code: referrer?.referral_code || '',
        status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral_rewards'] });
      setShowAddDialog(false);
      setForm({ referrer_client_id: '', referred_client_id: '', reward_type: 'credit', reward_value: 100, reward_recipient: 'referrer', notes: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReferralReward.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['referral_rewards'] }),
  });

  const markEarned = async (reward) => {
    updateMutation.mutate({ id: reward.id, data: { status: 'earned', earned_date: format(new Date(), 'yyyy-MM-dd') } });
    // Send notification email to referrer
    try {
      await base44.functions.invoke('notifyReferralEarned', { reward_id: reward.id });
    } catch (e) {
      // email failure is non-critical
    }
  };

  const markRedeemed = (reward) => {
    updateMutation.mutate({ id: reward.id, data: { status: 'redeemed', redeemed_date: format(new Date(), 'yyyy-MM-dd') } });
    setShowRedeemDialog(null);
  };

  const filtered = rewards.filter(r => {
    const matchSearch = search === '' ||
      r.referrer_client_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.referred_client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Summary stats
  const totalEarned = rewards.filter(r => r.status === 'earned').length;
  const totalRedeemed = rewards.filter(r => r.status === 'redeemed').length;
  const totalPending = rewards.filter(r => r.status === 'pending').length;
  const totalValue = rewards.filter(r => r.status !== 'cancelled').reduce((sum, r) => sum + (r.reward_value || 0), 0);

  // Top referrers
  const referrerMap = {};
  rewards.forEach(r => {
    if (r.referrer_client_id) {
      if (!referrerMap[r.referrer_client_id]) referrerMap[r.referrer_client_id] = { name: r.referrer_client_name, count: 0, value: 0 };
      referrerMap[r.referrer_client_id].count++;
      referrerMap[r.referrer_client_id].value += r.reward_value || 0;
    }
  });
  const topReferrers = Object.values(referrerMap).sort((a, b) => b.count - a.count).slice(0, 5);

  const getClientDisplayName = (c) => c.company_name || `${c.name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Referral Program</h1>
          <p className="text-slate-500 text-sm mt-1">Track and reward clients who refer new business</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-sky-600 hover:bg-sky-700">
          <Plus className="w-4 h-4 mr-2" /> Record Referral
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-xl font-bold text-slate-800">{totalPending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Earned</p>
              <p className="text-xl font-bold text-slate-800">{totalEarned}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Redeemed</p>
              <p className="text-xl font-bold text-slate-800">{totalRedeemed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Value</p>
              <p className="text-xl font-bold text-slate-800">${totalValue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rewards">
        <TabsList>
          <TabsTrigger value="rewards">All Rewards</TabsTrigger>
          <TabsTrigger value="leaderboard">Top Referrers</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="earned">Earned</SelectItem>
                <SelectItem value="redeemed">Redeemed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Gift className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No referrals found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(reward => (
                <Card key={reward.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center">
                          <Users className="w-4 h-4 text-sky-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">
                            <span className="text-sky-700">{reward.referrer_client_name}</span>
                            <span className="text-slate-400 mx-2">→</span>
                            <span>{reward.referred_client_name}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={STATUS_COLORS[reward.status]}>{reward.status}</Badge>
                            <span className="text-xs text-slate-500">{REWARD_LABELS[reward.reward_type]}</span>
                            <span className="text-xs font-semibold text-emerald-700">${reward.reward_value}</span>
                            <span className="text-xs text-slate-400">→ {reward.reward_recipient === 'referred' ? 'New Client' : 'Referrer'}</span>
                            {reward.earned_date && (
                              <span className="text-xs text-slate-400">Earned {format(new Date(reward.earned_date), 'MMM d, yyyy')}</span>
                            )}
                            {reward.redeemed_date && (
                              <span className="text-xs text-slate-400">Redeemed {format(new Date(reward.redeemed_date), 'MMM d, yyyy')}</span>
                            )}
                          </div>
                          {reward.notes && <p className="text-xs text-slate-400 mt-1">{reward.notes}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {reward.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => markEarned(reward)}>
                            Mark Earned
                          </Button>
                        )}
                        {reward.status === 'earned' && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowRedeemDialog(reward)}>
                            Redeem
                          </Button>
                        )}
                        {reward.status !== 'cancelled' && reward.status !== 'redeemed' && (
                          <Button size="sm" variant="ghost" className="text-slate-400"
                            onClick={() => updateMutation.mutate({ id: reward.id, data: { status: 'cancelled' } })}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-500" /> Top Referrers
              </CardTitle>
              <CardDescription>Clients who have referred the most new business</CardDescription>
            </CardHeader>
            <CardContent>
              {topReferrers.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">No referral data yet.</p>
              ) : (
                <div className="space-y-3">
                  {topReferrers.map((ref, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700' :
                          i === 1 ? 'bg-slate-200 text-slate-600' :
                          i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
                        }`}>#{i + 1}</div>
                        <span className="font-medium text-slate-800 text-sm">{ref.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-500">{ref.count} referral{ref.count !== 1 ? 's' : ''}</span>
                        <span className="font-semibold text-emerald-700">${ref.value.toLocaleString()} in rewards</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Referral Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record New Referral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Referring Client</Label>
              <Select value={form.referrer_client_id} onValueChange={v => setForm({ ...form, referrer_client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client who referred..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{getClientDisplayName(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Referred Client (New Client)</Label>
              <Select value={form.referred_client_id} onValueChange={v => setForm({ ...form, referred_client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the new client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.id !== form.referrer_client_id).map(c => (
                    <SelectItem key={c.id} value={c.id}>{getClientDisplayName(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reward Goes To</Label>
              <Select value={form.reward_recipient} onValueChange={v => setForm({ ...form, reward_recipient: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referrer">Referring Client</SelectItem>
                  <SelectItem value="referred">New (Referred) Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Reward Type</Label>
                <Select value={form.reward_type} onValueChange={v => setForm({ ...form, reward_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Account Credit</SelectItem>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="gift_card">Gift Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Reward Value ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.reward_value}
                  onChange={e => setForm({ ...form, reward_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                placeholder="Any notes about this referral..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.referrer_client_id || !form.referred_client_id || createMutation.isPending}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {createMutation.isPending ? 'Saving...' : 'Record Referral'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Confirm Dialog */}
      <Dialog open={!!showRedeemDialog} onOpenChange={() => setShowRedeemDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Mark the <strong>${showRedeemDialog?.reward_value}</strong> {REWARD_LABELS[showRedeemDialog?.reward_type]} reward for <strong>{showRedeemDialog?.referrer_client_name}</strong> as redeemed?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedeemDialog(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => markRedeemed(showRedeemDialog)}>
              Yes, Mark Redeemed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}