import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, RefreshCw, DollarSign, Users, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function QuickBooksSyncReport() {
  const callFunction = async (functionName, payload = {}) => {
    const isPlatformDomain = window.location.hostname === 'app.base44.com';
    if (isPlatformDomain) {
      const appId = '69602ce76ba05524a04d858f';
      const subdomainUrl = `https://${appId}.base44.app/api/apps/${appId}/functions/${functionName}`;
      const response = await fetch(subdomainUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      return await response.json();
    } else {
      const { data } = await base44.functions.invoke(functionName, payload);
      return data;
    }
  };

  const { data: settings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const list = await base44.entities.CompanySettings.list();
      return list[0] || null;
    }
  });

  const { data: invoices, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list()
  });

  const { data: clients, refetch: refetchClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: qbItems } = useQuery({
    queryKey: ['quickbooksItems'],
    queryFn: () => base44.entities.QuickBooksItem.list()
  });

  const syncedInvoices = invoices?.filter(inv => inv.quickbooks_invoice_id) || [];
  const unsyncedInvoices = invoices?.filter(inv => !inv.quickbooks_invoice_id) || [];
  
  const syncedClients = clients?.filter(c => c.quickbooks_customer_id) || [];
  const unsyncedClients = clients?.filter(c => !c.quickbooks_customer_id) || [];

  const syncInvoice = async (invoiceId) => {
    try {
      toast.loading('Syncing invoice...', { id: 'sync-invoice' });
      const response = await callFunction('syncInvoiceToQuickBooks', { invoice_id: invoiceId });
      
      if (response.error && response.needs_sync && response.client_id) {
        // Client needs to be synced first
        toast.loading('Syncing client first...', { id: 'sync-invoice' });
        const clientResponse = await callFunction('syncClientToQuickBooks', { client_id: response.client_id });
        
        if (clientResponse.error) {
          toast.error('Failed to sync client: ' + clientResponse.error, { id: 'sync-invoice' });
          return;
        }
        
        // Now retry invoice sync
        toast.loading('Syncing invoice...', { id: 'sync-invoice' });
        const retryResponse = await callFunction('syncInvoiceToQuickBooks', { invoice_id: invoiceId });
        
        if (retryResponse.error) {
          toast.error(retryResponse.error, { id: 'sync-invoice' });
          return;
        }
        
        refetchInvoices();
        refetchClients();
        toast.success('Client and invoice synced successfully!', { id: 'sync-invoice' });
        return;
      }
      
      if (response.error) {
        toast.error(response.error + (response.details ? ': ' + response.details : ''), { id: 'sync-invoice' });
        return;
      }
      
      refetchInvoices();
      toast.success('Invoice synced successfully!', { id: 'sync-invoice' });
    } catch (error) {
      toast.error('Failed to sync: ' + error.message, { id: 'sync-invoice' });
    }
  };

  const syncClient = async (clientId) => {
    try {
      toast.loading('Syncing client...', { id: 'sync-client' });
      const response = await callFunction('syncClientToQuickBooks', { client_id: clientId });
      
      if (response.error) {
        toast.error(response.error + (response.details ? ': ' + response.details : ''), { id: 'sync-client' });
        return;
      }
      
      refetchClients();
      toast.success('Client synced successfully!', { id: 'sync-client' });
    } catch (error) {
      toast.error('Failed to sync: ' + error.message, { id: 'sync-client' });
    }
  };

  if (!settings?.quickbooks_connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QuickBooks Not Connected</CardTitle>
          <CardDescription>Connect to QuickBooks in Settings to view sync status</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">QuickBooks Sync Report</h2>
        <p className="text-gray-600 mt-1">Track data synchronization between your app and QuickBooks</p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            QuickBooks Connected
          </CardTitle>
          <CardDescription>
            Connected on {new Date(settings.quickbooks_connected_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-900">
                <DollarSign className="w-5 h-5" />
                <span className="font-medium">Invoices</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-2">{syncedInvoices.length}</p>
              <p className="text-sm text-blue-700">{unsyncedInvoices.length} not synced</p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-900">
                <Users className="w-5 h-5" />
                <span className="font-medium">Clients</span>
              </div>
              <p className="text-2xl font-bold text-green-900 mt-2">{syncedClients.length}</p>
              <p className="text-sm text-green-700">{unsyncedClients.length} not synced</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 text-purple-900">
                <Package className="w-5 h-5" />
                <span className="font-medium">QB Items</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 mt-2">{qbItems?.length || 0}</p>
              <p className="text-sm text-purple-700">Available for use</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unsynced Invoices */}
      {unsyncedInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Unsynced Invoices ({unsyncedInvoices.length})
            </CardTitle>
            <CardDescription>These invoices haven't been sent to QuickBooks yet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unsyncedInvoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-600">
                      {invoice.client_name} - ${invoice.total?.toFixed(2)}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => syncInvoice(invoice.id)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Sync Now
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Synced Invoices */}
      {syncedInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Synced Invoices ({syncedInvoices.length})
            </CardTitle>
            <CardDescription>Successfully synced to QuickBooks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {syncedInvoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-green-900">{invoice.invoice_number}</p>
                    <p className="text-sm text-green-700">
                      {invoice.client_name} - ${invoice.total?.toFixed(2)}
                    </p>
                    {invoice.quickbooks_synced_at && (
                      <p className="text-xs text-green-600 mt-1">
                        Synced {new Date(invoice.quickbooks_synced_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Synced
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unsynced Clients */}
      {unsyncedClients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Unsynced Clients ({unsyncedClients.length})
            </CardTitle>
            <CardDescription>These clients haven't been sent to QuickBooks yet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unsyncedClients.map(client => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{client.company_name || `${client.name} ${client.last_name}`.trim()}</p>
                    <p className="text-sm text-gray-600">{client.email}</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => syncClient(client.id)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Sync Now
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Synced Clients */}
      {syncedClients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Synced Clients ({syncedClients.length})
            </CardTitle>
            <CardDescription>Successfully synced to QuickBooks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {syncedClients.map(client => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-green-900">
                      {client.company_name || `${client.name} ${client.last_name}`.trim()}
                    </p>
                    <p className="text-sm text-green-700">{client.email}</p>
                    {client.quickbooks_synced_at && (
                      <p className="text-xs text-green-600 mt-1">
                        Synced {new Date(client.quickbooks_synced_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Synced
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}