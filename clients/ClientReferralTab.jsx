import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, RefreshCw, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
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
  cash: 'Cash',
};

function generateCode(clientId) {
  const base = clientId?.slice(-4).toUpperCase() || 'ISLE';
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REF-${base}-${rand}`;
}

export default function ClientReferralTab({ client }) {
  const queryClient = useQueryClient();
  const clientId = client?.id;

  // Referral rewards where this client is the referrer
  const { data: rewards = [] } = useQuery({
    queryKey: ['client_referrals', clientId],
    queryFn: () => base44.entities.ReferralReward.filter({ referrer_client_id: clientId }, '-created_date'),
    enabled: !!clientId,
  });

  // Was this client referred by someone?
  const { data: referredByReward } = useQuery({
    queryKey: ['client_referred_by', clientId],
    queryFn: async () => {
      if (!client?.referred_by_client_id) return null;
      const results = await base44.entities.ReferralReward.filter({ referred_client_id: clientId });
      return results[0] || null;
    },
    enabled: !!clientId,
  });

  const generateCodeMutation = useMutation({
    mutationFn: () => base44.entities.Client.update(clientId, { referral_code: generateCode(clientId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients_for_referral'] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      toast.success('Referral code generated');
    },
  });

  const copyCode = () => {
    if (!client?.referral_code) return;
    navigator.clipboard.writeText(client.referral_code);
    toast.success('Referral code copied!');
  };

  const totalEarned = rewards.filter(r => r.status !== 'cancelled').reduce((s, r) => s + (r.reward_value || 0), 0);
  const activeRewards = rewards.filter(r => r.status === 'pending' || r.status === 'earned');

  return (
    <div className="space-y-4">
      {/* Referral Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-4 h-4 text-sky-500" /> Referral Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client?.referral_code ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-sky-50 border border-sky-200 rounded-lg">
                <span className="font-mono text-lg font-bold text-sky-700 tracking-wider flex-1">
                  {client.referral_code}
                </span>
                <Button size="sm" variant="outline" onClick={copyCode}>
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
                <Button size="sm" variant="ghost" onClick={() => generateCodeMutation.mutate()} title="Regenerate">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Share this code with the client so they can refer friends and earn rewards.
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-3">No referral code assigned yet.</p>
              <Button
                size="sm"
                onClick={() => generateCodeMutation.mutate()}
                disabled={generateCodeMutation.isPending}
                className="bg-sky-600 hover:bg-sky-700"
              >
                <Gift className="w-4 h-4 mr-2" /> Generate Referral Code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Was referred by? */}
      {referredByReward && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Referred by:</span>{' '}
              <span className="text-sky-700 font-medium">{referredByReward.referrer_client_name}</span>
              <Badge className={`ml-2 ${STATUS_COLORS[referredByReward.status]}`}>{referredByReward.status}</Badge>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {rewards.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-slate-800">{rewards.length}</p>
              <p className="text-xs text-slate-500">Total Referrals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{activeRewards.length}</p>
              <p className="text-xs text-slate-500">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">${totalEarned}</p>
              <p className="text-xs text-slate-500">Total Rewards</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" /> Referral History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              No referrals made yet.
            </p>
          ) : (
            <div className="space-y-2">
              {rewards.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{r.referred_client_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {REWARD_LABELS[r.reward_type]} • ${r.reward_value}
                      {r.earned_date && ` • Earned ${format(new Date(r.earned_date), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}