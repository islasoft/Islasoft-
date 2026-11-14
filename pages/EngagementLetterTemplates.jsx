import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Trash2, Scale, ShieldCheck, Search, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const CLAUSE_TYPES = [
  { value: 'scope_of_services', label: 'Scope of Services' },
  { value: 'client_responsibilities', label: 'Client Responsibilities' },
  { value: 'fees_and_payment', label: 'Fees & Payment' },
  { value: 'limitation_of_liability', label: 'Limitation of Liability' },
  { value: 'confidentiality', label: 'Confidentiality' },
  { value: 'professional_standards', label: 'Professional Standards' },
  { value: 'engagement_period', label: 'Engagement Period' },
  { value: 'florida_specific', label: 'Florida-Specific' },
  { value: 'entity_specific', label: 'Entity-Specific' },
  { value: 'general', label: 'General' },
];

const ENTITY_TYPES = ['all', 'LLC', 'Corporation', 'S-Corp', 'Partnership', 'Sole Proprietorship', 'Nonprofit', 'Individual'];

const CLAUSE_TYPE_COLORS = {
  florida_specific: 'bg-orange-100 text-orange-700 border-orange-200',
  entity_specific: 'bg-purple-100 text-purple-700 border-purple-200',
  limitation_of_liability: 'bg-red-100 text-red-700 border-red-200',
  confidentiality: 'bg-blue-100 text-blue-700 border-blue-200',
  professional_standards: 'bg-green-100 text-green-700 border-green-200',
  scope_of_services: 'bg-sky-100 text-sky-700 border-sky-200',
  fees_and_payment: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  general: 'bg-gray-100 text-gray-700 border-gray-200',
  client_responsibilities: 'bg-amber-100 text-amber-700 border-amber-200',
  engagement_period: 'bg-slate-100 text-slate-700 border-slate-200',
};

const EMPTY_TEMPLATE = {
  name: '', clause_type: 'general', applicable_entity_types: ['all'],
  applicable_services: [], content: '', is_required: true, is_active: true,
  legal_reference: '', sort_order: 100, notes: '',
};

function TemplateForm({ template, onSave, onCancel }) {
  const [form, setForm] = useState(template || EMPTY_TEMPLATE);
  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const toggleEntity = (type) => {
    const curr = form.applicable_entity_types || [];
    if (type === 'all') { set('applicable_entity_types', ['all']); return; }
    const without = curr.filter(t => t !== 'all' && t !== type);
    set('applicable_entity_types', curr.includes(type) ? without : [...without, type]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Clause Name *</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., LLC Liability Limitation" />
        </div>
        <div>
          <Label>Clause Type *</Label>
          <Select value={form.clause_type} onValueChange={v => set('clause_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLAUSE_TYPES.map(ct => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sort Order</Label>
          <Input type="number" value={form.sort_order} onChange={e => set('sort_order', Number(e.target.value))} />
        </div>
      </div>

      <div>
        <Label>Applicable Entity Types</Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {ENTITY_TYPES.map(et => (
            <button key={et} type="button"
              onClick={() => toggleEntity(et)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                (form.applicable_entity_types || []).includes(et)
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-blue-400'
              }`}
            >{et}</button>
          ))}
        </div>
      </div>

      <div>
        <Label>Legal Reference / Citation</Label>
        <Input value={form.legal_reference} onChange={e => set('legal_reference', e.target.value)} placeholder="e.g., Fla. Stat. § 473.315; AICPA ET § 1.700" />
      </div>

      <div>
        <Label>Clause Content *</Label>
        <Textarea value={form.content} onChange={e => set('content', e.target.value)} className="min-h-[180px] font-mono text-sm" placeholder="Full text of the clause…" />
      </div>

      <div>
        <Label>Internal Notes</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="min-h-[60px]" placeholder="Notes for the CPA team…" />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={form.is_required} onCheckedChange={v => set('is_required', v)} id="required" />
          <Label htmlFor="required">Required (mandatory inclusion)</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} id="active" />
          <Label htmlFor="active">Active</Label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || !form.content}>
          Save Clause
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function EngagementLetterTemplates() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all_types');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['engagement-letter-templates'],
    queryFn: () => base44.entities.EngagementLetterTemplate.list('sort_order'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingTemplate?.id
      ? base44.entities.EngagementLetterTemplate.update(editingTemplate.id, data)
      : base44.entities.EngagementLetterTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-letter-templates'] });
      setShowForm(false);
      setEditingTemplate(null);
      toast.success('Clause saved successfully');
    },
    onError: () => toast.error('Failed to save clause'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EngagementLetterTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-letter-templates'] });
      toast.success('Clause deleted');
    },
  });

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.content?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all_types' || t.clause_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Scale className="w-7 h-7 text-blue-600" /> Engagement Letter Templates
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage Florida-specific and entity-specific legal clauses. Required clauses are automatically injected by the AI when generating engagement letters.</p>
        </div>
        <Button onClick={() => { setEditingTemplate(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> New Clause
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Clauses', value: templates.length, color: 'text-blue-600' },
          { label: 'Required', value: templates.filter(t => t.is_required).length, color: 'text-red-600' },
          { label: 'Florida-Specific', value: templates.filter(t => t.clause_type === 'florida_specific').length, color: 'text-orange-600' },
          { label: 'Active', value: templates.filter(t => t.is_active).length, color: 'text-green-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input placeholder="Search clauses…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_types">All Types</SelectItem>
            {CLAUSE_TYPES.map(ct => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Clauses list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading templates…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No clauses found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} className={`border ${!t.is_active ? 'opacity-50' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                      {t.is_required && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <ShieldCheck className="w-3 h-3" /> Required
                        </span>
                      )}
                      {!t.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${CLAUSE_TYPE_COLORS[t.clause_type] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {CLAUSE_TYPES.find(c => c.value === t.clause_type)?.label || t.clause_type}
                      </span>
                      {(t.applicable_entity_types || []).map(et => (
                        <span key={et} className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{et}</span>
                      ))}
                      {t.legal_reference && (
                        <span className="text-xs text-gray-400 italic truncate max-w-xs" title={t.legal_reference}>
                          {t.legal_reference}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => { setEditingTemplate(t); setShowForm(true); }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500 hover:text-red-600"
                      onClick={() => { if (window.confirm('Delete this clause?')) deleteMutation.mutate(t.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 line-clamp-3 font-mono whitespace-pre-wrap">{t.content}</p>
                {t.notes && <p className="text-xs text-amber-700 mt-1.5 italic">Note: {t.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); setEditingTemplate(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Clause' : 'New Legal Clause'}</DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editingTemplate}
            onSave={(data) => saveMutation.mutate(data)}
            onCancel={() => { setShowForm(false); setEditingTemplate(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}