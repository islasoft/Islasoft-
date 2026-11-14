import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Circle, Play, Plus, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const workflowTemplates = {
  individual_tax: [
    { step_name: 'Initial consultation', description: 'Schedule and conduct initial client meeting', required_documents: ['ID', 'Prior year returns'] },
    { step_name: 'Engagement letter', description: 'Send and receive signed engagement letter', required_documents: ['Engagement letter'] },
    { step_name: 'Document collection', description: 'Collect W-2s, 1099s, and other tax documents', required_documents: ['W-2', '1099', 'Deduction receipts'] },
    { step_name: 'Portal setup', description: 'Create client portal access', required_documents: [] },
    { step_name: 'Bank information', description: 'Collect bank account for refunds/payments', required_documents: ['Bank info'] },
    { step_name: 'Review & approval', description: 'Final review and client approval', required_documents: [] },
  ],
  business_entity: [
    { step_name: 'Business consultation', description: 'Discuss business structure and needs', required_documents: [] },
    { step_name: 'Engagement letter', description: 'Sign service agreement', required_documents: ['Engagement letter'] },
    { step_name: 'Entity formation docs', description: 'Collect articles of incorporation, EIN', required_documents: ['Articles', 'EIN letter'] },
    { step_name: 'Financial setup', description: 'Set up accounting software access', required_documents: ['Bank statements', 'QB access'] },
    { step_name: 'Portal & access', description: 'Create portal and system access', required_documents: [] },
    { step_name: 'Initial compliance', description: 'Complete initial compliance requirements', required_documents: [] },
  ],
  bookkeeping: [
    { step_name: 'Consultation', description: 'Discuss bookkeeping needs and frequency', required_documents: [] },
    { step_name: 'Service agreement', description: 'Sign bookkeeping service agreement', required_documents: ['Service agreement'] },
    { step_name: 'Financial access', description: 'Get access to bank accounts and credit cards', required_documents: ['Bank credentials'] },
    { step_name: 'Software setup', description: 'Set up or access accounting software', required_documents: [] },
    { step_name: 'Chart of accounts', description: 'Review and customize chart of accounts', required_documents: [] },
    { step_name: 'Historical data', description: 'Import and clean up historical transactions', required_documents: [] },
  ],
  payroll: [
    { step_name: 'Payroll consultation', description: 'Discuss payroll requirements', required_documents: [] },
    { step_name: 'Service agreement', description: 'Sign payroll service agreement', required_documents: ['Service agreement'] },
    { step_name: 'Employee information', description: 'Collect W-4s and employee details', required_documents: ['W-4s', 'I-9s'] },
    { step_name: 'Tax registrations', description: 'Complete federal and state registrations', required_documents: ['EIN', 'State IDs'] },
    { step_name: 'Payroll setup', description: 'Configure payroll system', required_documents: [] },
    { step_name: 'First payroll run', description: 'Process first payroll', required_documents: [] },
  ],
  advisory: [
    { step_name: 'Discovery meeting', description: 'Understand business goals and challenges', required_documents: [] },
    { step_name: 'Engagement letter', description: 'Sign advisory engagement letter', required_documents: ['Engagement letter'] },
    { step_name: 'Financial review', description: 'Review current financials', required_documents: ['Financial statements', 'Tax returns'] },
    { step_name: 'Strategy session', description: 'Develop strategic recommendations', required_documents: [] },
    { step_name: 'Action plan', description: 'Create implementation action plan', required_documents: [] },
  ],
  audit: [
    { step_name: 'Pre-audit meeting', description: 'Discuss audit scope and timeline', required_documents: [] },
    { step_name: 'Engagement letter', description: 'Sign audit engagement letter', required_documents: ['Engagement letter'] },
    { step_name: 'Document request list', description: 'Provide and receive initial documents', required_documents: ['Financial statements', 'Trial balance'] },
    { step_name: 'Planning phase', description: 'Complete audit planning procedures', required_documents: [] },
    { step_name: 'Fieldwork phase', description: 'Conduct audit fieldwork', required_documents: [] },
    { step_name: 'Final review', description: 'Complete audit and issue report', required_documents: [] },
  ],
};

