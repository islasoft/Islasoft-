import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Lock, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const ENTRY_TYPES = ['BEG_CAP','CONTR','CONTR_ADDL','DIST','INC_ORD','INC_1231','LTCG','STCG','SEC179','DEPL','OTH_DED','OTH_INC','OTH_INCR','ADJ'];
const ENTRY_LABELS = {
  BEG_CAP: 'Beginning Capital', CONTR: 'Contribution', CONTR_ADDL: 'Addl. Contribution',
  DIST: 'Distribution', INC_ORD: 'Ordinary Income', INC_1231: 'Sec 1231 Gain',
  LTCG: 'LTCG', STCG: 'STCG', SEC179: 'Sec 179', DEPL: 'Depletion',
  OTH_DED: 'Other Deduction', OTH_INC: 'Other Income', OTH_INCR: 'Other Increase', ADJ: 'Adjustment',
};

export default function EquityLedgerTab({ partnershipId, partners }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ partner_name: '', entry_type: 'INC_ORD', description: '', amount: 0, allocation_rule: 'DIRECT' });

  const { data: entries = [] } = useQuery({
    queryKey: ['equityLedger', partnershipId],
    queryFn: () => base44.entities.EquityLedgerEntry.filter({ equity_partnership_id: partnershipId }, 'partner_name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EquityLedgerEntry.create({ ...data, equity_partnership_id: partnershipId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['equityLedger', partnershipId] }); setShowAdd(false); },
  });

  // Group by partner
  const byPartner = {};
  entries.forEach(e => {
    if (!byPartner[e.partner_name]) byPartner[e.partner_name] = [];
    byPartner[e.partner_name].push(e);
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-slate-700">Ledger Entries</h4>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Entry
        </Button>
      </div>

      {Object.keys(byPartner).length === 0 ? (
        <Card><CardContent className="py-8 text-center text-slate-400 text-sm">No ledger entries yet.</CardContent></Card>
      ) : (
        Object.entries(byPartner).map(([partner, partnerEntries]) => (
          <Card key={partner}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{partner}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-slate-400">
                    <th className="text-left py-1">Type</th>
                    <th className="text-left py-1">Description</th>
                    <th className="text-right py-1">Amount</th>
                    <th className="text-center py-1">Flags</th>
                  </tr></thead>
                  <tbody>
                    {partnerEntries.map(e => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="py-1.5 pr-2 font-medium">{ENTRY_LABELS[e.entry_type] || e.entry_type}</td>
                        <td className="py-1.5 pr-2 text-slate-500">{e.description}</td>
                        <td className={`py-1.5 text-right tabular-nums font-medium ${e.amount < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                          ${Math.abs(e.amount || 0).toLocaleString()}
                        </td>
                        <td className="py-1.5 text-center">
                          {e.is_locked && <Lock className="w-3 h-3 text-slate-400 inline" />}
                          {e.basis_warning && <AlertTriangle className="w-3 h-3 text-amber-500 inline" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Ledger Entry</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Partner</Label>
              <Select value={form.partner_name} onValueChange={v => setForm({ ...form, partner_name: v })}>
                <SelectTrigger><SelectValue placeholder="Select partner..." /></SelectTrigger>
                <SelectContent>
                  {partners.map((p, i) => <SelectItem key={i} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Entry Type</Label>
              <Select value={form.entry_type} onValueChange={v => setForm({ ...form, entry_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTRY_TYPES.map(t => <SelectItem key={t} value={t}>{ENTRY_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.partner_name || createMutation.isPending} className="bg-sky-600 hover:bg-sky-700">
              {createMutation.isPending ? 'Saving...' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}