import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, ExternalLink, Loader2, FolderOpen, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const PROJECT_TYPE_LABELS = {
  individual_tax_1040: 'Individual Tax (1040)',
  business_tax_1120: 'Business Tax (1120)',
  s_corp_tax_1120s: 'S-Corp Tax (1120S)',
  partnership_tax_1065: 'Partnership Tax (1065)',
  monthly_bookkeeping: 'Monthly Bookkeeping',
  quarterly_bookkeeping: 'Quarterly Bookkeeping',
  annual_bookkeeping: 'Annual Bookkeeping',
  payroll_processing: 'Payroll Processing',
  sales_tax_registration: 'Sales Tax',
};

export default function TaxDocumentUploader({ clientId, clientName, readOnly = false }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [selectedProjectId, setSelectedProjectId] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Load client's projects
  const { data: projects = [] } = useQuery({
    queryKey: ['clientProjects', clientId],
    queryFn: () => base44.entities.Project.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  // Load already-uploaded documents for this client
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['clientSharedDocs', clientId],
    queryFn: () => base44.entities.SharedDocument.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const activeProjects = projects.filter(p => p.status !== 'completed');

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectName = selectedProject
    ? (PROJECT_TYPE_LABELS[selectedProject.project_type] || selectedProject.project_type)
    : 'General Documents';

  const doUpload = async (file) => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('client_id', clientId);
    formData.append('file', file);
    formData.append('project_name', projectName);
    if (selectedProjectId !== 'general') {
      formData.append('project_id', selectedProjectId);
    }

    try {
      const res = await base44.functions.invoke('uploadTaxDocument', formData);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`"${file.name}" uploaded to "${projectName}"`);
      queryClient.invalidateQueries({ queryKey: ['clientSharedDocs', clientId] });
      queryClient.invalidateQueries({ queryKey: ['driveFiles', clientId] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => doUpload(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-sky-600" />
          Tax Document Upload
        </CardTitle>
        <CardDescription>
          Upload tax documents directly to Google Drive, organized by project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Project selector */}
        {!readOnly && (
          <div className="space-y-2">
            <Label>Link to Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Documents (no project)</SelectItem>
                {activeProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {PROJECT_TYPE_LABELS[p.project_type] || p.project_type}
                    {p.due_date ? ` — due ${new Date(p.due_date).toLocaleDateString()}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Drop zone */}
        {!readOnly && (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.csv,.txt"
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
                <p className="font-medium text-slate-700">Uploading to Drive...</p>
                <p className="text-sm text-slate-500">Saving to "{projectName}"</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-10 h-10 text-sky-400" />
                <p className="font-semibold text-slate-700">Click or drag & drop to upload</p>
                <p className="text-sm text-slate-500">
                  Will be saved to <span className="font-medium text-sky-600">"{projectName}"</span> in Google Drive
                </p>
                <p className="text-xs text-slate-400">PDF, Word, Excel, Images, CSV accepted</p>
              </div>
            )}
          </div>
        )}

        {/* Uploaded documents list */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700">Uploaded Documents</h4>
          {docsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-1 opacity-40" />
              <p className="text-sm">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-slate-50 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{doc.document_name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(doc.created_date).toLocaleDateString()}
                        {doc.notes && <span className="ml-1">· {doc.notes.replace('Linked to project: ', '')}</span>}
                      </p>
                    </div>
                  </div>
                  {doc.file_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() => window.open(doc.file_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}