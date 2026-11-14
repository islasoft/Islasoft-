import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MobileSelect } from '@/components/ui/mobile-select';
import { SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, Plus, Trash2, CheckCircle, User, FolderKanban } from 'lucide-react';
import { generateNextClientNumber } from '@/lib/clientNumberGenerator';
import { toast } from 'sonner';

const PROJECT_TYPES_BY_CATEGORY = {
  'Tax Compliance': [
    { value: 'individual_tax_1040', label: 'Individual Tax Return (1040)' },
    { value: 'business_tax_1120', label: 'Business Tax Return (1120)' },
    { value: 's_corp_tax_1120s', label: 'S-Corp Tax Return (1120-S)' },
    { value: 'partnership_tax_1065', label: 'Partnership Tax Return (1065)' },
    { value: 'nonprofit_tax_990', label: 'Nonprofit Tax Return (990)' },
    { value: 'amended_tax_1040x', label: 'Amended Tax Return (1040-X)' },
    { value: 'extension_filing', label: 'Extension Filing' },
    { value: 'estimated_tax_quarterly', label: 'Estimated Quarterly Tax' },
    { value: 'k1_preparation', label: 'K-1 Preparation' },
  ],
  'Bookkeeping & Accounting': [
    { value: 'monthly_bookkeeping', label: 'Monthly Bookkeeping' },
    { value: 'quarterly_bookkeeping', label: 'Quarterly Bookkeeping' },
    { value: 'annual_bookkeeping', label: 'Annual Bookkeeping' },
    { value: 'financial_statement_prep', label: 'Financial Statement Prep' },
    { value: 'quickbooks_setup', label: 'QuickBooks Setup' },
    { value: 'quickbooks_review', label: 'QuickBooks Review' },
  ],
  'Payroll': [
    { value: 'payroll_setup', label: 'Payroll Setup' },
    { value: 'payroll_processing', label: 'Payroll Processing' },
    { value: 'quarterly_payroll_941', label: 'Quarterly Payroll (941)' },
    { value: 'annual_payroll_w2', label: 'Annual Payroll / W-2' },
    { value: '1099_preparation', label: '1099 Preparation' },
  ],
  'Entity Structuring': [
    { value: 'entity_formation', label: 'Entity Formation' },
    { value: 's_corp_election_2553', label: 'S-Corp Election (2553)' },
    { value: 'entity_conversion', label: 'Entity Conversion' },
    { value: 'dissolution_closure', label: 'Dissolution / Closure' },
  ],
};

const PROJECT_CATEGORY_MAP = {
  individual_tax_1040: 'tax_compliance', business_tax_1120: 'tax_compliance',
  s_corp_tax_1120s: 'tax_compliance', partnership_tax_1065: 'tax_compliance',
  nonprofit_tax_990: 'tax_compliance', amended_tax_1040x: 'tax_compliance',
  extension_filing: 'tax_compliance', estimated_tax_quarterly: 'tax_compliance',
  k1_preparation: 'tax_compliance', monthly_bookkeeping: 'bookkeeping_accounting',
  quarterly_bookkeeping: 'bookkeeping_accounting', annual_bookkeeping: 'bookkeeping_accounting',
  financial_statement_prep: 'bookkeeping_accounting', quickbooks_setup: 'bookkeeping_accounting',
  quickbooks_review: 'bookkeeping_accounting', payroll_setup: 'payroll_employment',
  payroll_processing: 'payroll_employment', quarterly_payroll_941: 'payroll_employment',
  annual_payroll_w2: 'payroll_employment', '1099_preparation': 'payroll_employment',
  entity_formation: 'entity_structuring', s_corp_election_2553: 'entity_structuring',
  entity_conversion: 'entity_structuring', dissolution_closure: 'entity_structuring',
};

const STEPS = ['Client Info', 'Projects', 'Review'];

