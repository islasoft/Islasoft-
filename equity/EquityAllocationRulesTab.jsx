import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function EquityAllocationRulesTab({ partnershipId }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', rule_type: 'PRO_RATA', fiscal_year: new Date().getFullYear(), notes: '' });

  const { data: rules = [] } = useQuery({
    queryKey: ['equityAllocRules', partnershipId],
    queryFn: () => base44.entities.EquityAllocationRule.filter({ equity_partnership_id: partnershipId }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EquityAllocationRule.create({ ...data, equity_partnership_id: partnershipId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['equityAllocRules', partnershipId] }); setShowAdd(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EquityAllocationRule.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equityAllocRules', partnershipId] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-slate-700">Allocation Rules</h4>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-slate-400 text-sm">No allocation rules defined. Default is pro-rata by profit/loss %.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rules.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{r.name || 'Unnamed Rule'}</p>
                  <p className="text-xs text-slate-500">{r.rule_type} · FY {r.fiscal_year}</p>
                  {r.notes && <p className="text-xs text-slate-400 mt-1">{r.notes}</p>}
                </div>
                <Button size="icon" variant="ghost" className="text-red-400 h-7 w-7" onClick={() => deleteMutation.mutate(r.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Allocation Rule</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Rule Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Rule Type</Label>
              <Select value={form.rule_type} onValueChange={v => setForm({ ...form, rule_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRO_RATA">Pro-Rata</SelectItem>
                  <SelectItem value="FIXED_PCT">Fixed Percentage</SelectItem>
                  <SelectItem value="PREFERRED_RETURN">Preferred Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fiscal Year</Label>
              <Input type="number" value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: +e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="bg-sky-600 hover:bg-sky-700">
              {createMutation.isPending ? 'Saving...' : 'Add Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}