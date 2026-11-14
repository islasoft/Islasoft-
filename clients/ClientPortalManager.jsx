import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Globe, Copy, RefreshCw, Send, Upload, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ClientPortalManager({ clientId, clientName, clientEmail }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState('tax_return');
  const [docNotes, setDocNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: portalAccess } = useQuery({
    queryKey: ['portalAccess', clientId],
    queryFn: async () => {
      const access = await base44.entities.ClientPortalAccess.filter({ client_id: clientId });
      return access[0] || null;
    },
  });

  const { data: sharedDocuments = [] } = useQuery({
    queryKey: ['sharedDocuments', clientId],
    queryFn: () => base44.entities.SharedDocument.filter({ client_id: clientId }, '-created_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['clientMessages', clientId],
    queryFn: () => base44.entities.Message.filter({ client_id: clientId }, '-created_date', 10),
  });

  const createAccessMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientPortalAccess.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalAccess'] });
      toast.success('Portal access created');
      setShowCreateDialog(false);
    },
  });

  const updateAccessMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientPortalAccess.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalAccess'] });
      toast.success('Portal access updated');
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, type, notes }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.SharedDocument.create({
        client_id: clientId,
        client_name: clientName,
        document_name: file.name,
        document_type: type,
        file_url,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedDocuments'] });
      toast.success('Document uploaded and shared');
      setShowUploadDialog(false);
    },
  });

  const handleCreateAccess = () => {
    if (!clientId) {
      toast.error('Client ID is missing');
      return;
    }
    const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    createAccessMutation.mutate({
      client_id: clientId,
      client_name: clientName || '',
      client_email: clientEmail || '',
      access_code: accessCode,
      is_active: true,
      expires_at: expiresAt.toISOString(),
    });
  };

  const handleRegenerateCode = () => {
    if (!portalAccess) return;
    const newAccessCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    updateAccessMutation.mutate({
      id: portalAccess.id,
      data: { access_code: newAccessCode },
    });
  };

  const handleToggleAccess = () => {
    if (!portalAccess) return;
    updateAccessMutation.mutate({
      id: portalAccess.id,
      data: { is_active: !portalAccess.is_active },
    });
  };

  const copyAccessLink = () => {
    const link = `${window.location.origin}/ClientPortal?code=${portalAccess.access_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Portal link copied to clipboard');
  };

  const sendAccessEmail = async () => {
    if (!portalAccess) return;
    const link = `${window.location.origin}/ClientPortal?code=${portalAccess.access_code}`;
    
    try {
      await base44.integrations.Core.SendEmail({
        to: clientEmail,
        subject: 'Your Client Portal Access - Isla Accounting Corp',
        body: `
          Dear ${clientName},

          Your secure client portal is now available. You can access your documents, messages, and account information using the link below:

          ${link}

          Your access code: ${portalAccess.access_code}

          This link will expire on ${format(new Date(portalAccess.expires_at), 'MMMM d, yyyy')}.

          If you have any questions, please don't hesitate to contact us.

          Best regards,
          Isla Accounting Corp
        `,
      });
      toast.success('Access email sent to client');
    } catch (error) {
      toast.error('Failed to send email');
    }
  };

  const handleFileUpload = (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploadingFile(true);
    uploadDocumentMutation.mutate(
      { file: selectedFile, type: docType, notes: docNotes },
      {
        onSettled: () => {
          setUploadingFile(false);
          setSelectedFile(null);
          setDocType('tax_return');
          setDocNotes('');
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Client Portal</h3>
        <Button
          onClick={() => setShowUploadDialog(true)}
          size="sm"
          variant="outline"
        >
          <Upload className="w-4 h-4 mr-2" />
          Share Document
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portal Access</CardTitle>
        </CardHeader>
        <CardContent>
          {!portalAccess ? (
            <div className="text-center py-6">
              <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 mb-4">No portal access created yet</p>
              <Button onClick={handleCreateAccess} disabled={createAccessMutation.isPending}>
                <Globe className="w-4 h-4 mr-2" />
                Create Portal Access
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Access Code</p>
                  <p className="text-2xl font-bold text-blue-600">{portalAccess.access_code}</p>
                </div>
                <Badge className={portalAccess.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {portalAccess.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">Expires</p>
                  <p className="font-medium">{format(new Date(portalAccess.expires_at), 'MMM d, yyyy')}</p>
                </div>
                {portalAccess.last_login && (
                  <div>
                    <p className="text-gray-600">Last Login</p>
                    <p className="font-medium">{format(new Date(portalAccess.last_login), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copyAccessLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button size="sm" variant="outline" onClick={sendAccessEmail}>
                  <Send className="w-4 h-4 mr-2" />
                  Email Access
                </Button>
                <Button size="sm" variant="outline" onClick={handleRegenerateCode}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate Code
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleAccess}
                  className={portalAccess.is_active ? 'text-red-600' : 'text-green-600'}
                >
                  {portalAccess.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shared Documents ({sharedDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sharedDocuments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No documents shared yet</p>
          ) : (
            <div className="space-y-2">
              {sharedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{doc.document_name}</p>
                    <p className="text-xs text-gray-600">
                      {doc.document_type} • {format(new Date(doc.created_date), 'MMM d, yyyy')}
                    </p>
                    {doc.viewed_by_client && (
                      <Badge variant="outline" className="mt-1">
                        <Eye className="w-3 h-3 mr-1" />
                        Viewed
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Messages ({messages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No messages yet</p>
          ) : (
            <div className="space-y-2">
              {messages.slice(0, 5).map((msg) => (
                <div key={msg.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-sm">{msg.subject || 'No subject'}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(msg.created_date), 'MMM d')}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        setShowUploadDialog(open);
        if (!open) { setSelectedFile(null); setDocType('tax_return'); setDocNotes(''); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document with Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="space-y-2">
              <Label>Select File *</Label>
              <input
                type="file"
                className="block w-full text-sm text-slate-600 border border-input rounded-md px-3 py-2 cursor-pointer"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile && (
                <p className="text-xs text-slate-500 truncate">{selectedFile.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Document Type *</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="tax_return">Tax Return</option>
                <option value="financial_statement">Financial Statement</option>
                <option value="engagement_letter">Engagement Letter</option>
                <option value="invoice">Invoice</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Add a note for the client..."
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingFile}>
                {uploadingFile ? 'Uploading...' : 'Upload & Share'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}