import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, FileText, ExternalLink, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import TaxDocumentUploader from '@/components/clients/TaxDocumentUploader';

export default function ClientDocumentManager({ clientId, clientName }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Files in the client's "for_accountant" Drive folder
  const { data: filesData, isLoading } = useQuery({
    queryKey: ['driveFiles', clientId, 'for_accountant'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listClientDriveFiles', {
        client_id: clientId,
        folder_type: 'for_accountant',
      });
      return response.data;
    },
    enabled: !!clientId,
  });

  const files = filesData?.files || [];

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('client_id', clientId);
    formData.append('folder_type', 'for_accountant');
    formData.append('file', file);

    try {
      await base44.functions.invoke('uploadToClientDrive', formData);
      queryClient.invalidateQueries({ queryKey: ['driveFiles', clientId, 'for_accountant'] });
      toast.success('File uploaded successfully!');
    } catch (err) {
      toast.error('Failed to upload file.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <TaxDocumentUploader clientId={clientId} clientName={clientName} />

      <Card>
      <CardHeader>
        <CardTitle>Documents for Accountant</CardTitle>
        <CardDescription>Upload documents directly to your accountant's folder in Google Drive.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload area */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <Input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="client-upload"
          />
          <Label htmlFor="client-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              ) : (
                <Upload className="w-8 h-8 text-blue-600" />
              )}
              <p className="font-medium">{uploading ? 'Uploading...' : 'Click to upload file'}</p>
              <p className="text-sm text-gray-500">or drag and drop</p>
            </div>
          </Label>
        </div>

        {/* File list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No files uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">{new Date(file.modifiedTime).toLocaleDateString()}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => window.open(file.webViewLink, '_blank')}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}