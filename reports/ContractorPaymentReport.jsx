import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign, Calendar, User, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ContractorPaymentReport() {
  const queryClient = useQueryClient();

  const { data: payments = [] } = useQuery({
    queryKey: ['contractorPayments'],
    queryFn: () => base44.entities.ContractorPayment.list('-created_date'),
  });

  const handleDownloadPDF = async (paymentId) => {
    try {
      const response = await base44.functions.invoke('generateContractorPaymentPDF', { paymentId });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contractor-payment-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const markAsPaidMutation = useMutation({
    mutationFn: async (paymentId) => {
      await base44.entities.ContractorPayment.update(paymentId, {
        status: 'paid',
        paid_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractorPayments'] });
      toast.success('Payment marked as paid');
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Contractor Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No finalized payments yet. Approve and finalize contractor hours in the Approval tab.
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map(payment => (
                <Card key={payment.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="w-5 h-5 text-gray-400" />
                          <h3 className="text-lg font-semibold">{payment.contractor_name}</h3>
                          <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                            {payment.status === 'paid' ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Period:</span>
                            <span className="font-medium">
                              {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Hours:</span>
                            <span className="font-medium">{payment.total_hours.toFixed(2)} hrs</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Rate:</span>
                            <span className="font-medium">${payment.hourly_rate}/hr</span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          Approved by {payment.approved_by_name} on {formatDate(payment.created_date)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div className="text-3xl font-bold text-green-600">
                          ${payment.total_amount.toFixed(2)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPDF(payment.id)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            View PDF
                          </Button>
                          {payment.status === 'pending' && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => markAsPaidMutation.mutate(payment.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}