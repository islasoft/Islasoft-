import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, CreditCard, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentTracker({ clientId, clientName }) {
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check',
    reference_number: '',
    notes: ''
  });
  const queryClient = useQueryClient();

  // Fetch client's invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['clientInvoices', clientId],
    queryFn: () => base44.entities.Invoice.filter({ client_id: clientId })
  });

  // Fetch client's payments
  const { data: payments = [] } = useQuery({
    queryKey: ['clientPayments', clientId],
    queryFn: () => base44.entities.Payment.filter({ client_id: clientId })
  });

  // Calculate outstanding balance
  const financialSummary = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const outstanding = totalInvoiced - totalPaid;
    
    const unpaidInvoices = invoices.filter(inv => 
      inv.status !== 'paid' && inv.status !== 'cancelled'
    );

    return {
      totalInvoiced,
      totalPaid,
      outstanding,
      unpaidInvoices
    };
  }, [invoices, payments]);

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      // Create payment record
      const payment = await base44.entities.Payment.create({
        ...paymentData,
        client_id: clientId,
        client_name: clientName
      });

      // If linked to invoice, update invoice status
      if (paymentData.invoice_id) {
        const invoice = invoices.find(inv => inv.id === paymentData.invoice_id);
        if (invoice) {
          // Calculate total payments for this invoice
          const invoicePayments = await base44.entities.Payment.filter({ 
            invoice_id: paymentData.invoice_id 
          });
          const totalPaidForInvoice = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0) + parseFloat(paymentData.amount);
          
          // Update invoice status if fully paid
          if (totalPaidForInvoice >= invoice.total) {
            await base44.entities.Invoice.update(invoice.id, { status: 'paid' });
          }
        }
      }

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientPayments', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clientInvoices', clientId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment recorded successfully');
      setShowAddPayment(false);
      setPaymentForm({
        invoice_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'check',
        reference_number: '',
        notes: ''
      });
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    }
  });

  const handleSubmitPayment = () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const selectedInvoice = invoices.find(inv => inv.id === paymentForm.invoice_id);
    
    createPaymentMutation.mutate({
      ...paymentForm,
      amount: parseFloat(paymentForm.amount),
      invoice_number: selectedInvoice?.invoice_number || ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold">${financialSummary.totalInvoiced.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">${financialSummary.totalPaid.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${financialSummary.outstanding > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
              <span className="text-2xl font-bold">${financialSummary.outstanding.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Invoices */}
      {financialSummary.unpaidInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unpaid Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {financialSummary.unpaidInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-600">
                      Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${(invoice.total || 0).toFixed(2)}</p>
                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All payments received from this customer</CardDescription>
            </div>
            <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Invoice (Optional)</Label>
                    <Select 
                      value={paymentForm.invoice_id} 
                      onValueChange={(value) => {
                        setPaymentForm({ ...paymentForm, invoice_id: value });
                        // Auto-fill amount with invoice total
                        const invoice = invoices.find(inv => inv.id === value);
                        if (invoice) {
                          setPaymentForm(prev => ({ ...prev, amount: invoice.total?.toString() || '' }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select invoice or leave blank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No specific invoice</SelectItem>
                        {financialSummary.unpaidInvoices.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.invoice_number} - ${(inv.total || 0).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Date *</Label>
                      <Input
                        type="date"
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select 
                      value={paymentForm.payment_method} 
                      onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="ach">ACH</SelectItem>
                        <SelectItem value="cpacharge">CPA Charge</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Reference Number</Label>
                    <Input
                      placeholder="Check #, Transaction ID, etc."
                      value={paymentForm.reference_number}
                      onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Additional notes..."
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddPayment(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitPayment} disabled={createPaymentMutation.isPending}>
                      {createPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No payments recorded yet</p>
          ) : (
            <div className="space-y-3">
              {payments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">${(payment.amount || 0).toFixed(2)}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-3 h-3" />
                        {new Date(payment.payment_date).toLocaleDateString()}
                        {payment.invoice_number && (
                          <span>• Invoice {payment.invoice_number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{payment.payment_method}</Badge>
                        {payment.reference_number && (
                          <span className="text-xs text-gray-500">Ref: {payment.reference_number}</span>
                        )}
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-gray-500 mt-1">{payment.notes}</p>
                      )}
                    </div>
                  </div>
                  {payment.quickbooks_payment_id && (
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      Synced to QB
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}