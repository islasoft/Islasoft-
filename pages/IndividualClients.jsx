import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, User, Mail, Phone, MapPin, FileText, Upload, Trash2, ListChecks, FileInput, CheckCircle, XCircle, Building2, MessageSquare, Edit } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import PageHeader from '../components/mobile/PageHeader';
import SimpleIndividualForm from '../components/clients/SimpleIndividualForm';
import EngagementLetterDialog from '../components/clients/EngagementLetterDialog';
import BulkImportDialog from '../components/clients/BulkImportDialog';
import OnboardingChecklistGenerator from '../components/clients/OnboardingChecklistGenerator';
import DataCollectionFormGenerator from '../components/clients/DataCollectionFormGenerator';
import SendEmailDialog from '../components/clients/SendEmailDialog';
import ClientCommunicationHistory from '../components/clients/ClientCommunicationHistory';
import ContractManagement from '../components/clients/ContractManagement';
import OnboardingWorkflowManager from '../components/clients/OnboardingWorkflowManager';
import ClientPortalManager from '../components/clients/ClientPortalManager';

import SendWhatsAppIntakeDialog from '../components/clients/SendWhatsAppIntakeDialog';
import QuickIntakeLinkDialog from '../components/clients/QuickIntakeLinkDialog';
import SendIntakeLinkDialog from '../components/clients/SendIntakeLinkDialog';
import PendingClientReview from '../components/clients/PendingClientReview';
import ProspectiveClientReview from '../components/clients/ProspectiveClientReview';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { logAudit } from '../components/security/AuditLogger';

