import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Printer } from 'lucide-react';
import EquityK1Summary from './EquityK1Summary';
import EquityLedgerTab from './EquityLedgerTab';
import EquityAllocationRulesTab from './EquityAllocationRulesTab';

const STATUS_COLORS = {
  draft: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  final: 'bg-green-100 text-green-800',
};

export default function EquityPartnershipDetail({ partnership, onBack }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.EquityPartnership.update(partnership.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equityPartnerships', partnership.client_id] }),
  });

  const partners = partnership.partners || [];
  const totalProfit = partners.reduce((s, p) => s + (p.profit_percentage || 0), 0);
  const totalLoss = partners.reduce((s, p) => s + (p.loss_percentage || 0), 0);
  const totalCap = partners.reduce((s, p) => s + (p.beginning_capital || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">{partnership.name}</h3>
            <p className="text-xs text-slate-500">Tax Year: {partnership.tax_year || '—'} · {partnership.period_start_label} – {partnership.period_end_label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={partnership.status} onValueChange={v => updateMutation.mutate({ status: v })}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="final">Final</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="partners">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="rules">Alloc. Rules</TabsTrigger>
          <TabsTrigger value="k1">K-1 Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Partner Capital Accounts & Percentages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-500 text-xs">
                      <th className="text-left py-2 pr-4">Partner</th>
                      <th className="text-right py-2 px-2">Beg. Capital</th>
                      <th className="text-right py-2 px-2">Profit %</th>
                      <th className="text-right py-2 px-2">Loss %</th>
                      <th className="text-right py-2 px-2">Capital %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{p.name || `Partner ${i+1}`}</td>
                        <td className="text-right py-2 px-2 tabular-nums">${(p.beginning_capital || 0).toLocaleString()}</td>
                        <td className="text-right py-2 px-2 tabular-nums">{p.profit_percentage || 0}%</td>
                        <td className="text-right py-2 px-2 tabular-nums">{p.loss_percentage || 0}%</td>
                        <td className="text-right py-2 px-2 tabular-nums">{p.capital_percentage || 0}%</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold text-xs">
                      <td className="py-2 pr-4">Total</td>
                      <td className="text-right py-2 px-2 tabular-nums">${totalCap.toLocaleString()}</td>
                      <td className={`text-right py-2 px-2 tabular-nums ${totalProfit !== 100 ? 'text-red-600' : 'text-green-600'}`}>{totalProfit}%</td>
                      <td className={`text-right py-2 px-2 tabular-nums ${totalLoss !== 100 ? 'text-red-600' : 'text-green-600'}`}>{totalLoss}%</td>
                      <td className="text-right py-2 px-2"></td>
                    </tr>
                  </tbody>
                </table>
                {(totalProfit !== 100 || totalLoss !== 100) && (
                  <p className="text-xs text-red-500 mt-2">⚠ Profit/loss percentages should sum to 100%</p>
                )}
              </div>

              {/* Income, Deduction, Contribution Lines */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Income Lines', lines: partnership.income_lines },
                  { label: 'Deduction Lines', lines: partnership.deduction_lines },
                  { label: 'Contribution Lines', lines: partnership.contribution_lines },
                ].map(({ label, lines }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{label}</p>
                    {!lines?.length ? (
                      <p className="text-xs text-slate-400 italic">None</p>
                    ) : lines.map((l, i) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0">
                        <span className="text-slate-600">{l.label}</span>
                        <span className="font-medium tabular-nums">${(l.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <EquityLedgerTab partnershipId={partnership.id} partners={partners} />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <EquityAllocationRulesTab partnershipId={partnership.id} />
        </TabsContent>

        <TabsContent value="k1" className="mt-4">
          <EquityK1Summary partnership={partnership} />
        </TabsContent>
      </Tabs>
    </div>
  );
}