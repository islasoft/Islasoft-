import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckSquare, Square, Users, User } from 'lucide-react';
import { toast } from 'sonner';

const PROJECT_CATEGORIES = {
  tax_compliance: {
    label: '🧾 Tax Compliance',
    types: [
      { value: 'individual_tax_1040', label: 'Individual Tax Return – Form 1040' },
      { value: 'business_tax_1120', label: 'Business Tax Return – Form 1120' },
      { value: 's_corp_tax_1120s', label: 'S-Corporation Tax Return – Form 1120-S' },
      { value: 'partnership_tax_1065', label: 'Partnership Tax Return – Form 1065' },
      { value: 'nonprofit_tax_990', label: 'Nonprofit Tax Return – Form 990/990-EZ' },
      { value: 'amended_tax_1040x', label: 'Amended Tax Return – Form 1040-X' },
      { value: 'extension_filing', label: 'Extension Filing – Federal & State' },
      { value: 'estimated_tax_quarterly', label: 'Estimated Tax Payments – Quarterly' },
      { value: 'k1_preparation', label: 'K-1 Preparation & Distribution' },
      { value: 'tax_planning_session', label: 'Tax Planning & Strategy Session' },
    ]
  },
  entity_structuring: {
    label: '🏢 Entity & Structuring',
    types: [
      { value: 'entity_formation', label: 'New Entity Formation (LLC/Corp/Nonprofit)' },
      { value: 's_corp_election_2553', label: 'S-Corp Election – Form 2553' },
      { value: 'entity_classification_8832', label: 'Entity Classification Election – Form 8832' },
      { value: 'entity_conversion', label: 'Entity Conversion (LLC ↔ Corp)' },
      { value: 'operating_agreement_bylaws', label: 'Operating Agreement / Bylaws Drafting' },
      { value: 'holding_company_structure', label: 'Holding Company Structuring' },
      { value: 'dissolution_closure', label: 'Dissolution / Entity Closure' },
      { value: 'sunbiz_annual_report', label: 'Sunbiz Annual Report Filing' },
    ]
  },
  bookkeeping_accounting: {
    label: '📊 Bookkeeping & Accounting',
    types: [
      { value: 'monthly_bookkeeping', label: 'Monthly Bookkeeping' },
      { value: 'quarterly_bookkeeping', label: 'Quarterly Bookkeeping Cleanup' },
      { value: 'annual_bookkeeping', label: 'Annual Bookkeeping Cleanup' },
      { value: 'bank_reconciliations', label: 'Bank & Credit Card Reconciliations' },
      { value: 'chart_of_accounts_setup', label: 'Chart of Accounts Setup' },
      { value: 'journal_entry_adjustments', label: 'Journal Entry Adjustments' },
      { value: 'financial_statement_prep', label: 'Financial Statement Preparation' },
      { value: 'quickbooks_setup', label: 'QuickBooks Setup / Migration' },
      { value: 'quickbooks_review', label: 'QuickBooks Review & Diagnostics' },
    ]
  },
  payroll_employment: {
    label: '💰 Payroll & Employment Tax',
    types: [
      { value: 'payroll_setup', label: 'Payroll Setup' },
      { value: 'payroll_processing', label: 'Weekly / Biweekly Payroll Processing' },
      { value: 'quarterly_payroll_941', label: 'Quarterly Payroll Reports (941/RT-6)' },
      { value: 'annual_payroll_w2', label: 'Annual Payroll Forms (W-2/W-3)' },
      { value: '1099_preparation', label: '1099-NEC / 1099-MISC Preparation' },
      { value: 'payroll_audit_cleanup', label: 'Payroll Audit & Cleanup' },
      { value: 'workers_comp_audit', label: 'Workers\' Comp Audit Support' },
    ]
  },
  sales_local_tax: {
    label: '🧾 Sales & Local Taxes',
    types: [
      { value: 'sales_tax_registration', label: 'Sales Tax Registration' },
      { value: 'monthly_sales_tax', label: 'Monthly Sales Tax Filing' },
      { value: 'quarterly_sales_tax', label: 'Quarterly Sales Tax Filing' },
      { value: 'sales_tax_audit', label: 'Sales Tax Audit Support' },
      { value: 'florida_dr405', label: 'Florida DR-405 Filing' },
      { value: 'state_local_filings', label: 'Other State & Local Filings' },
    ]
  },
  irs_representation: {
    label: '🏦 IRS & Agency Representation',
    types: [
      { value: 'irs_notice_review', label: 'IRS Notice Review' },
      { value: 'penalty_abatement', label: 'Penalty Abatement Request' },
      { value: 'irs_account_reconciliation', label: 'IRS Account Reconciliation' },
      { value: 'eftps_setup', label: 'EFTPS Setup & Management' },
      { value: 'power_of_attorney_2848', label: 'Power of Attorney – Form 2848' },
      { value: 'installment_agreement', label: 'Installment Agreement Setup' },
      { value: 'audit_representation', label: 'Audit Representation' },
    ]
  },
  advisory_cfo: {
    label: '🧠 Advisory & CFO Services',
    types: [
      { value: 'cash_flow_analysis', label: 'Cash Flow Analysis' },
      { value: 'budgeting_forecasting', label: 'Budgeting & Forecasting' },
      { value: 'cfo_services', label: 'Business Advisory / CFO Services' },
      { value: 'profitability_analysis', label: 'Profitability Analysis' },
      { value: 'tax_optimization_review', label: 'Entity Tax Optimization Review' },
    ]
  },
  audit_assurance: {
    label: '🔍 Audit & Assurance',
    types: [
      { value: 'financial_statement_audit', label: 'Financial Statement Audit' },
      { value: 'compilation_engagement', label: 'Compilation Engagement' },
      { value: 'review_engagement', label: 'Review Engagement' },
      { value: 'agreed_upon_procedures', label: 'Agreed-Upon Procedures (AUP)' },
      { value: 'internal_control_review', label: 'Internal Control Review' },
      { value: 'internal_control_testing', label: 'Internal Control Testing' },
      { value: 'specific_accounts_audit', label: 'Audit of Specific Accounts' },
      { value: 'forensic_accounting', label: 'Forensic Accounting Investigation' },
      { value: 'fraud_examination', label: 'Fraud Examination' },
      { value: 'payroll_audit', label: 'Payroll Audit' },
      { value: 'sales_tax_audit_rep', label: 'Sales & Use Tax Audit' },
      { value: 'irs_audit_rep', label: 'IRS Audit Representation' },
      { value: 'state_tax_audit', label: 'State Tax Audit Representation' },
      { value: 'workers_comp_audit_rep', label: 'Workers\' Compensation Audit' },
      { value: 'nonprofit_compliance_audit', label: 'Nonprofit Compliance Audit' },
      { value: 'grant_program_audit', label: 'Grant or Program Audit' },
      { value: 'hud_compliance_audit', label: 'HUD / Government Compliance Audit' },
      { value: 'due_diligence_review', label: 'Due Diligence Review' },
      { value: 'litigation_support', label: 'Litigation Support' },
      { value: 'cost_segregation_review', label: 'Cost Segregation Review' },
      { value: 'benefit_plan_audit', label: 'Benefit Plan Audit Support' },
      { value: 'internal_audit_outsourcing', label: 'Internal Audit Outsourcing' },
      { value: 'risk_assessment', label: 'Risk Assessment Engagement' },
    ]
  },
  systems_internal: {
    label: '🔧 Systems & Internal',
    types: [
      { value: 'client_onboarding', label: 'Client Onboarding' },
      { value: 'client_offboarding', label: 'Client Offboarding' },
      { value: 'document_management', label: 'Document Management Setup' },
      { value: 'practice_management_setup', label: 'Practice Management Setup' },
      { value: 'automation_workflow', label: 'Automation & Workflow Design' },
      { value: 'client_portal_setup', label: 'Client Portal Setup' },
      { value: 'internal_compliance_review', label: 'Internal Compliance Review' },
    ]
  }
};

