import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, Upload, RefreshCw, Search, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerSyncManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch company settings
  const { data: settings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const list = await base44.entities.CompanySettings.list();
      return list[0];
    }
  });

  // Fetch all clients
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  // Sync customers FROM QuickBooks
  const syncFromQBMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('syncCustomersFromQuickBooks', {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Synced ${data.total} customers: ${data.created} created, ${data.updated} updated`);
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  // Sync individual client TO QuickBooks
  const syncToQBMutation = useMutation({
    mutationFn: async (clientId) => {
      const response = await base44.functions.invoke('syncClientToQuickBooks', { client_id: clientId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Customer synced to QuickBooks');
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  if (!settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!settings.quickbooks_connected) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">QuickBooks not connected</p>
        </CardContent>
      </Card>
    );
  }

  const syncedClients = clients.filter(c => c.quickbooks_customer_id);
  const unsyncedClients = clients.filter(c => !c.quickbooks_customer_id);

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (client.company_name?.toLowerCase().includes(searchLower)) ||
      (client.name?.toLowerCase().includes(searchLower)) ||
      (client.last_name?.toLowerCase().includes(searchLower)) ||
      (client.email?.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold">{clients.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Synced with QuickBooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">{syncedClients.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Not Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="text-2xl font-bold">{unsyncedClients.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Synchronization</CardTitle>
          <CardDescription>Sync customers between your app and QuickBooks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => syncFromQBMutation.mutate()}
              disabled={syncFromQBMutation.isPending}
              className="gap-2"
            >
              {syncFromQBMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Import from QuickBooks
            </Button>

            <Button
              onClick={async () => {
                if (unsyncedClients.length === 0) {
                  toast.info('All customers are already synced');
                  return;
                }
                const confirmed = confirm(`Sync ${unsyncedClients.length} customers to QuickBooks?`);
                if (confirmed) {
                  for (const client of unsyncedClients) {
                    await syncToQBMutation.mutateAsync(client.id);
                  }
                }
              }}
              disabled={syncToQBMutation.isPending || unsyncedClients.length === 0}
              variant="outline"
              className="gap-2"
            >
              {syncToQBMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Export All to QuickBooks
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading customers...</p>
          ) : filteredClients.length === 0 ? (
            <p className="text-sm text-gray-500">No customers found</p>
          ) : (
            <div className="space-y-2">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {client.company_name || `${client.name} ${client.last_name}`}
                      </p>
                      {client.quickbooks_customer_id ? (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Synced
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Not Synced
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      {client.email && <span>{client.email}</span>}
                      {client.phone && <span>{client.phone}</span>}
                      {client.quickbooks_customer_id && (
                        <span className="text-xs text-gray-400">
                          QB ID: {client.quickbooks_customer_id}
                        </span>
                      )}
                    </div>
                  </div>
                  {!client.quickbooks_customer_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncToQBMutation.mutate(client.id)}
                      disabled={syncToQBMutation.isPending}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Sync to QB
                    </Button>
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