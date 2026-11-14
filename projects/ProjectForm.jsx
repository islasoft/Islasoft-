import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { notificationService } from '@/components/notifications/notificationService';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MobileSelect } from '@/components/ui/mobile-select';
import { SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Save } from 'lucide-react';
import FeatureGateModal from '@/components/addons/FeatureGateModal';

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

export default function ProjectForm({ project, clients, teamMembers, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(project || {
    client_id: '',
    description: '',
    project_category: '',
    project_type: '',
    assigned_to_id: '',
    assigned_to_name: '',
    budget_hours: '',
    budget_amount: '',
    priority: 'medium',
    start_date: '',
    completion_percentage: 0,
    is_recurring: false,
    recurrence_frequency: '',
    due_date: '',
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [showGate, setShowGate] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Auto-adjust completion_percentage when status changes
  const handleStatusChange = (newStatus) => {
    let completion = formData.completion_percentage;
    if (newStatus === 'completed') completion = 100;
    else if (newStatus === 'not_started') completion = 0;
    setFormData({ ...formData, status: newStatus, completion_percentage: completion });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.project_category || !formData.project_type || !formData.assigned_to_id || !formData.due_date) {
      alert('Please fill in all required fields: Client, Project Category, Project Type, Assigned To, and Due Date');
      return;
    }

    // Gate check for partnership_1065
    if (formData.project_type === 'partnership_tax_1065') {
      const settings = await base44.entities.CompanySettings.list();
      const tenantId = settings[0]?.id;
      if (tenantId) {
        const activeAddons = await base44.entities.FeatureAddon.filter({ feature: 'partnership_1065', status: 'active' });
        const isActive = activeAddons.some(a => a.tenant_id === tenantId);
        if (!isActive) {
          setPendingSubmit(e);
          setShowGate(true);
          return;
        }
      }
    }
    
    const client = clients.find(c => c.id === formData.client_id);
    const assignedUser = teamMembers.find(m => m.id === formData.assigned_to_id);
    const previousAssignedId = project?.assigned_to_id;
    
    // If editing existing project, just update it
    if (project) {
      const dataToSubmit = {
        ...formData,
        client_name: client?.company_name || '',
        budget_hours: formData.budget_hours || null,
        budget_amount: formData.budget_amount || null,
      };
      await onSubmit(dataToSubmit);
      
      // Send notification if assignment changed
      if (assignedUser && previousAssignedId !== formData.assigned_to_id) {
        await notificationService.notifyProjectAssignment(dataToSubmit, assignedUser);
      }
      return;
    }
    
    // For new recurring projects, generate all occurrences for next 2 years
    if (formData.is_recurring && formData.recurrence_frequency) {
      const projects = [];
      const baseDate = new Date(formData.due_date);
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      
      let currentDate = new Date(baseDate);
      
      while (currentDate <= twoYearsFromNow) {
        projects.push({
          ...formData,
          client_name: client?.company_name || '',
          status: 'not_started',
          budget_hours: formData.budget_hours || null,
          budget_amount: formData.budget_amount || null,
          due_date: currentDate.toISOString().split('T')[0],
          is_recurring: false, // Individual instances are not marked as recurring
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
      
      // Submit all projects at once
      await onSubmit(projects);
      
      // Send notification
      if (assignedUser) {
        await notificationService.notifyProjectAssignment(
          { ...formData, client_name: client?.company_name },
          assignedUser
        );
      }
    } else {
      // Single project
      const dataToSubmit = {
        ...formData,
        client_name: client?.company_name || '',
        status: 'not_started',
        budget_hours: formData.budget_hours || null,
        budget_amount: formData.budget_amount || null,
      };
      
      await onSubmit(dataToSubmit);
      
      // Send notification
      if (assignedUser) {
        await notificationService.notifyProjectAssignment(dataToSubmit, assignedUser);
      }
    }
  };

  const handleAssignedToChange = (assignedToId) => {
    const assignedMember = teamMembers.find(m => m.id === assignedToId);
    console.log('Assigning project to user:', { 
      id: assignedToId, 
      name: assignedMember?.display_name || assignedMember?.full_name,
      fullMember: assignedMember
    });
    setFormData({
      ...formData,
      assigned_to_id: assignedToId,
      assigned_to_name: assignedMember?.display_name || assignedMember?.full_name || '',
    });
  };

  const availableProjectTypes = formData.project_category 
    ? PROJECT_CATEGORIES[formData.project_category]?.types || []
    : [];

  const canEditAssignment = currentUser && (currentUser.role === 'admin' || currentUser.team_category === 'cpa' || currentUser.team_category === 'senior_staff');

  return (
    <>
    {showGate && (
      <FeatureGateModal
        feature="partnership_1065"
        onActivated={() => { setShowGate(false); if (pendingSubmit) handleSubmit(pendingSubmit); }}
        onClose={() => setShowGate(false)}
      />
    )}
    <Card>
      <CardHeader>
        <CardTitle>{project ? 'Edit Project' : 'Create New Project'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <MobileSelect
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                placeholder="Select client"
              >
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </MobileSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_category">Project Category *</Label>
              <MobileSelect
                value={formData.project_category}
                onValueChange={(value) => setFormData({ ...formData, project_category: value, project_type: '' })}
                placeholder="Select category"
              >
                {Object.entries(PROJECT_CATEGORIES).map(([key, category]) => (
                  <SelectItem key={key} value={key}>
                    {category.label}
                  </SelectItem>
                ))}
              </MobileSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_type">Project Type *</Label>
              <MobileSelect
                value={formData.project_type}
                onValueChange={(value) => setFormData({ ...formData, project_type: value })}
                placeholder={formData.project_category ? "Select project type" : "Select category first"}
              >
                {availableProjectTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </MobileSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_to_id">
                Assigned To * {!canEditAssignment && <span className="text-xs text-gray-500">(CPA/Senior Staff only)</span>}
              </Label>
              <MobileSelect
                value={formData.assigned_to_id}
                onValueChange={handleAssignedToChange}
                placeholder={canEditAssignment ? "Select team member" : "Access restricted"}
              >
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.display_name || member.full_name} {member.team_category ? `(${member.team_category})` : ''}
                  </SelectItem>
                ))}
              </MobileSelect>
            </div>
            {project && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <MobileSelect
                  value={formData.status}
                  onValueChange={handleStatusChange}
                  placeholder="Select status"
                >
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </MobileSelect>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <MobileSelect
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                placeholder="Select priority"
              >
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </MobileSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
            {canEditAssignment && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="budget_hours">Budget Hours</Label>
                  <Input
                    id="budget_hours"
                    type="number"
                    step="0.5"
                    value={formData.budget_hours}
                    onChange={(e) => setFormData({ ...formData, budget_hours: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget_amount">Budget Amount ($)</Label>
                  <Input
                    id="budget_amount"
                    type="number"
                    step="0.01"
                    value={formData.budget_amount}
                    onChange={(e) => setFormData({ ...formData, budget_amount: parseFloat(e.target.value) })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
            />
            <Label htmlFor="is_recurring" className="cursor-pointer">
              Recurring Project
            </Label>
          </div>

          {formData.is_recurring && (
           <div className="space-y-2">
             <Label htmlFor="recurrence_frequency">Recurrence Frequency</Label>
             <MobileSelect
               value={formData.recurrence_frequency}
               onValueChange={(value) => setFormData({ ...formData, recurrence_frequency: value })}
               placeholder="Select frequency"
             >
               <SelectItem value="weekly">Weekly</SelectItem>
               <SelectItem value="biweekly">Biweekly</SelectItem>
               <SelectItem value="monthly">Monthly</SelectItem>
               <SelectItem value="quarterly">Quarterly</SelectItem>
               <SelectItem value="annual">Annual</SelectItem>
             </MobileSelect>
           </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {project ? 'Update' : 'Create'}
          </Button>
        </CardFooter>
      </form>
    </Card>
    </>
  );
}