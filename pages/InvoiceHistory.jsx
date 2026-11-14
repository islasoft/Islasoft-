import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpDown, FileText, CheckCircle2, Clock, XCircle, DollarSign } from 'lucide-react';

export default function InvoiceHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_date');
  const [sortDirection, setSortDirection] = useState('desc');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list()
  });

  const syncedInvoices = useMemo(() => {
    return invoices.filter(inv => inv.quickbooks_invoice_id);
  }, [invoices]);

  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = syncedInvoices;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(inv => 
        inv.invoice_number?.toLowerCase().includes(search) ||
        inv.client_name?.toLowerCase().includes(search) ||
        inv.client_email?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    // Sorting
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle date fields
      if (sortField === 'issue_date' || sortField === 'due_date' || sortField === 'created_date') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }

      // Handle numeric fields
      if (sortField === 'total') {
        aVal = parseFloat(aVal || 0);
        bVal = parseFloat(bVal || 0);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [syncedInvoices, searchTerm, statusFilter, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: { color: 'bg-gray-100 text-gray-700', icon: FileText },
      sent: { color: 'bg-blue-100 text-blue-700', icon: Clock },
      paid: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      overdue: { color: 'bg-red-100 text-red-700', icon: XCircle },
      cancelled: { color: 'bg-gray-100 text-gray-700', icon: XCircle }
    };

    const variant = variants[status] || variants.draft;
    const Icon = variant.icon;

    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const totalAmount = useMemo(() => {
    return filteredAndSortedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  }, [filteredAndSortedInvoices]);

  const paidAmount = useMemo(() => {
    return filteredAndSortedInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
  }, [filteredAndSortedInvoices]);

  if (isLoading) {
    return <div className="text-center py-8">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Invoice History</h1>
        <p className="text-gray-600 mt-1">View all invoices synced with QuickBooks</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Synced Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold">{syncedInvoices.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">${totalAmount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Paid Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">${paidAmount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by invoice number, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || statusFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices ({filteredAndSortedInvoices.length})</CardTitle>
          <CardDescription>
            Showing {filteredAndSortedInvoices.length} of {syncedInvoices.length} synced invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAndSortedInvoices.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {syncedInvoices.length === 0 
                ? 'No synced invoices found' 
                : 'No invoices match your filters'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('invoice_number')}
                        className="font-semibold"
                      >
                        Invoice Number
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('client_name')}
                        className="font-semibold"
                      >
                        Customer
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('issue_date')}
                        className="font-semibold"
                      >
                        Date
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('total')}
                        className="font-semibold"
                      >
                        Amount
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('status')}
                        className="font-semibold"
                      >
                        Status
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <span className="font-semibold text-sm">QB ID</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{invoice.invoice_number}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{invoice.client_name}</p>
                          {invoice.client_email && (
                            <p className="text-xs text-gray-500">{invoice.client_email}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {invoice.issue_date 
                          ? new Date(invoice.issue_date).toLocaleDateString() 
                          : '-'}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        ${(invoice.total || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-500">
                          {invoice.quickbooks_invoice_id}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}