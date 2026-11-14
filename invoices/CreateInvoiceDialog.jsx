import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Save, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { logAudit } from '../security/AuditLogger';
import AIInvoiceAssistant from './AIInvoiceAssistant';

export default function CreateInvoiceDialog({ clients, timeEntries, onClose, invoices = [], projects = [] }) {
  const [selectedClient, setSelectedClient] = useState('');
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    tax_rate: 0,
    notes: '',
    is_recurring: false,
    recurrence_frequency: 'monthly',
  });
  const [lineItems, setLineItems] = useState([]);
  const [expenseItems, setExpenseItems] = useState([]);

  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: existingInvoices = [], isSuccess: invoicesReady } = useQuery({
    queryKey: ['allInvoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 500),
  });

  const { data: qbItems = [] } = useQuery({
    queryKey: ['quickbooksItems'],
    queryFn: () => base44.entities.QuickBooksItem.filter({ active: true }),
    initialData: [],
  });

  // Generate invoice number once existing invoices have loaded
  useEffect(() => {
    if (!invoicesReady) return;
    const yearPrefix = String(new Date().getFullYear()).slice(-2);

    let maxNumber = 0;
    existingInvoices.forEach(inv => {
      const match = inv.invoice_number?.match(/^(\d{2})-(\d{3,})$/);
      if (match && match[1] === yearPrefix) {
        const num = parseInt(match[2], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const nextNumber = String(maxNumber + 1).padStart(3, '0');
    setInvoiceData(prev => ({ ...prev, invoice_number: `${yearPrefix}-${nextNumber}` }));
  }, [invoicesReady]);

  // Get unbilled time entries for selected client
  const clientTimeEntries = timeEntries.filter(entry => {
    if (!selectedClient) return false;
    if (entry.client_id !== selectedClient) return false;
    if (entry.invoiced === true) return false;
    if (entry.billable === false) return false;
    if (!entry.hours || entry.hours <= 0) return false;
    if (!entry.submitted && !entry.hours) return false;
    return true;
  });

  console.log('Invoice Debug:', {
    selectedClient,
    totalTimeEntries: timeEntries.length,
    allClientEntries: timeEntries.filter(e => e.client_id === selectedClient).length,
    submittedClientEntries: timeEntries.filter(e => e.client_id === selectedClient && e.submitted).length,
    billableClientEntries: timeEntries.filter(e => e.client_id === selectedClient && e.billable).length,
    notInvoicedClientEntries: timeEntries.filter(e => e.client_id === selectedClient && !e.invoiced).length,
    finalFilteredEntries: clientTimeEntries.length,
    sampleEntry: clientTimeEntries[0],
    allEntriesForClient: timeEntries.filter(e => e.client_id === selectedClient)
  });

  // Group by project type and date (since manual entries don't have project_id)
  const groupedEntries = clientTimeEntries.reduce((acc, entry) => {
    const projectKey = entry.project_id || entry.project_name || 'manual';
    const key = `${projectKey}-${entry.date}`;
    if (!acc[key]) {
      acc[key] = {
        project_id: entry.project_id,
        project_name: entry.project_name,
        date: entry.date,
        entries: [],
        total_hours: 0,
        base_amount: 0,
      };
    }
    acc[key].entries.push(entry);
    acc[key].total_hours += entry.hours || 0;
    
    const staff = users.find(u => u.id === entry.staff_id);
    const staffRate = staff?.billable_rate || 150;
    acc[key].base_amount += (entry.hours || 0) * staffRate;
    
    return acc;
  }, {});

  useEffect(() => {
    const items = Object.values(groupedEntries).map(group => ({
      ...group,
      adjustment: 0,
      final_amount: group.base_amount,
    }));
    setLineItems(items);
  }, [selectedClient, timeEntries, users]);

  const updateLineAdjustment = (index, adjustment) => {
    const newItems = [...lineItems];
    newItems[index].adjustment = adjustment;
    newItems[index].final_amount = newItems[index].base_amount * (1 + adjustment / 100);
    setLineItems(newItems);
  };

  const updateLineItemQBMapping = (index, qbItemId) => {
    const newItems = [...lineItems];
    newItems[index].quickbooks_item_id = qbItemId;
    setLineItems(newItems);
  };

  const timeSubtotal = lineItems.reduce((sum, item) => sum + item.final_amount, 0);
  const expenseSubtotal = expenseItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const subtotal = timeSubtotal + expenseSubtotal;
  const merchantFee = subtotal * 0.03;
  const subtotalWithFee = subtotal + merchantFee;
  const taxAmount = subtotalWithFee * (invoiceData.tax_rate / 100);
  const total = subtotalWithFee + taxAmount;

  const createMutation = useMutation({
    mutationFn: async ({ invoiceData, entryIds }) => {
      console.log('Creating invoice with data:', invoiceData);
      
      const invoice = await base44.entities.Invoice.create(invoiceData);
      console.log('Invoice created:', invoice);
      
      // Generate Stripe invoice in the background
      try {
        await base44.functions.invoke('createStripeInvoice', { invoice_id: invoice.id });
      } catch (stripeError) {
        console.error('Stripe invoice creation failed:', stripeError);
        // Non-fatal — internal invoice is still saved
      }
      
      try {
        for (const entryId of entryIds) {
          await base44.entities.TimeEntry.update(entryId, {
            invoiced: true,
            invoice_id: invoice.id,
          });
        }
      } catch (timeEntryError) {
        console.error('Failed to update time entries:', timeEntryError);
      }
      
      return invoice;
    },
    onSuccess: (invoice) => {
      logAudit('create_invoice', 'Invoice', invoice.id, invoice.invoice_number);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['allTimeEntries'] });
      toast.success('Invoice created successfully!');
      onClose();
    },
    onError: (error) => {
      console.error('Invoice creation error:', error);
      toast.error('Failed to create invoice: ' + (error.message || 'Unknown error'));
    },
  });

  const addExpenseItem = () => {
    setExpenseItems([...expenseItems, {
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
    }]);
  };

  const updateExpenseItem = (index, field, value) => {
    const newItems = [...expenseItems];
    newItems[index][field] = value;
    setExpenseItems(newItems);
  };

  const removeExpenseItem = (index) => {
    setExpenseItems(expenseItems.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!selectedClient || (lineItems.length === 0 && expenseItems.length === 0)) {
      toast.error('Please add time entries or expenses to invoice');
      return;
    }

    // Re-fetch all invoices fresh to get the true latest number (avoid stale cache race)
    const yearPrefix = String(new Date().getFullYear()).slice(-2);
    const freshInvoices = await base44.entities.Invoice.list('-created_date', 500);
    let maxNumber = 0;
    freshInvoices.forEach(inv => {
      const match = inv.invoice_number?.match(/^(\d{2})-(\d{3,})$/);
      if (match && match[1] === yearPrefix) {
        const num = parseInt(match[2], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
    const freshInvoiceNumber = `${yearPrefix}-${String(maxNumber + 1).padStart(3, '0')}`;

    const client = clients.find(c => c.id === selectedClient);
    const allEntryIds = lineItems.flatMap(item => item.entries.map(e => e.id));
    const totalHours = lineItems.reduce((sum, item) => sum + item.total_hours, 0);

    let nextInvoiceDate = null;
    if (invoiceData.is_recurring) {
      const issueDate = new Date(invoiceData.issue_date);
      switch (invoiceData.recurrence_frequency) {
        case 'weekly': issueDate.setDate(issueDate.getDate() + 7); break;
        case 'biweekly': issueDate.setDate(issueDate.getDate() + 14); break;
        case 'monthly': issueDate.setMonth(issueDate.getMonth() + 1); break;
        case 'quarterly': issueDate.setMonth(issueDate.getMonth() + 3); break;
        case 'annually': issueDate.setFullYear(issueDate.getFullYear() + 1); break;
      }
      nextInvoiceDate = issueDate.toISOString().split('T')[0];
    }

    const invoiceToCreate = {
      invoice_number: freshInvoiceNumber,
      issue_date: invoiceData.issue_date,
      due_date: invoiceData.due_date || invoiceData.issue_date,
      tax_rate: invoiceData.tax_rate,
      notes: invoiceData.notes,
      client_id: selectedClient,
      client_name: client?.company_name || '',
      client_email: client?.email || '',
      project_id: lineItems[0]?.project_id || null,
      project_name: lineItems.length === 1 ? lineItems[0].project_name : 'Multiple Projects',
      line_items: lineItems.map(item => ({
        project_id: item.project_id || null,
        project_name: item.project_name || 'Manual Entry',
        date: item.date,
        hours: item.total_hours,
        amount: item.final_amount,
        quickbooks_item_id: item.quickbooks_item_id || null
      })),
      expense_items: expenseItems,
      time_entry_ids: allEntryIds,
      total_hours: totalHours,
      hourly_rate: 0,
      subtotal: subtotal,
      merchant_fee: merchantFee,
      tax_amount: taxAmount,
      total: total,
      status: 'draft',
      is_recurring: invoiceData.is_recurring,
      recurrence_frequency: invoiceData.is_recurring ? invoiceData.recurrence_frequency : undefined,
      next_invoice_date: nextInvoiceDate,
    };

    console.log('Creating invoice:', invoiceToCreate);
    createMutation.mutate({ 
      invoiceData: invoiceToCreate, 
      entryIds: allEntryIds 
    });
  };

  const handleApplySuggestion = (suggestion) => {
    if (suggestion.type === 'discount') {
      setExpenseItems([...expenseItems, {
        description: `${suggestion.title} - ${suggestion.description}`,
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: -Math.abs(suggestion.amount),
      }]);
      toast.success('Discount applied');
    } else if (suggestion.type === 'add-on' || suggestion.type === 'addon') {
      setExpenseItems([...expenseItems, {
        description: `${suggestion.title} - ${suggestion.description}`,
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: Math.abs(suggestion.amount),
      }]);
      toast.success('Add-on applied');
    }
  };

  const client = clients.find(c => c.id === selectedClient);

  return (
    <Card className="border-2 max-w-6xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle>Create New Invoice</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client">Client *</Label>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger id="client">
              <SelectValue placeholder="Select client to invoice" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClient && (
          <>
            <AIInvoiceAssistant
              selectedClient={client}
              lineItems={lineItems}
              onApplySuggestion={handleApplySuggestion}
              invoices={invoices}
              projects={projects}
            />

            {lineItems.length > 0 && (
              <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                <h4 className="font-semibold">Time Entries by Project & Date</h4>
              {lineItems.map((item, index) => (
                <div key={index} className="border-b pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{item.project_name}</p>
                      <p className="text-sm text-gray-600">{format(new Date(item.date), 'MMM d, yyyy')}</p>
                      <p className="text-sm text-gray-500">{item.total_hours.toFixed(2)} hours</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Base: ${item.base_amount.toFixed(2)}</p>
                      <p className="text-lg font-bold text-blue-600">${item.final_amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-xs">Adjust %:</Label>
                    <Button size="sm" variant="outline" onClick={() => updateLineAdjustment(index, item.adjustment - 5)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.adjustment}
                      onChange={(e) => updateLineAdjustment(index, parseFloat(e.target.value) || 0)}
                      className="w-20 text-center"
                    />
                    <Button size="sm" variant="outline" onClick={() => updateLineAdjustment(index, item.adjustment + 5)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      {item.adjustment > 0 ? '+' : ''}{item.adjustment}%
                    </span>
                    {qbItems.length > 0 && (
                      <>
                        <Label className="text-xs ml-4">QB Item:</Label>
                        <Select
                          value={item.quickbooks_item_id || ''}
                          onValueChange={(value) => updateLineItemQBMapping(index, value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select QB item" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>None</SelectItem>
                            {qbItems.map(qbItem => (
                              <SelectItem key={qbItem.id} value={qbItem.quickbooks_item_id}>
                                {qbItem.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>
              ))}
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Billable Items</h4>
                <Button size="sm" onClick={addExpenseItem} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Billable Item
                </Button>
              </div>
              {expenseItems.length > 0 ? (
                expenseItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input
                          type="date"
                          value={item.date}
                          onChange={(e) => updateExpenseItem(index, 'date', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Input
                          placeholder="e.g., Travel, Filing fees..."
                          value={item.description}
                          onChange={(e) => updateExpenseItem(index, 'description', e.target.value)}
                        />
                      </div>
                      {qbItems.length > 0 && (
                        <div>
                          <Label className="text-xs">QuickBooks Item (optional)</Label>
                          <Select
                            value={item.quickbooks_item_id || ''}
                            onValueChange={(value) => updateExpenseItem(index, 'quickbooks_item_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select QB item" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>None</SelectItem>
                              {qbItems.map(qbItem => (
                                <SelectItem key={qbItem.id} value={qbItem.quickbooks_item_id}>
                                  {qbItem.name} ({qbItem.type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">Amount</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.amount}
                            onChange={(e) => updateExpenseItem(index, 'amount', parseFloat(e.target.value) || 0)}
                          />
                          <Button size="icon" variant="ghost" onClick={() => removeExpenseItem(index)}>
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">No billable items added</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={invoiceData.invoice_number}
                  onChange={(e) => setInvoiceData({ ...invoiceData, invoice_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={invoiceData.issue_date}
                  onChange={(e) => setInvoiceData({ ...invoiceData, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={invoiceData.due_date}
                  onChange={(e) => setInvoiceData({ ...invoiceData, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  value={invoiceData.tax_rate}
                  onChange={(e) => setInvoiceData({ ...invoiceData, tax_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-3 bg-purple-50">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={invoiceData.is_recurring}
                  onChange={(e) => setInvoiceData({ ...invoiceData, is_recurring: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_recurring" className="font-semibold cursor-pointer">
                  Make this a recurring invoice
                </Label>
              </div>
              {invoiceData.is_recurring && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence_frequency">Frequency</Label>
                  <Select
                    value={invoiceData.recurrence_frequency}
                    onValueChange={(value) => setInvoiceData({ ...invoiceData, recurrence_frequency: value })}
                  >
                    <SelectTrigger id="recurrence_frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-purple-700">
                    Next invoice will be generated automatically on the scheduled date
                  </p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-blue-900">Invoice Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Time Line Items:</span>
                  <span className="font-medium">{lineItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Hours:</span>
                  <span className="font-medium">{lineItems.reduce((sum, item) => sum + item.total_hours, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billable Items:</span>
                  <span className="font-medium">{expenseItems.length}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span>Time Subtotal:</span>
                  <span className="font-medium">${timeSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billable Items Subtotal:</span>
                  <span className="font-medium">${expenseSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span>Total Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Merchant Processing Fee (3%):</span>
                  <span className="font-medium">${merchantFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({invoiceData.tax_rate}%):</span>
                  <span className="font-medium">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t text-base">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!selectedClient || (lineItems.length === 0 && expenseItems.length === 0) || createMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
        </Button>
      </CardFooter>
    </Card>
  );
}