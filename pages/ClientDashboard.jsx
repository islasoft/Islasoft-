import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Building2, FileText, MessageSquare, Upload, Eye, 
  AlertCircle, CheckCircle, Clock, ArrowLeft, Edit, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import DocumentAnalyzer from '@/components/clients/DocumentAnalyzer';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function ClientDashboard() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('id');
  const queryClient = useQueryClient();
  
  const [showDocAnalyzer, setShowDocAnalyzer] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch client data
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const clients = await base44.entities.Client.filter({ id: clientId });
      return clients[0] || null;
    },
    enabled: !!clientId
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', clientId],
    queryFn: () => base44.entities.SharedDocument.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', clientId],
    queryFn: () => base44.entities.Message.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', clientId],
    queryFn: () => base44.entities.Project.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  // Fetch contracts
  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', clientId],
    queryFn: () => base44.entities.Contract.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['client', clientId]);
      toast.success('Client updated');
    }
  });

  if (!clientId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No client selected</p>
      </div>
    );
  }

  if (loadingClient) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
        <p className="text-gray-600">Loading client dashboard...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600">Client not found</p>
      </div>
    );
  }

  const isEntity = client.incorporated_as && client.incorporated_as !== '';
  const clientType = isEntity ? 'entity' : 'individual';

  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending Registration' },
    active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
    inactive: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'Inactive' }
  };

  const status = statusConfig[client.status] || statusConfig.pending;

  // Calculate completeness
  const requiredFields = isEntity 
    ? ['company_name', 'email', 'phone', 'ein', 'incorporated_as']
    : ['name', 'last_name', 'email', 'phone', 'ssn', 'dob'];
  
  const filledFields = requiredFields.filter(field => client[field] && client[field] !== '');
  const completeness = Math.round((filledFields.length / requiredFields.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl(isEntity ? 'Clients' : 'IndividualClients')}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {isEntity ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
              {client.company_name || `${client.name || ''} ${client.last_name || ''}`.trim()}
            </h1>
            <p className="text-sm text-gray-500">Client ID: {client.client_number || client.id}</p>
          </div>
        </div>
        <Button onClick={() => setShowDocAnalyzer(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload & Analyze Document
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`${status.color} flex items-center gap-2 w-full justify-center py-2`}>
              <status.icon className="w-4 h-4" />
              {status.label}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Profile Completeness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completeness}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all" 
                style={{ width: `${completeness}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documents.length}</div>
            <p className="text-xs text-gray-500 mt-1">uploaded documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Communications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{messages.length}</div>
            <p className="text-xs text-gray-500 mt-1">messages exchanged</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="projects">Projects & Contracts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {isEntity ? (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Company Name</p>
                      <p className="font-medium">{client.company_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contact Person</p>
                      <p className="font-medium">{client.contact_person || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">EIN</p>
                      <p className="font-medium">{client.ein || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Incorporated As</p>
                      <p className="font-medium">{client.incorporated_as || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Taxed As</p>
                      <p className="font-medium">{client.taxed_as || 'N/A'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium">
                        {`${client.name || ''} ${client.middle_name || ''} ${client.last_name || ''}`.trim() || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">{client.dob || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">SSN</p>
                      <p className="font-medium">{client.ssn ? '***-**-' + client.ssn.slice(-4) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Filing Status</p>
                      <p className="font-medium">{client.filing_status || 'N/A'}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{client.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{client.phone || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">
                    {client.address && client.city && client.state
                      ? `${client.address}, ${client.city}, ${client.state} ${client.zip_code || ''}`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {completeness < 100 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Missing Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-yellow-700 mb-2">
                  The following required fields are missing:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {requiredFields
                    .filter(field => !client[field] || client[field] === '')
                    .map(field => (
                      <li key={field}>{field.replace(/_/g, ' ').toUpperCase()}</li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Document Library</h3>
            <Button onClick={() => setShowDocAnalyzer(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload New
            </Button>
          </div>

          {documents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No documents uploaded yet</p>
                <Button className="mt-4" onClick={() => setShowDocAnalyzer(true)}>
                  Upload First Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {documents.map(doc => (
                <Card key={doc.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{doc.document_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.document_type || 'general'}
                            </Badge>
                            {doc.viewed_by_client && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                Viewed by client
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded by {doc.uploaded_by_name} on {new Date(doc.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                    {doc.notes && (
                      <p className="text-sm text-gray-600 mt-2 pl-8">{doc.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          <h3 className="text-lg font-semibold">Communication History</h3>

          {messages.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No messages yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {messages
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                .map(msg => (
                  <Card key={msg.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{msg.sender_name || 'System'}</span>
                          {msg.is_internal && (
                            <Badge variant="outline" className="text-xs">Internal</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.created_date).toLocaleString()}
                        </span>
                      </div>
                      {msg.subject && (
                        <p className="font-medium text-sm mb-1">{msg.subject}</p>
                      )}
                      <p className="text-sm text-gray-700">{msg.content}</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Active Projects</h3>
            {projects.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-600">No projects assigned yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {projects.map(project => (
                  <Card key={project.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{project.project_type?.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Assigned to: {project.assigned_to_name}
                          </p>
                          {project.due_date && (
                            <p className="text-xs text-gray-500">
                              Due: {new Date(project.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge className={
                          project.status === 'completed' ? 'bg-green-100 text-green-800' :
                          project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {project.status?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Contracts & Agreements</h3>
            {contracts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-600">No contracts yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {contracts.map(contract => (
                  <Card key={contract.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{contract.title}</p>
                          <p className="text-sm text-gray-500">{contract.contract_type?.replace(/_/g, ' ')}</p>
                          {contract.start_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              Start: {new Date(contract.start_date).toLocaleDateString()}
                              {contract.end_date && ` - End: ${new Date(contract.end_date).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                        <Badge className={
                          contract.status === 'signed' || contract.status === 'active' ? 'bg-green-100 text-green-800' :
                          contract.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {contract.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Document Analyzer Dialog */}
      {showDocAnalyzer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <DocumentAnalyzer
            client={client}
            onClose={() => setShowDocAnalyzer(false)}
            onDataExtracted={(data) => {
              queryClient.invalidateQueries(['client', clientId]);
              queryClient.invalidateQueries(['documents', clientId]);
              toast.success('Document analyzed and data extracted');
            }}
          />
        </div>
      )}
    </div>
  );
}