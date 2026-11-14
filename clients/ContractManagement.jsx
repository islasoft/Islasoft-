import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Calendar, DollarSign, Upload, Download, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ContractManagement({ clientId, clientName }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const queryClient = useQueryClient();

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', clientId],
    queryFn: () => base44.entities.Contract.filter({ client_id: clientId }, '-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contract.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract created successfully');
      setShowDialog(false);
      setEditingContract(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contract.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract updated successfully');
      setShowDialog(false);
      setEditingContract(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contract.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract deleted successfully');
    },
  });

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditingContract({ ...editingContract, [fieldName]: file_url });
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      client_id: clientId,
      client_name: clientName,
      title: formData.get('title'),
      contract_type: formData.get('contract_type'),
      description: formData.get('description'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      renewal_date: formData.get('renewal_date'),
      value: parseFloat(formData.get('value')) || 0,
      status: formData.get('status'),
      terms: formData.get('terms'),
      notes: formData.get('notes'),
      is_recurring: formData.get('is_recurring') === 'true',
      file_url: editingContract?.file_url || '',
      signed_file_url: editingContract?.signed_file_url || '',
    };

    if (editingContract?.id) {
      updateMutation.mutate({ id: editingContract.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    signed: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    terminated: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Contracts</h3>
        <Button onClick={() => { setEditingContract({}); setShowDialog(true); }} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Contract
        </Button>
      </div>

      <div className="grid gap-4">
        {contracts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No contracts yet</p>
            </CardContent>
          </Card>
        ) : (
          contracts.map((contract) => (
            <Card key={contract.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{contract.title}</h4>
                      <Badge className={statusColors[contract.status]}>
                        {contract.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{contract.contract_type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingContract(contract); setShowDialog(true); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this contract?')) {
                          deleteMutation.mutate(contract.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                {contract.description && (
                  <p className="text-sm text-gray-700 mb-3">{contract.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {contract.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Start: {format(new Date(contract.start_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {contract.end_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>End: {format(new Date(contract.end_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {contract.value && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>${contract.value.toLocaleString()}</span>
                    </div>
                  )}
                  {contract.renewal_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Renewal: {format(new Date(contract.renewal_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>

                {(contract.file_url || contract.signed_file_url) && (
                  <div className="flex gap-2 mt-3">
                    {contract.file_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" />
                          Download Contract
                        </a>
                      </Button>
                    )}
                    {contract.signed_file_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={contract.signed_file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" />
                          Signed Copy
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract?.id ? 'Edit Contract' : 'New Contract'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Contract Title *</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingContract?.title}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract_type">Contract Type *</Label>
                <Select name="contract_type" defaultValue={editingContract?.contract_type || 'engagement_letter'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement_letter">Engagement Letter</SelectItem>
                    <SelectItem value="service_agreement">Service Agreement</SelectItem>
                    <SelectItem value="retainer_agreement">Retainer Agreement</SelectItem>
                    <SelectItem value="confidentiality_agreement">Confidentiality Agreement</SelectItem>
                    <SelectItem value="advisory_contract">Advisory Contract</SelectItem>
                    <SelectItem value="bookkeeping_contract">Bookkeeping Contract</SelectItem>
                    <SelectItem value="tax_prep_contract">Tax Prep Contract</SelectItem>
                    <SelectItem value="audit_contract">Audit Contract</SelectItem>
                    <SelectItem value="consulting_agreement">Consulting Agreement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingContract?.description}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={editingContract?.start_date}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={editingContract?.end_date}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Contract Value ($)</Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step="0.01"
                  defaultValue={editingContract?.value}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="renewal_date">Renewal Date</Label>
                <Input
                  id="renewal_date"
                  name="renewal_date"
                  type="date"
                  defaultValue={editingContract?.renewal_date}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editingContract?.status || 'draft'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_recurring">Auto-Renew</Label>
                <Select name="is_recurring" defaultValue={editingContract?.is_recurring ? 'true' : 'false'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                name="terms"
                defaultValue={editingContract?.terms}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={editingContract?.notes}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract Document</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingFile}
                    onClick={() => document.getElementById('file_upload').click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  {editingContract?.file_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={editingContract.file_url} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  )}
                </div>
                <input
                  id="file_upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'file_url')}
                />
              </div>
              <div className="space-y-2">
                <Label>Signed Document</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingFile}
                    onClick={() => document.getElementById('signed_upload').click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  {editingContract?.signed_file_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={editingContract.signed_file_url} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  )}
                </div>
                <input
                  id="signed_upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'signed_file_url')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingContract?.id ? 'Update' : 'Create'} Contract
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}