export default function BulkProjectDialog({ open, onClose, clients, teamMembers, onSubmit }) {
  const [formData, setFormData] = useState({
    project_category: '',
    project_type: '',
    budget_hours: '',
    is_recurring: false,
    recurrence_frequency: '',
    due_date: '',
    description: '',
  });
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientAssignments, setClientAssignments] = useState({});
  const [assignmentMode, setAssignmentMode] = useState('bulk'); // 'bulk' or 'individual'
  const [bulkAssignedTo, setBulkAssignedTo] = useState({ id: '', name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const availableProjectTypes = formData.project_category 
    ? PROJECT_CATEGORIES[formData.project_category]?.types || []
    : [];

  const filteredClients = clients.filter(client => 
    client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleClient = (clientId) => {
    setSelectedClients(prev => {
      const newSelected = prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId];
      
      // Remove assignment if client is deselected
      if (!newSelected.includes(clientId)) {
        setClientAssignments(current => {
          const updated = { ...current };
          delete updated[clientId];
          return updated;
        });
      }
      
      return newSelected;
    });
  };

  const toggleAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
      setClientAssignments({});
    } else {
      setSelectedClients(filteredClients.map(c => c.id));
    }
  };

  const setClientAssignment = (clientId, assignedToId) => {
    const assignedMember = teamMembers.find(m => m.id === assignedToId);
    setClientAssignments(prev => ({
      ...prev,
      [clientId]: {
        assigned_to_id: assignedToId,
        assigned_to_name: assignedMember?.display_name || assignedMember?.full_name || '',
      }
    }));
  };

  const handleSubmit = async () => {
    if (!formData.project_category || !formData.project_type || !formData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedClients.length === 0) {
      toast.error('Please select at least one client');
      return;
    }

    // Check assignments based on mode
    if (assignmentMode === 'bulk') {
      if (!bulkAssignedTo.id) {
        toast.error('Please assign a team member');
        return;
      }
    } else {
      const unassignedClients = selectedClients.filter(clientId => !clientAssignments[clientId]);
      if (unassignedClients.length > 0) {
        toast.error('Please assign a team member to all selected clients');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const projectsToCreate = [];
      const baseDate = new Date(formData.due_date);
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      
      selectedClients.forEach(clientId => {
        const client = clients.find(c => c.id === clientId);
        const assignment = assignmentMode === 'bulk' ? bulkAssignedTo : clientAssignments[clientId];
        
        // For recurring projects, create all occurrences for next 2 years
        if (formData.is_recurring && formData.recurrence_frequency) {
          let currentDate = new Date(baseDate);
          
          while (currentDate <= twoYearsFromNow) {
            projectsToCreate.push({
              client_id: clientId,
              client_name: client?.company_name || '',
              project_category: formData.project_category,
              project_type: formData.project_type,
              assigned_to_id: assignment.id || assignment.assigned_to_id,
              assigned_to_name: assignment.name || assignment.assigned_to_name,
              budget_hours: formData.budget_hours || null,
              is_recurring: false,
              recurrence_frequency: null,
              due_date: currentDate.toISOString().split('T')[0],
              description: formData.description,
              status: 'not_started',
            });
            
            // Calculate next occurrence
            if (formData.recurrence_frequency === 'weekly') {
              currentDate = new Date(currentDate);
              currentDate.setDate(currentDate.getDate() + 7);
            } else if (formData.recurrence_frequency === 'biweekly') {
              currentDate = new Date(currentDate);
              currentDate.setDate(currentDate.getDate() + 14);
            } else if (formData.recurrence_frequency === 'monthly') {
              currentDate = new Date(currentDate);
              currentDate.setMonth(currentDate.getMonth() + 1);
            } else if (formData.recurrence_frequency === 'quarterly') {
              currentDate = new Date(currentDate);
              currentDate.setMonth(currentDate.getMonth() + 3);
            } else if (formData.recurrence_frequency === 'annual') {
              currentDate = new Date(currentDate);
              currentDate.setFullYear(currentDate.getFullYear() + 1);
            } else {
              break;
            }
          }
        } else {
          // Single project per client
          projectsToCreate.push({
            client_id: clientId,
            client_name: client?.company_name || '',
            project_category: formData.project_category,
            project_type: formData.project_type,
            assigned_to_id: assignment.id || assignment.assigned_to_id,
            assigned_to_name: assignment.name || assignment.assigned_to_name,
            budget_hours: formData.budget_hours || null,
            is_recurring: false,
            recurrence_frequency: null,
            due_date: formData.due_date,
            description: formData.description,
            status: 'not_started',
          });
        }
      });

      await onSubmit(projectsToCreate);
      toast.success(`${projectsToCreate.length} projects created successfully`);
      onClose();
    } catch (error) {
      toast.error('Failed to create projects');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Projects in Bulk</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Project Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Category *</Label>
                <Select
                  value={formData.project_category}
                  onValueChange={(value) => setFormData({ ...formData, project_category: value, project_type: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_CATEGORIES).map(([key, category]) => (
                      <SelectItem key={key} value={key}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project Type *</Label>
                <Select
                  value={formData.project_type}
                  onValueChange={(value) => setFormData({ ...formData, project_type: value })}
                  disabled={!formData.project_category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.project_category ? "Select project type" : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjectTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Budget Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.budget_hours}
                  onChange={(e) => setFormData({ ...formData, budget_hours: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Recurrence</Label>
                <Select
                  value={formData.recurrence_frequency}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    recurrence_frequency: value,
                    is_recurring: value !== ''
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Assignment Mode Selection */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Assignment</h3>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={assignmentMode === 'bulk' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAssignmentMode('bulk')}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Assign All to One Person
              </Button>
              <Button
                type="button"
                variant={assignmentMode === 'individual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAssignmentMode('individual')}
                className="flex-1"
              >
                <User className="w-4 h-4 mr-2" />
                Assign Per Client
              </Button>
            </div>

            {assignmentMode === 'bulk' && (
              <div className="space-y-2">
                <Label>Assign All Projects To *</Label>
                <Select
                  value={bulkAssignedTo.id}
                  onValueChange={(value) => {
                    const member = teamMembers.find(m => m.id === value);
                    setBulkAssignedTo({
                      id: value,
                      name: member?.display_name || member?.full_name || '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.display_name || member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Client Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Select Clients ({selectedClients.length} selected)</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAll}
              >
                {selectedClients.length === filteredClients.length ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Select All
                  </>
                )}
              </Button>
            </div>

            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No clients found</div>
              ) : (
                <div className="divide-y">
                  {filteredClients.map(client => (
                    <div
                      key={client.id}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={() => toggleClient(client.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{client.company_name}</div>
                        {client.contact_person && (
                          <div className="text-sm text-gray-500">{client.contact_person}</div>
                        )}
                      </div>
                      {selectedClients.includes(client.id) && assignmentMode === 'individual' && (
                        <div className="w-48" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={clientAssignments[client.id]?.assigned_to_id || ''}
                            onValueChange={(value) => setClientAssignment(client.id, value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {teamMembers.map(member => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.display_name || member.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              `Create ${selectedClients.length} Project${selectedClients.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}