export default function OnboardingWorkflowManager({ clientId, clientName }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflowType, setWorkflowType] = useState('individual_tax');
  const queryClient = useQueryClient();

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows', clientId],
    queryFn: () => base44.entities.OnboardingWorkflow.filter({ client_id: clientId }, '-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OnboardingWorkflow.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Onboarding workflow started');
      setShowDialog(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnboardingWorkflow.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow updated');
    },
  });

  const handleStartWorkflow = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const type = formData.get('workflow_type');
    const assignedTo = formData.get('assigned_to_id');
    const user = users.find(u => u.id === assignedTo);

    const steps = workflowTemplates[type].map(step => ({
      ...step,
      status: 'pending',
      completed_date: null,
      completed_by: null,
      notes: '',
      documents_received: [],
    }));

    createMutation.mutate({
      client_id: clientId,
      client_name: clientName,
      workflow_type: type,
      status: 'in_progress',
      started_date: new Date().toISOString(),
      assigned_to_id: assignedTo,
      assigned_to_name: user?.full_name || '',
      steps,
      completion_percentage: 0,
      notes: formData.get('notes'),
    });
  };

  const handleStepUpdate = (workflow, stepIndex, field, value) => {
    const updatedSteps = [...workflow.steps];
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], [field]: value };

    if (field === 'status' && value === 'completed' && !updatedSteps[stepIndex].completed_date) {
      updatedSteps[stepIndex].completed_date = new Date().toISOString();
      updatedSteps[stepIndex].completed_by = 'Current User';
    }

    const completedCount = updatedSteps.filter(s => s.status === 'completed').length;
    const percentage = Math.round((completedCount / updatedSteps.length) * 100);
    const allCompleted = completedCount === updatedSteps.length;

    updateMutation.mutate({
      id: workflow.id,
      data: {
        steps: updatedSteps,
        completion_percentage: percentage,
        status: allCompleted ? 'completed' : workflow.status,
        completed_date: allCompleted ? new Date().toISOString() : null,
      },
    });
  };

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
  };

  const stepStatusIcons = {
    pending: Circle,
    in_progress: Clock,
    completed: CheckCircle2,
    skipped: Circle,
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Onboarding Workflows</h3>
        <Button onClick={() => setShowDialog(true)} size="sm">
          <Play className="w-4 h-4 mr-2" />
          Start Workflow
        </Button>
      </div>

      <div className="space-y-4">
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <Play className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No onboarding workflows started</p>
            </CardContent>
          </Card>
        ) : (
          workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">
                      {workflow.workflow_type.replace(/_/g, ' ').toUpperCase()} Onboarding
                    </CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge className={statusColors[workflow.status]}>
                        {workflow.status.replace(/_/g, ' ')}
                      </Badge>
                      {workflow.assigned_to_name && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {workflow.assigned_to_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {workflow.completion_percentage}%
                    </div>
                    <p className="text-xs text-gray-600">Complete</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={workflow.completion_percentage} className="mb-4" />

                <div className="space-y-3">
                  {workflow.steps?.map((step, index) => {
                    const StatusIcon = stepStatusIcons[step.status];
                    return (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <StatusIcon
                            className={`w-5 h-5 mt-1 ${
                              step.status === 'completed'
                                ? 'text-green-600'
                                : step.status === 'in_progress'
                                ? 'text-blue-600'
                                : 'text-gray-400'
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <h5 className="font-medium">{step.step_name}</h5>
                                <p className="text-sm text-gray-600">{step.description}</p>
                              </div>
                              <Select
                                value={step.status}
                                onValueChange={(value) =>
                                  handleStepUpdate(workflow, index, 'status', value)
                                }
                              >
                                <SelectTrigger className="w-32 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="skipped">Skipped</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {step.required_documents?.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-700 mb-1">
                                  Required Documents:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {step.required_documents.map((doc, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {doc}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {step.completed_date && (
                              <p className="text-xs text-gray-500 mt-2">
                                Completed: {format(new Date(step.completed_date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {workflow.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{workflow.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Start Onboarding Workflow</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStartWorkflow} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workflow_type">Workflow Type *</Label>
              <Select
                name="workflow_type"
                value={workflowType}
                onValueChange={setWorkflowType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual_tax">Individual Tax</SelectItem>
                  <SelectItem value="business_entity">Business Entity</SelectItem>
                  <SelectItem value="bookkeeping">Bookkeeping</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="advisory">Advisory</SelectItem>
                  <SelectItem value="audit">Audit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to_id">Assign To *</Label>
              <Select name="assigned_to_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Workflow Steps Preview</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                <ul className="space-y-1 text-sm">
                  {workflowTemplates[workflowType]?.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Circle className="w-4 h-4 mt-0.5 text-gray-400" />
                      <span>{step.step_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Initial Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Add any initial notes or special instructions..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Start Workflow
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}