import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, FileText, ExternalLink, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ContractorOnboardingStatus() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const contractors = users.filter(u => u.contractor_form);

  const sendReminderMutation = useMutation({
    mutationFn: async (user) => {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Complete Your Contractor Onboarding',
        body: `Hi ${user.full_name},\n\nPlease complete your contractor onboarding to start logging time and working on projects.\n\nLog in to the system and follow the onboarding steps to:\n1. Set your hourly rate\n2. Provide banking details\n3. Upload your W-9 form\n4. Acknowledge company policies\n\nThank you!`
      });
    },
    onSuccess: () => {
      toast.success('Reminder email sent');
    },
    onError: () => {
      toast.error('Failed to send reminder');
    }
  });

  const resetOnboardingMutation = useMutation({
    mutationFn: async (userId) => {
      // This would need a backend function with service role to update another user
      await base44.functions.invoke('updateUserOnboarding', {
        userId,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('Onboarding reset');
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  const pendingContractors = contractors.filter(c => c.contractor_onboarding_status !== 'completed');
  const completedContractors = contractors.filter(c => c.contractor_onboarding_status === 'completed');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{contractors.length}</div>
            <div className="text-sm text-gray-600">Total Contractors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completedContractors.length}</div>
            <div className="text-sm text-gray-600">Onboarding Complete</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{pendingContractors.length}</div>
            <div className="text-sm text-gray-600">Pending Onboarding</div>
          </CardContent>
        </Card>
      </div>

      {pendingContractors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Onboarding ({pendingContractors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingContractors.map(contractor => (
                <div key={contractor.id} className="flex items-center justify-between p-4 border rounded-lg bg-amber-50">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{contractor.full_name}</div>
                    <div className="text-sm text-gray-600">{contractor.email}</div>
                    <div className="text-xs text-amber-700 mt-1">
                      Form: {contractor.contractor_form}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      <Clock className="w-3 h-3 mr-1" />
                      Incomplete
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendReminderMutation.mutate(contractor)}
                      disabled={sendReminderMutation.isPending}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Send Reminder
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Completed Onboarding ({completedContractors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedContractors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No contractors have completed onboarding yet
            </div>
          ) : (
            <div className="space-y-3">
              {completedContractors.map(contractor => (
                <div key={contractor.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900">{contractor.full_name}</div>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{contractor.email}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                      <div>
                        <span className="text-gray-500">Rate:</span>{' '}
                        <span className="font-medium">${contractor.contractor_hourly_rate}/hr</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Bank:</span>{' '}
                        <span className="font-medium">{contractor.bank_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">W-9:</span>{' '}
                        {contractor.w9_file_url ? (
                          <a href={contractor.w9_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400">No file</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Completed:</span>{' '}
                        <span className="font-medium">
                          {contractor.contractor_onboarding_completed_date
                            ? format(new Date(contractor.contractor_onboarding_completed_date), 'MMM d, yyyy')
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}