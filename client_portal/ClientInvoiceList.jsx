import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ClientInvoiceList({ clientId, simpleView = false }) {
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['clientInvoices', clientId],
    queryFn: () => base44.entities.Invoice.filter({ client_id: clientId }, '-issue_date'),
    enabled: !!clientId,
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async (invoiceId) => {
      const response = await base44.functions.invoke('generateInvoicePDF', { invoice_id: invoiceId });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.file_url) {
        window.open(data.file_url, '_blank');
      } else {
        toast.error('Failed to generate PDF for this invoice.');
      }
    },
    onError: () => {
      toast.error('Error generating invoice PDF.');
    },
  });

  if (isLoading) {
    return <p className="text-center text-gray-500 py-4">Loading invoices...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4">Error loading invoices.</p>;
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  const filteredInvoices = simpleView ? invoices.slice(0, 3) : invoices;

  return (
    <Card className={simpleView ? '' : 'mt-6'}>
      <CardHeader>
        <CardTitle>{simpleView ? "Recent Invoices" : "Your Invoices"}</CardTitle>
      </CardHeader>
      <CardContent>
        {filteredInvoices.length === 0 ? (
          <p className="text-gray-500">No invoices found for your account.</p>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map(invoice => (
              <div key={invoice.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">Invoice #{invoice.invoice_number}</h3>
                    <p className="text-sm text-gray-600 mt-1">{invoice.project_name || 'General Services'}</p>
                  </div>
                  <Badge className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}>
                    {invoice.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-semibold">${invoice.total?.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => downloadPdfMutation.mutate(invoice.id)} 
                    disabled={downloadPdfMutation.isPending}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  {invoice.cpacharge_payment_url && invoice.status !== 'paid' && (
                    <Button 
                      size="sm"
                      onClick={() => window.open(invoice.cpacharge_payment_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Pay Now
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}