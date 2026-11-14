import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Building2, Mail, Phone, MapPin, FileText, Upload, Trash2, ListChecks, FileInput, CheckCircle, XCircle, User, KeyRound, CreditCard, Link, MessageSquare, FileSignature } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OnboardingLinkSection from '../components/clients/OnboardingLinkSection';

const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  array.forEach(b => { token += chars[b % chars.length]; });
  return token;
};
import { Checkbox } from '@/components/ui/checkbox';
import PageHeader from '../components/mobile/PageHeader';
import ClientForm from '../components/clients/ClientForm';
import NewClientWizard from '../components/clients/NewClientWizard';
import EngagementLetterDialog from '../components/clients/EngagementLetterDialog';
import BulkImportDialog from '../components/clients/BulkImportDialog';
import OnboardingChecklistGenerator from '../components/clients/OnboardingChecklistGenerator';
import DataCollectionFormGenerator from '../components/clients/DataCollectionFormGenerator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { logAudit } from '../components/security/AuditLogger';
import StripePaymentLinkDialog from '../components/clients/StripePaymentLinkDialog';
import SendWhatsAppIntakeDialog from '../components/clients/SendWhatsAppIntakeDialog';
import QuickIntakeLinkDialog from '../components/clients/QuickIntakeLinkDialog';
import SendIntakeLinkDialog from '../components/clients/SendIntakeLinkDialog';
import TaxAuthorizationDialog from '../components/clients/TaxAuthorizationDialog';
import SignatureStatusBadge from '../components/clients/SignatureStatusBadge';
import PendingClientReview from '../components/clients/PendingClientReview';
import ProspectiveClientReview from '../components/clients/ProspectiveClientReview';
import AnnualReportManager from '../components/clients/AnnualReportManager';