export default function IndividualClients() {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [engagementLetterClient, setEngagementLetterClient] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [checklistClient, setChecklistClient] = useState(null);
  const [dataFormClient, setDataFormClient] = useState(null);
  const [selectedClients, setSelectedClients] = useState([]);
  const [emailClient, setEmailClient] = useState(null);
  const [commHistoryClient, setCommHistoryClient] = useState(null);
  const [detailsClient, setDetailsClient] = useState(null);
  const [whatsappIntakeClient, setWhatsappIntakeClient] = useState(null);
  const [showQuickIntake, setShowQuickIntake] = useState(false);
  const [showIntakeLink, setShowIntakeLink] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = currentUser?.role === 'admin' || currentUser?.team_category === 'cpa' || currentUser?.team_category === 'senior_staff';

  const { data: allClients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('client_number'),
    enabled: !!currentUser,
  });

  // Filter for individual/personal clients (no incorporated_as value or specific individual types)
  const clients = allClients.filter(client => 
    !client.incorporated_as || client.incorporated_as === 'Sole Proprietorship'
  );

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onMutate: async (newClient) => {
      await queryClient.cancelQueries({ queryKey: ['clients'] });
      const previousClients = queryClient.getQueryData(['clients']);
      
      queryClient.setQueryData(['clients'], (old = []) => [
        { ...newClient, id: 'temp-' + Date.now(), status: 'active' },
        ...old
      ]);
      
      return { previousClients };
    },
    onError: (error, newClient, context) => {
      queryClient.setQueryData(['clients'], context.previousClients);
      console.error('Create error:', error);
      toast.error('Failed to create client: ' + (error.message || 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingClient(null);
      toast.success('Client created successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['clients'] });
      const previousClients = queryClient.getQueryData(['clients']);
      
      queryClient.setQueryData(['clients'], (old = []) =>
        old.map((client) => (client.id === id ? { ...client, ...data } : client))
      );
      
      return { previousClients };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['clients'], context.previousClients);
      console.error('Update error:', error);
      toast.error('Failed to update client: ' + (error.message || 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingClient(null);
      toast.success('Client updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (clientIds) => {
      for (const id of clientIds) {
        const client = clients.find(c => c.id === id);
        if (client) {
          logAudit('delete_client', 'Client', id, client.company_name);
        }
        await base44.entities.Client.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedClients([]);
      toast.success('Clients deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete clients');
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ clientIds, status }) => {
      for (const id of clientIds) {
        await base44.entities.Client.update(id, { status });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedClients([]);
      toast.success('Status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const convertToEntityMutation = useMutation({
    mutationFn: async (clientIds) => {
      for (const id of clientIds) {
        await base44.entities.Client.update(id, { incorporated_as: 'LLC' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedClients([]);
      toast.success('Converted to entity clients (LLC)');
    },
    onError: () => {
      toast.error('Failed to convert clients');
    },
  });

  const handleSubmit = (data) => {
    if (editingClient) {
      logAudit('edit_client', 'Client', editingClient.id, data.company_name);
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleBulkDelete = () => {
    if (selectedClients.length === 0) {
      toast.error('No clients selected');
      return;
    }
    if (window.confirm(`Delete ${selectedClients.length} selected client(s)?`)) {
      deleteMutation.mutate(selectedClients);
    }
  };

  const handleBulkStatusChange = (status) => {
    if (selectedClients.length === 0) {
      toast.error('No clients selected');
      return;
    }
    bulkUpdateStatusMutation.mutate({ clientIds: selectedClients, status });
  };

  const handleConvertToEntity = () => {
    if (selectedClients.length === 0) {
      toast.error('No clients selected');
      return;
    }
    if (window.confirm(`Convert ${selectedClients.length} client(s) to Entity type (LLC)?`)) {
      convertToEntityMutation.mutate(selectedClients);
    }
  };

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(c => c.id));
    }
  };

  const handleApproveClient = async (clientId) => {
    try {
      await base44.entities.Client.update(clientId, { status: 'active' });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client approved successfully');
    } catch (error) {
      toast.error('Failed to approve client');
    }
  };

  const handleDeletePendingClient = async (clientId) => {
    if (window.confirm('Delete this pending client registration?')) {
      try {
        await base44.entities.Client.delete(clientId);
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        toast.success('Pending client deleted');
      } catch (error) {
        toast.error('Failed to delete client');
      }
    }
  };

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.ssn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingClients = filteredClients.filter(c => c.status === 'pending');
  const activeClients = filteredClients.filter(c => c.status !== 'pending');

  if (currentUser && !isManager) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600">Client management is only accessible to Managers and Admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Individuals" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 hidden md:block">Individual Clients</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base hidden md:block">Manage individual and personal clients</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedClients.length > 0 && (
            <>
              <Button
                onClick={() => handleBulkStatusChange('active')}
                variant="outline"
                className="text-green-600 hover:text-green-700 hover:border-green-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Set Active ({selectedClients.length})
              </Button>
              <Button
                onClick={() => handleBulkStatusChange('inactive')}
                variant="outline"
                className="text-gray-600 hover:text-gray-700 hover:border-gray-600"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Set Inactive ({selectedClients.length})
              </Button>
              <Button
                onClick={handleConvertToEntity}
                variant="outline"
                className="text-blue-600 hover:text-blue-700 hover:border-blue-600"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Convert to Entity
              </Button>
              <Button
                onClick={handleBulkDelete}
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:border-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedClients.length})
              </Button>
            </>
          )}
          <Button
            onClick={() => setShowIntakeLink(true)}
            variant="outline"
            className="text-sky-600 hover:text-sky-700 hover:border-sky-500 gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Send Intake Link
          </Button>
          <Button
            onClick={() => setShowImport(true)}
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            onClick={() => {
              setEditingClient(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Individual Client
          </Button>
        </div>
      </div>

      {showForm && (
        <SimpleIndividualForm
          client={editingClient}
          teamMembers={teamMembers}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingClient(null);
          }}
        />
      )}

      {engagementLetterClient && (
        <EngagementLetterDialog
          client={engagementLetterClient}
          onClose={() => setEngagementLetterClient(null)}
        />
      )}

      {showImport && (
        <BulkImportDialog
          onClose={() => setShowImport(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
          defaultClientType="personal"
        />
      )}

      {checklistClient && (
        <OnboardingChecklistGenerator
          client={checklistClient}
          onClose={() => setChecklistClient(null)}
        />
      )}

      {dataFormClient && (
        <DataCollectionFormGenerator
          client={dataFormClient}
          onClose={() => setDataFormClient(null)}
        />
      )}

      {emailClient && (
        <SendEmailDialog
          client={emailClient}
          onClose={() => setEmailClient(null)}
        />
      )}

      <QuickIntakeLinkDialog
        open={showQuickIntake}
        onOpenChange={setShowQuickIntake}
      />

      <SendIntakeLinkDialog
        open={showIntakeLink}
        onOpenChange={setShowIntakeLink}
      />

      {whatsappIntakeClient && (
        <SendWhatsAppIntakeDialog
          open={!!whatsappIntakeClient}
          onOpenChange={() => setWhatsappIntakeClient(null)}
          client={whatsappIntakeClient}
        />
      )}

      {commHistoryClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Communication History - {commHistoryClient.company_name}</h2>
              <Button variant="ghost" size="icon" onClick={() => setCommHistoryClient(null)}>
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              <ClientCommunicationHistory clientId={commHistoryClient.id} />
            </div>
          </div>
        </div>
      )}

      {detailsClient && (
        <Dialog open={!!detailsClient} onOpenChange={() => setDetailsClient(null)}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Client Management - {detailsClient.name} {detailsClient.last_name}
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="contracts">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
                <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                <TabsTrigger value="portal">Client Portal</TabsTrigger>
              </TabsList>
              <TabsContent value="contracts" className="mt-4">
                <ContractManagement
                  clientId={detailsClient.id}
                  clientName={detailsClient.company_name || `${detailsClient.name} ${detailsClient.last_name}`}
                />
              </TabsContent>
              <TabsContent value="onboarding" className="mt-4">
                <OnboardingWorkflowManager
                  clientId={detailsClient.id}
                  clientName={detailsClient.company_name || `${detailsClient.name} ${detailsClient.last_name}`}
                />
              </TabsContent>
              <TabsContent value="portal" className="mt-4">
                <ClientPortalManager
                  clientId={detailsClient.id}
                  clientName={detailsClient.company_name || `${detailsClient.name} ${detailsClient.last_name}`}
                  clientEmail={detailsClient.email}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Search and Select All */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search individual clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {filteredClients.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedClients.length === filteredClients.length}
              onCheckedChange={toggleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-sm text-gray-600 cursor-pointer">
              Select All
            </label>
          </div>
        )}
      </div>

      {/* Prospective clients from intake form */}
      <ProspectiveClientReview />

      {/* Pending Approvals */}
      <PendingClientReview />

      {/* Clients Table - Desktop */}
      {isLoading ? (
        <div className="text-center py-12">Loading clients...</div>
      ) : activeClients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No individual clients found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-4">
            {activeClients.map((client) => (
              <Card key={client.id} className={selectedClients.includes(client.id) ? 'ring-2 ring-blue-500' : ''}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => toggleClientSelection(client.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{client.name} {client.last_name}</CardTitle>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{client.client_number}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="select-text">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="select-text">{client.phone}</span>
                    </div>
                  )}
                  {client.ssn && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">SSN:</span> <span className="select-text">{client.ssn}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingClient(client);
                        setShowForm(true);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWhatsappIntakeClient(client)}
                    >
                      <MessageSquare className="w-3 h-3 mr-1 text-green-600" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailsClient(client)}
                    >
                      More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm table-auto">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left sticky left-0 bg-gray-50 z-10">
                  <Checkbox
                    checked={selectedClients.length === filteredClients.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="p-3 text-left font-medium text-xs sticky left-12 bg-gray-50 z-10 whitespace-nowrap">Client #</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Status</th>
                <th className="p-3 text-left font-medium text-xs sticky left-36 bg-gray-50 z-10 whitespace-nowrap">Name</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Middle</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Last Name</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">DOB</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">SSN</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Filing Status</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Dependents</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Phone</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Email</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Address</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">City</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">State</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">ZIP</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">DL ID</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">DL Issued</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">DL Expire</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Bank Name</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Bank Account</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Bank Routing</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap">Account Type</th>
                <th className="p-3 text-left font-medium text-xs whitespace-nowrap sticky right-0 bg-gray-50 z-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeClients.map((client) => (
                <tr 
                  key={client.id}
                  className={`hover:bg-gray-50 ${selectedClients.includes(client.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="p-3 sticky left-0 bg-white z-10">
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => toggleClientSelection(client.id)}
                    />
                  </td>
                  <td className="p-3 text-sm font-mono sticky left-12 bg-white z-10 whitespace-nowrap">{client.client_number}</td>
                  <td className="p-3 whitespace-nowrap">
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {client.status}
                    </Badge>
                  </td>
                  <td 
                    className="p-3 cursor-pointer font-medium text-blue-600 hover:underline text-sm sticky left-36 bg-white z-10 whitespace-nowrap"
                    onClick={() => {
                      logAudit('view_client', 'Client', client.id, client.company_name);
                      setDetailsClient(client);
                    }}
                  >
                    {client.name}
                  </td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.middle_name}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.last_name}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.dob}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.ssn}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.filing_status}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.dependents}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.phone}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.email}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.address}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.city}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.state}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.zip_code}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.dl_id}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.dl_issued}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.dl_expire}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.bank_name}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.bank_account}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.bank_routing}</td>
                  <td className="p-3 text-sm whitespace-nowrap">{client.account_type}</td>
                  <td className="p-3 sticky right-0 bg-white z-10">
                    <div className="flex gap-1">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClient(client);
                          setShowForm(true);
                        }}
                        variant="ghost"
                        size="sm"
                        title="Edit Client"
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="w-3 h-3 text-orange-600" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWhatsappIntakeClient(client);
                        }}
                        variant="ghost"
                        size="sm"
                        title="Send WhatsApp Intake"
                        className="h-7 w-7 p-0"
                      >
                        <MessageSquare className="w-3 h-3 text-green-600" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmailClient(client);
                        }}
                        variant="ghost"
                        size="sm"
                        title="Send Email"
                        className="h-7 w-7 p-0"
                      >
                        <Mail className="w-3 h-3 text-blue-600" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCommHistoryClient(client);
                        }}
                        variant="ghost"
                        size="sm"
                        title="Communication History"
                        className="h-7 w-7 p-0"
                      >
                        <MessageSquare className="w-3 h-3 text-purple-600" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEngagementLetterClient(client);
                        }}
                        variant="ghost"
                        size="sm"
                        title="Engagement Letter"
                        className="h-7 w-7 p-0"
                      >
                        <FileText className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChecklistClient(client);
                        }}
                        variant="ghost"
                        size="sm"
                        title="Onboarding Checklist"
                        className="h-7 w-7 p-0"
                      >
                        <ListChecks className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDataFormClient(client);
                        }}
                        variant="ghost"
                        size="sm"
                        title="Data Collection Form"
                        className="h-7 w-7 p-0"
                      >
                        <FileInput className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}