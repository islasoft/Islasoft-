import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, Clock, XCircle, Eye, FileSpreadsheet, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EmailTracking({ clients }) {
  const [filterClient, setFilterClient] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingSheetId, setSyncingSheetId] = useState(null);
  const queryClient = useQueryClient();

  const { data: emails = [] } = useQuery({
    queryKey: ['emailTracking'],
    queryFn: () => base44.entities.EmailTracking.list('-sent_date'),
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['allClientsForTracking'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const filteredEmails = emails.filter(email => {
    const clientMatch = filterClient === 'all' || email.client_id === filterClient;
    const typeMatch = filterType === 'all' || email.email_type === filterType;
    const searchMatch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       email.recipient_email.toLowerCase().includes(searchTerm.toLowerCase());
    return clientMatch && typeMatch && searchMatch;
  });

  const statusConfig = {
    sent: { icon: Clock, color: 'bg-blue-600', label: 'Sent' },
    delivered: { icon: CheckCircle, color: 'bg-green-600', label: 'Delivered' },
    opened: { icon: Eye, color: 'bg-purple-600', label: 'Opened' },
    failed: { icon: XCircle, color: 'bg-red-600', label: 'Failed' },
  };

  const stats = {
    total: emails.length,
    sent: emails.filter(e => e.status === 'sent').length,
    delivered: emails.filter(e => e.status === 'delivered').length,
    opened: emails.filter(e => e.status === 'opened').length,
    failed: emails.filter(e => e.status === 'failed').length,
  };

  // Extract Google Sheet intake forms from client notes
  const intakeForms = allClients
    .filter(c => c.notes && c.notes.includes('Intake form: https://docs.google.com/spreadsheets/d/'))
    .map(client => {
      const match = client.notes.match(/Intake form: (https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+))/);
      if (match) {
        return {
          clientId: client.id,
          clientName: client.company_name || client.name,
          clientEmail: client.email,
          sheetUrl: match[1],
          spreadsheetId: match[2],
          status: client.status,
          createdDate: client.created_date
        };
      }
      return null;
    })
    .filter(Boolean);

  const handleSyncSheet = async (form) => {
    setSyncingSheetId(form.spreadsheetId);
    try {
      const response = await base44.functions.invoke('syncClientIntakeFromSheet', {
        spreadsheetId: form.spreadsheetId,
        clientId: form.clientId
      });

      if (response.data.success) {
        toast.success(`✅ Client data synced! ${response.data.fieldsImported} fields imported`);
        queryClient.invalidateQueries({ queryKey: ['allClientsForTracking'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      } else {
        toast.error('Failed to sync data from sheet');
      }
    } catch (error) {
      console.error('Error syncing sheet:', error);
      toast.error('Failed to sync sheet data');
    } finally {
      setSyncingSheetId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Intake Forms Section */}
      {intakeForms.length > 0 && (
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <FileSpreadsheet className="w-5 h-5" />
              Active Client Intake Forms ({intakeForms.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700 dark:text-green-300 mb-4">
              These clients have been sent Google Sheets intake forms. Monitor their progress and sync completed data back to the app.
            </p>
            <div className="space-y-3">
              {intakeForms.map(form => (
                <Card key={form.clientId} className="bg-white dark:bg-gray-800">
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{form.clientName}</h4>
                          <Badge variant={form.status === 'active' ? 'default' : form.status === 'pending' ? 'secondary' : 'outline'}>
                            {form.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{form.clientEmail}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Form sent: {format(new Date(form.createdDate), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(form.sheetUrl, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Sheet
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSyncSheet(form)}
                          disabled={syncingSheetId === form.spreadsheetId}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {syncingSheetId === form.spreadsheetId ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <ArrowRight className="w-4 h-4 mr-2" />
                              Sync Data
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-600">Total Emails</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="w-8 h-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{stats.sent}</p>
            <p className="text-sm text-gray-600">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{stats.delivered}</p>
            <p className="text-sm text-gray-600">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Eye className="w-8 h-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{stats.opened}</p>
            <p className="text-sm text-gray-600">Opened</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
            <p className="text-2xl font-bold">{stats.failed}</p>
            <p className="text-sm text-gray-600">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Email History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by subject or recipient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger>
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="engagement_letter">Engagement Letter</SelectItem>
                <SelectItem value="document_share">Document Share</SelectItem>
                <SelectItem value="client_intake">Client Intake Form</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email List */}
          <div className="space-y-3 mt-6">
            {filteredEmails.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No emails found</p>
            ) : (
              filteredEmails.map(email => {
                const config = statusConfig[email.status];
                const StatusIcon = config.icon;
                return (
                  <Card key={email.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={config.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                            <Badge variant="outline">{email.email_type.replace(/_/g, ' ')}</Badge>
                          </div>
                          <h4 className="font-semibold mb-1">{email.subject}</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>To: {email.recipient_email}</p>
                            <p>Client: {email.client_name}</p>
                            <p>Sent by: {email.sent_by_name}</p>
                            <p>Date: {format(new Date(email.sent_date), 'MMM d, yyyy h:mm a')}</p>
                            {email.opened_date && (
                              <p className="text-purple-600">
                                Opened: {format(new Date(email.opened_date), 'MMM d, yyyy h:mm a')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}