export default function NewClientWizard({ teamMembers = [], onSuccess, onCancel }) {
  const [step, setStep] = useState(0);

  // Step 1: Client info
  const [clientData, setClientData] = useState({
    client_number: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    group: '',
    ein: '',
    incorporated_as: '',
    taxed_as: '',
    manager_id: '',
    manager_name: '',
    status: 'active',
    notes: '',
  });

  // Step 2: Projects list
  const [projects, setProjects] = useState([
    { project_type: '', due_date: '', assigned_to_id: '', assigned_to_name: '', priority: 'medium' }
  ]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    generateNextClientNumber(false).then(number => {
      setClientData(prev => ({ ...prev, client_number: number }));
    });
    // auto-generate registration token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(36)))
      .map(b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[b % 62])
      .join('');
    setClientData(prev => ({ ...prev, registration_token: token }));
  }, []);

  const handleManagerChange = (managerId) => {
    const manager = teamMembers.find(m => m.id === managerId);
    setClientData(prev => ({ ...prev, manager_id: managerId, manager_name: manager?.full_name || '' }));
  };

  const updateProject = (index, field, value) => {
    setProjects(prev => prev.map((p, i) => {
      if (i !== index) return p;
      if (field === 'assigned_to_id') {
        const member = teamMembers.find(m => m.id === value);
        return { ...p, assigned_to_id: value, assigned_to_name: member?.full_name || '' };
      }
      return { ...p, [field]: value };
    }));
  };

  const addProject = () => {
    setProjects(prev => [...prev, { project_type: '', due_date: '', assigned_to_id: '', assigned_to_name: '', priority: 'medium' }]);
  };

  const removeProject = (index) => {
    setProjects(prev => prev.filter((_, i) => i !== index));
  };

  const canProceedStep1 = clientData.company_name && clientData.email;
  const canProceedStep2 = projects.every(p => p.project_type && p.due_date && p.assigned_to_id);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Duplicate check
      const allClients = await base44.entities.Client.list();
      if (clientData.ein) {
        const einMatch = allClients.find(c => c.ein && c.ein === clientData.ein);
        if (einMatch) {
          toast.error(`A client with EIN ${clientData.ein} already exists: ${einMatch.company_name}`);
          setSaving(false);
          return;
        }
      }
      if (clientData.company_name) {
        const nameMatch = allClients.find(c => c.company_name?.trim().toLowerCase() === clientData.company_name.trim().toLowerCase());
        if (nameMatch) {
          toast.error(`A client named "${clientData.company_name}" already exists (${nameMatch.client_number}).`);
          setSaving(false);
          return;
        }
      }

      // Create client
      const newClient = await base44.entities.Client.create(clientData);

      // Create all projects
      const projectPromises = projects
        .filter(p => p.project_type && p.due_date && p.assigned_to_id)
        .map(p => base44.entities.Project.create({
          client_id: newClient.id,
          client_name: clientData.company_name,
          project_type: p.project_type,
          project_category: PROJECT_CATEGORY_MAP[p.project_type] || 'tax_compliance',
          assigned_to_id: p.assigned_to_id,
          assigned_to_name: p.assigned_to_name,
          due_date: p.due_date,
          priority: p.priority,
          status: 'not_started',
        }));

      await Promise.all(projectPromises);

      toast.success(`Client created with ${projectPromises.length} project(s)!`);
      onSuccess();
    } catch (err) {
      toast.error('Failed to create client: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const allProjectTypes = Object.values(PROJECT_TYPES_BY_CATEGORY).flat();

  return (
    <Card className="border-2 border-blue-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">New Entity Client</CardTitle>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-3">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-sm font-medium ${i === step ? 'text-blue-600' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                {s}
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
            </React.Fragment>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* ── STEP 1: Client Info ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Number</Label>
                <Input value={clientData.client_number} onChange={e => setClientData(p => ({ ...p, client_number: e.target.value.toUpperCase() }))} placeholder="E-001" />
              </div>
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input value={clientData.company_name} onChange={e => setClientData(p => ({ ...p, company_name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={clientData.contact_person} onChange={e => setClientData(p => ({ ...p, contact_person: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={clientData.email} onChange={e => setClientData(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={clientData.phone} onChange={e => setClientData(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>EIN</Label>
                <Input value={clientData.ein} onChange={e => setClientData(p => ({ ...p, ein: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Incorporated As</Label>
                <MobileSelect value={clientData.incorporated_as} onValueChange={v => setClientData(p => ({ ...p, incorporated_as: v }))} placeholder="Select type">
                  <SelectItem value="LLC">LLC</SelectItem>
                  <SelectItem value="Corporation">Corporation</SelectItem>
                  <SelectItem value="S-Corp">S-Corp</SelectItem>
                  <SelectItem value="Partnership">Partnership</SelectItem>
                  <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                  <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                </MobileSelect>
              </div>
              <div className="space-y-2">
                <Label>Taxed As</Label>
                <MobileSelect value={clientData.taxed_as} onValueChange={v => setClientData(p => ({ ...p, taxed_as: v }))} placeholder="Select classification">
                  <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                  <SelectItem value="Partnership">Partnership</SelectItem>
                  <SelectItem value="S-Corporation">S-Corporation</SelectItem>
                  <SelectItem value="C-Corporation">C-Corporation</SelectItem>
                  <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                </MobileSelect>
              </div>
              <div className="space-y-2">
                <Label>Partner in Charge</Label>
                <MobileSelect value={clientData.manager_id} onValueChange={handleManagerChange} placeholder="Select partner">
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </MobileSelect>
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Input value={clientData.group} onChange={e => setClientData(p => ({ ...p, group: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={clientData.address} onChange={e => setClientData(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={clientData.city} onChange={e => setClientData(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={clientData.state} onChange={e => setClientData(p => ({ ...p, state: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>ZIP</Label>
                <Input value={clientData.zip_code} onChange={e => setClientData(p => ({ ...p, zip_code: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={clientData.notes} onChange={e => setClientData(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
        )}

        {/* ── STEP 2: Projects ── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Add the projects needed for <strong>{clientData.company_name}</strong>. Each project needs a type, due date, and assigned staff member.</p>

            {projects.map((proj, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3 bg-slate-50 relative">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">Project {i + 1}</span>
                  {projects.length > 1 && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 h-7 w-7 p-0" onClick={() => removeProject(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Project Type *</Label>
                    <MobileSelect value={proj.project_type} onValueChange={v => updateProject(i, 'project_type', v)} placeholder="Select project type...">
                      {Object.entries(PROJECT_TYPES_BY_CATEGORY).map(([cat, types]) => (
                        <React.Fragment key={cat}>
                          <SelectItem value={`__header_${cat}`} disabled className="font-semibold text-xs text-slate-500 uppercase tracking-wider">{cat}</SelectItem>
                          {types.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </MobileSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due Date *</Label>
                    <Input type="date" value={proj.due_date} onChange={e => updateProject(i, 'due_date', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <MobileSelect value={proj.priority} onValueChange={v => updateProject(i, 'priority', v)}>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </MobileSelect>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Assigned To *</Label>
                    <MobileSelect value={proj.assigned_to_id} onValueChange={v => updateProject(i, 'assigned_to_id', v)} placeholder="Select team member...">
                      {teamMembers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name} {m.team_category ? `(${m.team_category.replace('_', ' ')})` : ''}</SelectItem>
                      ))}
                    </MobileSelect>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addProject} className="w-full border-dashed">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Project
            </Button>
          </div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">Client</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Name</span><span className="font-medium">{clientData.company_name}</span>
                <span className="text-muted-foreground">Client #</span><span>{clientData.client_number}</span>
                <span className="text-muted-foreground">Email</span><span>{clientData.email}</span>
                {clientData.phone && <><span className="text-muted-foreground">Phone</span><span>{clientData.phone}</span></>}
                {clientData.incorporated_as && <><span className="text-muted-foreground">Incorporated As</span><span>{clientData.incorporated_as}</span></>}
                {clientData.manager_name && <><span className="text-muted-foreground">Partner in Charge</span><span>{clientData.manager_name}</span></>}
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">{projects.length} Project{projects.length !== 1 ? 's' : ''} to Create</span>
              </div>
              {projects.map((p, i) => {
                const label = Object.values(PROJECT_TYPES_BY_CATEGORY).flat().find(t => t.value === p.project_type)?.label || p.project_type;
                return (
                  <div key={i} className="text-sm border rounded p-2 bg-slate-50">
                    <div className="font-medium">{label}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">
                      Due: {p.due_date} · Assigned: {p.assigned_to_name} · Priority: {p.priority}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-4">
        <Button variant="outline" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}>
          {step === 0 ? 'Cancel' : <><ChevronLeft className="w-4 h-4 mr-1" /> Back</>}
        </Button>
        {step < 2 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 ? !canProceedStep1 : !canProceedStep2}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? 'Creating...' : <><CheckCircle className="w-4 h-4 mr-2" />Create Client & Projects</>}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}