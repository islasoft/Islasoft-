import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkAssignManagerDialog({ onClose, onSuccess }) {
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: unassignedClients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients-unassigned'],
    queryFn: async () => {
      const all = await base44.entities.Client.list('client_number');
      return all.filter(c => !c.manager_id);
    }
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => base44.entities.User.list(),
  });

  const managers = teamMembers.filter(u =>
    u.team_category === 'cpa' ||
    u.team_category === 'senior_staff' ||
    u.team_category === 'internal'
  );

  const selectedManager = managers.find(m => m.id === selectedManagerId);

  const allChecked = unassignedClients.length > 0 && selectedClientIds.length === unassignedClients.length;

  const toggleAll = () => {
    setSelectedClientIds(allChecked ? [] : unassignedClients.map(c => c.id));
  };

  const toggleClient = (id) => {
    setSelectedClientIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!selectedManagerId) {
      toast.error('Please select a manager first');
      return;
    }
    if (selectedClientIds.length === 0) {
      toast.error('Please select at least one client');
      return;
    }

    setSaving(true);
    try {
      for (const id of selectedClientIds) {
        await base44.entities.Client.update(id, {
          manager_id: selectedManager.id,
          manager_name: selectedManager.full_name
        });
      }
      toast.success(`${selectedClientIds.length} client(s) assigned to ${selectedManager.full_name}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to assign manager');
    } finally {
      setSaving(false);
    }
  };

  const getClientDisplayName = (client) => {
    if (client.company_name) return client.company_name;
    return [client.name, client.last_name].filter(Boolean).join(' ') || '—';
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Bulk Assign Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Manager selector */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Assign to Manager</label>
            <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a manager..." />
              </SelectTrigger>
              <SelectContent>
                {managers.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name} <span className="text-gray-400 text-xs ml-1">({m.team_category})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client table */}
          {loadingClients ? (
            <p className="text-sm text-gray-500">Loading unassigned clients...</p>
          ) : unassignedClients.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">All clients already have a manager assigned.</p>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col border rounded-lg">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b text-sm font-medium text-gray-600">
                <Checkbox checked={allChecked} onCheckedChange={toggleAll} id="select-all-managers" />
                <label htmlFor="select-all-managers" className="cursor-pointer select-none">Select All ({unassignedClients.length})</label>
                <span className="ml-auto text-xs text-gray-400">{selectedClientIds.length} selected</span>
              </div>
              {/* Rows */}
              <div className="overflow-y-auto flex-1">
                {unassignedClients.map(client => (
                  <div
                    key={client.id}
                    className={`flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-gray-50 cursor-pointer ${selectedClientIds.includes(client.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => toggleClient(client.id)}
                  >
                    <Checkbox
                      checked={selectedClientIds.includes(client.id)}
                      onCheckedChange={() => toggleClient(client.id)}
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="text-xs text-gray-400 w-20 flex-shrink-0">{client.client_number || '—'}</span>
                    <span className="flex-1 text-sm font-medium truncate">{getClientDisplayName(client)}</span>
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {client.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              onClick={handleAssign}
              disabled={saving || !selectedManagerId || selectedClientIds.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Assigning...' : `Assign Manager (${selectedClientIds.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}