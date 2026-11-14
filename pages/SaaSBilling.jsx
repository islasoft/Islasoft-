import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SaaSBilling() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    billing_period_start: new Date().toISOString().split('T')[0],
    billing_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    status: 'draft'
  });

  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.SaaSInvoice.list('-created_date')
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.SaaSCustomer.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const customer = customers.find(c => c.id === data.customer_id);
      const userCount = customer?.user_count || 0;
      const pricePerUser = customer?.price_per_user || 0;
      const subtotal = userCount * pricePerUser;
      const taxRate = 0;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      const invoiceNumber = `INV-${Date.now()}`;

      return base44.entities.SaaSInvoice.create({
        ...data,
        invoice_number: invoiceNumber,
        customer_name: customer?.company_name,
        customer_email: customer?.email,
        user_count: userCount,
        price_per_user: pricePerUser,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      setOpen(false);
      resetForm();
      toast.success('Invoice created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SaaSInvoice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      toast.success('Invoice updated');
    }
  });

  const resetForm = () => {
    setFormData({
      customer_id: '',
      billing_period_start: new Date().toISOString().split('T')[0],
      billing_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
      status: 'draft'
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleStatusChange = (invoiceId, status) => {
    const updateData = { status };
    if (status === 'paid') {
      updateData.paid_date = new Date().toISOString();
    }
    updateMutation.mutate({ id: invoiceId, data: updateData });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);

  const pendingRevenue = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + (i.total || 0), 0);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-gray-600 mt-1">Manage customer billing and payments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Customer *</Label>
                <Select 
                  value={formData.customer_id} 
                  onValueChange={(value) => setFormData({...formData, customer_id: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.filter(c => c.status === 'active').map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name} ({customer.user_count} users @ ${customer.price_per_user}/user)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Billing Period Start</Label>
                  <Input
                    type="date"
                    value={formData.billing_period_start}
                    onChange={(e) => setFormData({...formData, billing_period_start: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Billing Period End</Label>
                  <Input
                    type="date"
                    value={formData.billing_period_end}
                    onChange={(e) => setFormData({...formData, billing_period_end: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Issue Date</Label>
                  <Input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Create Invoice</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${pendingRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{invoices.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map(invoice => (
              <div key={invoice.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm font-medium">#{invoice.invoice_number}</span>
                    <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                  </div>
                  <p className="text-sm font-medium">{invoice.customer_name}</p>
                  <p className="text-xs text-gray-600">
                    {format(new Date(invoice.billing_period_start), 'MMM d')} - {format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {invoice.user_count} users × ${invoice.price_per_user}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    ${invoice.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">Due: {format(new Date(invoice.due_date), 'MMM d')}</p>
                  {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => handleStatusChange(invoice.id, 'paid')}
                    >
                      Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}