import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Download, ExternalLink, Loader2, Folder, ChevronRight, Home } from 'lucide-react';
import TaxDocumentUploader from '@/components/clients/TaxDocumentUploader';
import { toast } from 'sonner';

export default function ClientDrivePortal() {
    const [selectedClient, setSelectedClient] = useState(null);
    const [uploadingTo, setUploadingTo] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    const { data: clients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: () => base44.entities.Client.list(),
    });

    const isStaff = user && (['admin', 'cpa', 'senior_staff', 'staff'].includes(user.team_category) || user.role === 'admin');

    // Filter clients based on user role
    const availableClients = isStaff 
        ? clients 
        : clients.filter(c => c.email === user?.email);

    // Filter by search term
    const filteredClients = availableClients.filter(client => {
        const searchLower = searchTerm.toLowerCase();
        const name = (client.company_name || client.name || '').toLowerCase();
        const number = (client.client_number || '').toLowerCase();
        return name.includes(searchLower) || number.includes(searchLower);
    });

    const selectedClientData = availableClients.find(c => c.id === selectedClient);

    const setupFoldersMutation = useMutation({
        mutationFn: async (client_id) => {
            const response = await base44.functions.invoke('setupClientDriveFolders', { client_id });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clients']);
            toast.success('Client folders created successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create folders');
        },
    });

    const [lastUploadedFolder, setLastUploadedFolder] = useState(null);

    const uploadMutation = useMutation({
        mutationFn: async ({ client_id, folder_type, file }) => {
            const formData = new FormData();
            formData.append('client_id', client_id);
            formData.append('folder_type', folder_type);
            formData.append('file', file);

            const response = await base44.functions.invoke('uploadToClientDrive', formData);
            return { ...response.data, folder_type };
        },
        onSuccess: (data) => {
            // Invalidate just the folder that was uploaded to so the mirror refreshes
            queryClient.invalidateQueries(['driveFiles', selectedClient, data.folder_type]);
            toast.success('File uploaded successfully');
            setUploadingTo(null);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to upload file');
        },
    });

    const handleFileUpload = (folder_type, event) => {
        const file = event.target.files[0];
        if (!file) return;

        uploadMutation.mutate({
            client_id: selectedClient,
            folder_type,
            file,
        });
    };

    if (!user) {
        return <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Client Document Portal</h1>
                <p className="text-gray-600">Manage client documents in Google Drive</p>
            </div>

            {/* Client Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Client</CardTitle>
                    <CardDescription>Choose a client to manage their documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Input
                        placeholder="Search clients by name or number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        value={selectedClient || ''}
                        onChange={(e) => setSelectedClient(e.target.value)}
                        className="w-full p-2 border rounded-md"
                    >
                        <option value="">-- Select a client --</option>
                        {filteredClients.map(client => (
                            <option key={client.id} value={client.id}>
                                {client.company_name || client.name} ({client.client_number})
                            </option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            {/* Client Folders */}
            {selectedClient && selectedClientData && (
                <>
                    {!selectedClientData.drive_folder_ids ? (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center space-y-4">
                                    <p className="text-gray-600">Google Drive folders not set up for this client yet.</p>
                                    {isStaff && (
                                        <Button
                                            onClick={() => setupFoldersMutation.mutate(selectedClient)}
                                            disabled={setupFoldersMutation.isPending}
                                        >
                                            {setupFoldersMutation.isPending ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Setting up folders...
                                                </>
                                            ) : (
                                                'Set Up Google Drive Folders'
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Tabs defaultValue="tax_upload" className="space-y-4">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="tax_upload">📎 Tax Documents</TabsTrigger>
                                <TabsTrigger value="for_accountant">For Accountant</TabsTrigger>
                                <TabsTrigger value="from_accountant">From Accountant</TabsTrigger>
                                {isStaff && <TabsTrigger value="permanent">Permanent</TabsTrigger>}
                            </TabsList>

                            <TabsContent value="tax_upload">
                                <TaxDocumentUploader
                                    clientId={selectedClient}
                                    clientName={selectedClientData?.company_name || selectedClientData?.name}
                                />
                            </TabsContent>

                            <TabsContent value="for_accountant">
                                <FolderView
                                    clientId={selectedClient}
                                    folderType="for_accountant"
                                    title="For Accountant"
                                    description="Upload documents to send to your accountant"
                                    canUpload={true}
                                    onUpload={(e) => handleFileUpload('for_accountant', e)}
                                    uploading={uploadMutation.isPending}
                                />
                            </TabsContent>

                            <TabsContent value="from_accountant">
                                <FolderView
                                    clientId={selectedClient}
                                    folderType="from_accountant"
                                    title="From Accountant"
                                    description="Documents shared by your accountant (view only)"
                                    canUpload={isStaff}
                                    onUpload={(e) => handleFileUpload('from_accountant', e)}
                                    uploading={uploadMutation.isPending}
                                />
                            </TabsContent>

                            {isStaff && (
                                <TabsContent value="permanent">
                                    <FolderView
                                        clientId={selectedClient}
                                        folderType="permanent"
                                        title="Permanent Records"
                                        description="Internal documents (staff only)"
                                        canUpload={true}
                                        onUpload={(e) => handleFileUpload('permanent', e)}
                                        uploading={uploadMutation.isPending}
                                    />
                                </TabsContent>
                            )}
                        </Tabs>
                    )}
                </>
            )}
        </div>
    );
}

function FolderView({ clientId, folderType, title, description, canUpload, onUpload, uploading }) {
    // breadcrumb stack: [{id, name}]
    const [navStack, setNavStack] = useState([]);

    const currentFolderId = navStack.length > 0 ? navStack[navStack.length - 1].id : null;

    const { data: filesData, isLoading } = useQuery({
        queryKey: ['driveFiles', clientId, folderType, currentFolderId],
        queryFn: async () => {
            const response = await base44.functions.invoke('listClientDriveFiles', {
                client_id: clientId,
                folder_type: folderType,
                ...(currentFolderId ? { folder_id: currentFolderId } : {}),
            });
            return response.data;
        },
        enabled: !!clientId,
    });

    const items = filesData?.files || [];
    const folders = items.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    const files = items.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

    const navigateInto = (folder) => {
        setNavStack(prev => [...prev, { id: folder.id, name: folder.name }]);
    };

    const navigateTo = (index) => {
        setNavStack(prev => prev.slice(0, index));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Breadcrumb */}
                {navStack.length > 0 && (
                    <div className="flex items-center gap-1 text-sm flex-wrap">
                        <button
                            onClick={() => navigateTo(0)}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                            <Home className="w-3.5 h-3.5" /> Root
                        </button>
                        {navStack.map((crumb, i) => (
                            <span key={crumb.id} className="flex items-center gap-1">
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                {i === navStack.length - 1 ? (
                                    <span className="font-medium text-gray-700">{crumb.name}</span>
                                ) : (
                                    <button
                                        onClick={() => navigateTo(i + 1)}
                                        className="text-blue-600 hover:underline"
                                    >
                                        {crumb.name}
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                )}

                {canUpload && (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <Input
                            type="file"
                            onChange={onUpload}
                            disabled={uploading}
                            className="hidden"
                            id={`upload-${folderType}`}
                        />
                        <Label htmlFor={`upload-${folderType}`} className="cursor-pointer">
                            <div className="flex flex-col items-center gap-2">
                                {uploading ? (
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                ) : (
                                    <Upload className="w-8 h-8 text-blue-600" />
                                )}
                                <p className="font-medium">Click to upload file</p>
                                <p className="text-sm text-gray-500">or drag and drop</p>
                            </div>
                        </Label>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No files in this folder</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Folders first */}
                        {folders.map((folder) => (
                            <div
                                key={folder.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 cursor-pointer"
                                onClick={() => navigateInto(folder)}
                            >
                                <div className="flex items-center gap-3">
                                    <Folder className="w-5 h-5 text-blue-500" />
                                    <p className="font-medium">{folder.name}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                        ))}
                        {/* Then files */}
                        {files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="font-medium">{file.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(file.modifiedTime).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(file.webViewLink, '_blank')}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}