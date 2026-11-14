import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Eye, Download, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DocumentSharing({ clients }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    document_name: '',
    document_type: 'other',
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', selectedClientId],
    queryFn: () => {
      if (!selectedClientId) return [];
      return base44.entities.SharedDocument.filter({ client_id: selectedClientId }, '-created_date');
    },
    enabled: !!selectedClientId,
  });

  const { data: portalAccess } = useQuery({
    queryKey: ['portalAccess', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      const access = await base44.entities.ClientPortalAccess.filter({ client_id: selectedClientId });
      return access[0] || null;
    },
    enabled: !!selectedClientId,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, formData }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const client = clients.find(c => c.id === selectedClientId);
      return base44.entities.SharedDocument.create({
        ...formData,
        client_id: selectedClientId,
        client_name: client?.company_name,
        file_url,
        uploaded_by_id: currentUser?.id,
        uploaded_by_name: currentUser?.full_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setUploadForm({ document_name: '', document_type: 'other', notes: '' });
      toast.success('Document uploaded successfully');
    },
  });

  const createPortalAccessMutation = useMutation({
    mutationFn: async () => {
      const client = clients.find(c => c.id === selectedClientId);
      const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      return base44.entities.ClientPortalAccess.create({
        client_id: selectedClientId,
        client_name: client?.company_name,
        client_email: client?.email,
        access_code: accessCode,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalAccess'] });
      toast.success('Portal access created');
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!uploadForm.document_name) {
      setUploadForm({ ...uploadForm, document_name: file.name });
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync({ file, formData: uploadForm });
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const portalUrl = portalAccess ? `${window.location.origin}/portal?code=${portalAccess.access_code}` : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Client & Upload */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Client</label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client" />
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

          {selectedClientId && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Document Name</label>
                <Input
                  value={uploadForm.document_name}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_name: e.target.value })}
                  placeholder="Tax Return 2024"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Document Type</label>
                <Select
                  value={uploadForm.document_type}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, document_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tax_return">Tax Return</SelectItem>
                    <SelectItem value="financial_statement">Financial Statement</SelectItem>
                    <SelectItem value="engagement_letter">Engagement Letter</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                <Textarea
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder="Add notes about this document..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Upload File</label>
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading || !uploadForm.document_name}
                />
                {uploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Client Portal Access</p>
                {portalAccess ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                      <Badge className="bg-green-600">Active</Badge>
                      <span className="text-sm">Code: {portalAccess.access_code}</span>
                    </div>
                    {portalUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          navigator.clipboard.writeText(portalUrl);
                          toast.success('Portal link copied');
                        }}
                      >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Copy Portal Link
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => createPortalAccessMutation.mutate()}
                    className="w-full"
                  >
                    Enable Portal Access
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Shared Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedClientId ? (
            <p className="text-center text-gray-500 py-8">Select a client to view documents</p>
          ) : documents.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No documents shared yet</p>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <Card key={doc.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold">{doc.document_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{doc.document_type.replace(/_/g, ' ')}</Badge>
                            {doc.viewed_by_client && (
                              <Badge className="bg-green-600">
                                <Eye className="w-3 h-3 mr-1" />
                                Viewed
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Uploaded by {doc.uploaded_by_name} on{' '}
                            {format(new Date(doc.created_date), 'MMM d, yyyy')}
                          </p>
                          {doc.notes && (
                            <p className="text-sm text-gray-600 mt-2">{doc.notes}</p>
                          )}
                          {doc.viewed_date && (
                            <p className="text-xs text-green-600 mt-1">
                              Client viewed on {format(new Date(doc.viewed_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}