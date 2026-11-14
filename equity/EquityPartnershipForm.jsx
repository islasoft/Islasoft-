import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, X, Save } from 'lucide-react';

const emptyPartner = () => ({ name: '', beginning_capital: 0, profit_percentage: 0, loss_percentage: 0, capital_percentage: 0 });

export default function EquityPartnershipForm({ onSubmit, onCancel, isPending, initial }) {
  const [form, setForm] = useState(initial || {
    name: '',
    tax_year: new Date().getFullYear(),
    period_start_label: '',
    period_end_label: '',
    partners: [emptyPartner()],
    notes: '',
  });

  const updatePartner = (i, field, value) => {
    const partners = [...form.partners];
    partners[i] = { ...partners[i], [field]: value };
    setForm({ ...form, partners });
  };

  const addPartner = () => setForm({ ...form, partners: [...form.partners, emptyPartner()] });
  const removePartner = (i) => setForm({ ...form, partners: form.partners.filter((_, idx) => idx !== i) });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New Partnership Record</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-2">
              <Label>Partnership Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Tax Year</Label>
              <Input type="number" value={form.tax_year} onChange={e => setForm({ ...form, tax_year: +e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Period Start</Label>
              <Input placeholder="Jan 1, 2024" value={form.period_start_label} onChange={e => setForm({ ...form, period_start_label: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Period End</Label>
              <Input placeholder="Dec 31, 2024" value={form.period_end_label} onChange={e => setForm({ ...form, period_end_label: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Partners</Label>
              <Button type="button" size="sm" variant="outline" onClick={addPartner}>
                <Plus className="w-3 h-3 mr-1" /> Add Partner
              </Button>
            </div>
            <div className="space-y-2">
              {form.partners.map((p, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-lg">
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Name</Label>
                    <Input className="h-8 text-sm" value={p.name} onChange={e => updatePartner(i, 'name', e.target.value)} placeholder="Partner name" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Beginning Capital</Label>
                    <Input className="h-8 text-sm" type="number" value={p.beginning_capital} onChange={e => updatePartner(i, 'beginning_capital', +e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Profit %</Label>
                    <Input className="h-8 text-sm" type="number" value={p.profit_percentage} onChange={e => updatePartner(i, 'profit_percentage', +e.target.value)} />
                  </div>
                  <div className="flex items-end gap-1">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Loss %</Label>
                      <Input className="h-8 text-sm" type="number" value={p.loss_percentage} onChange={e => updatePartner(i, 'loss_percentage', +e.target.value)} />
                    </div>
                    {form.partners.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => removePartner(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-1" />Cancel</Button>
          <Button type="submit" disabled={isPending} className="bg-sky-600 hover:bg-sky-700">
            <Save className="w-4 h-4 mr-1" />{isPending ? 'Saving...' : 'Create Partnership'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}