export default function Clients() {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [engagementLetterClient, setEngagementLetterClient] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [checklistClient, setChecklistClient] = useState(null);
  const [dataFormClient, setDataFormClient] = useState(null);
  const [selectedClients, setSelectedClients] = useState([]);
  const [backfillingTokens, setBackfillingTokens] = useState(false);
  const [stripePaymentClient, setStripePaymentClient] = useState(null);
  const [onboardingLinkClient, setOnboardingLinkClient] = useState(null);
  const [whatsappIntakeClient, setWhatsappIntakeClient] = useState(null);
  const [showQuickIntake, setShowQuickIntake] = useState(false);
  const [showIntakeLink, setShowIntakeLink] = useState(false);
  const [taxAuthClient, setTaxAuthClient] = useState(null);
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' | 'annual-reports'

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'admin' || currentUser?.team_category === 'cpa' || currentUser?.team_category === 'senior_staff';

  const { data: allClients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('client_number'),
    enabled: !!currentUser,
  });

  // Filter for entity clients only (has incorporated_as and not Sole Proprietorship)
  // Admins and CPAs see ALL entity clients regardless of manager_id
  // For other roles, the RLS on the backend already restricts what's returned
  const clients = allClients.filter(client => 
    client.incorporated_as && client.incorporated_as !== 'Sole Proprietorship'
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
      console.error('Create client error:', error);
      toast.error(`Failed to create client: ${error.message || 'Unknown error'}`);
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
      console.error('Update client error:', error);
      toast.error(`Failed to update client: ${error.message || 'Unknown error'}`);
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

  const convertToIndividualMutation = useMutation({
    mutationFn: async (clientIds) => {
      for (const id of clientIds) {
        await base44.entities.Client.update(id, { incorporated_as: '' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedClients([]);
      toast.success('Converted to individual clients');
    },
    onError: () => {
      toast.error('Failed to convert clients');
    },
  });

  // Clients missing a registration token
  const missingTokenClients = allClients.filter(c => !c.registration_token);



  const handleBackfillTokens = async () => {
    if (missingTokenClients.length === 0) return;
    setBackfillingTokens(true);
    try {
      for (const c of missingTokenClients) {
        await base44.entities.Client.update(c.id, { registration_token: generateToken() });
      }
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Tokens generated for ${missingTokenClients.length} client(s)`);
    } catch {
      toast.error('Failed to generate some tokens');
    } finally {
      setBackfillingTokens(false);
    }
  };

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

  const handleConvertToIndividual = () => {
    if (selectedClients.length === 0) {
      toast.error('No clients selected');
      return;
    }
    if (window.confirm(`Convert ${selectedClients.length} client(s) to Individual type?`)) {
      convertToIndividualMutation.mutate(selectedClients);
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

  const filteredClients = clients.filter(client =>
    client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingClients = filteredClients.filter(c => c.status === 'pending');
  const activeEntityClients = filteredClients.filter(c => c.status !== 'pending');

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
      <PageHeader title="Clients" />

      {/* ── Tab Navigation ── */}
      <div className="flex border-b border-gray-200 -mb-2">
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'clients'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Entity Clients
        </button>
        <button
          onClick={() => setActiveTab('annual-reports')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'annual-reports'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          📋 Annual Reports
        </button>
      </div>

      {/* ── Annual Reports Tab ── */}
      {activeTab === 'annual-reports' && (
        <AnnualReportManager currentUser={currentUser} />
      )}

      {/* ── Entity Clients Tab ── */}
      {activeTab !== 'annual-reports' && (
        <>

      {/* Admin banner: backfill missing tokens */}
      {isAdmin && !isLoading && missingTokenClients.length > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-900">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 flex-shrink-0" />
            <span><strong>{missingTokenClients.length} client(s)</strong> are missing onboarding tokens. Click to generate tokens for all.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 text-amber-800 hover:bg-amber-100 ml-4 flex-shrink-0"
            disabled={backfillingTokens}
            onClick={handleBackfillTokens}
          >
            {backfillingTokens ? 'Generating...' : 'Generate All Tokens'}
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 hidden md:block">Entity Clients</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base hidden md:block">Manage business and entity clients</p>
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
                onClick={handleConvertToIndividual}
                variant="outline"
                className="text-purple-600 hover:text-purple-700 hover:border-purple-600"
              >
                <User className="w-4 h-4 mr-2" />
                Convert to Individual
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
            Add Entity Client
          </Button>
        </div>
      </div>

      {showForm && editingClient && (
        <ClientForm
          client={editingClient}
          teamMembers={teamMembers}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingClient(null);
          }}
          defaultClientType="entity"
        />
      )}

      {showForm && !editingClient && (
        <NewClientWizard
          teamMembers={teamMembers}
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
          onCancel={() => setShowForm(false)}
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
          defaultClientType="entity"
        />
      )}

      {stripePaymentClient && (
        <StripePaymentLinkDialog
          client={stripePaymentClient}
          onClose={() => setStripePaymentClient(null)}
        />
      )}

      {whatsappIntakeClient && (
        <SendWhatsAppIntakeDialog
          open={!!whatsappIntakeClient}
          onOpenChange={() => setWhatsappIntakeClient(null)}
          client={whatsappIntakeClient}
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

      {taxAuthClient && (
        <TaxAuthorizationDialog
          open={!!taxAuthClient}
          onOpenChange={() => setTaxAuthClient(null)}
          client={taxAuthClient}
        />
      )}

      {onboardingLinkClient && (
        <Dialog open onOpenChange={() => setOnboardingLinkClient(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link className="w-5 h-5 text-blue-600" />
                Onboarding Link — {onboardingLinkClient.company_name}
              </DialogTitle>
            </DialogHeader>
            <OnboardingLinkSection
              client={onboardingLinkClient}
              currentUser={currentUser}
              onTokenRegenerated={(newToken) => {
                setOnboardingLinkClient(prev => ({ ...prev, registration_token: newToken }));
                queryClient.invalidateQueries({ queryKey: ['clients'] });
              }}
            />
          </DialogContent>
        </Dialog>
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

      {/* Search and Select All */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search clients..."
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

      {/* Pending Approvals (existing onboarding flow) */}
      <PendingClientReview />

      {/* Clients Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading clients...</div>
      ) : activeEntityClients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No clients found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeEntityClients.map((client) => (
            <Card
              key={client.id}
              className={`hover:shadow-lg transition-shadow ${
                selectedClients.includes(client.id) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 pt-1">
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => toggleClientSelection(client.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => {
                      logAudit('view_client', 'Client', client.id, client.company_name);
                      setEditingClient(client);
                      setShowForm(true);
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client.company_name}</CardTitle>
                      {client.contact_person && (
                        <p className="text-sm text-gray-500">{client.contact_person}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                      {client.status}
                    </Badge>
                    <SignatureStatusBadge clientId={client.id} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOnboardingLinkClient(client);
                    }}
                    variant="outline"
                    size="sm"
                    title="Send Onboarding Link via WhatsApp / Email"
                    className="text-blue-600 hover:text-blue-700 hover:border-blue-400"
                  >
                    <Link className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEngagementLetterClient(client);
                    }}
                    variant="outline"
                    size="sm"
                    title="Generate Engagement Letter"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChecklistClient(client);
                    }}
                    variant="outline"
                    size="sm"
                    title="Generate Onboarding Checklist"
                  >
                    <ListChecks className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDataFormClient(client);
                    }}
                    variant="outline"
                    size="sm"
                    title="Generate Data Collection Form"
                  >
                    <FileInput className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStripePaymentClient(client);
                    }}
                    variant="outline"
                    size="sm"
                    title="Send Stripe Payment Link"
                    className="text-indigo-600 hover:text-indigo-700 hover:border-indigo-400"
                  >
                    <CreditCard className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setWhatsappIntakeClient(client);
                    }}
                    variant="outline"
                    size="sm"
                    title="Send ISLA WhatsApp Intake Link"
                    className="text-green-600 hover:text-green-700 hover:border-green-500"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTaxAuthClient(client);
                    }}
                    variant="outline"
                    size="sm"
                    title="Send Tax Return Authorization (Form 8879)"
                    className="text-violet-600 hover:text-violet-700 hover:border-violet-400"
                  >
                    <FileSignature className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}