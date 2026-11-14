import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, Package, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function QuickBooksItemManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    type: 'Service',
    unit_price: '',
  });

  const queryClient = useQueryClient();

  const callFunction = async (functionName, payload = {}) => {
    const isPlatformDomain = window.location.hostname === 'app.base44.com';
    if (isPlatformDomain) {
      const appId = '69602ce76ba05524a04d858f';
      const subdomainUrl = `https://${appId}.base44.app/api/apps/${appId}/functions/${functionName}`;
      const response = await fetch(subdomainUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      return await response.json();
    } else {
      const { data } = await base44.functions.invoke(functionName, payload);
      return data;
    }
  };

  const { data: settings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const list = await base44.entities.CompanySettings.list();
      return list[0] || null;
    }
  });

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['quickbooksItems'],
    queryFn: () => base44.entities.QuickBooksItem.list('-updated_date', 500)
  });

  const syncItemsMutation = useMutation({
    mutationFn: () => callFunction('syncQuickBooksItems'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooksItems'] });
      toast.success('QuickBooks items synced successfully!');
    },
    onError: (error) => {
      toast.error('Failed to sync items: ' + error.message);
    }
  });

  const createItemMutation = useMutation({
    mutationFn: async (itemData) => {
      const response = await callFunction('createQuickBooksItem', itemData);
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooksItems'] });
      setCreateDialogOpen(false);
      setNewItem({ name: '', description: '', type: 'Service', unit_price: '' });
      toast.success('QuickBooks item created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create item: ' + error.message);
    }
  });

  const handleCreateItem = () => {
    if (!newItem.name) {
      toast.error('Item name is required');
      return;
    }
    if (!newItem.unit_price || parseFloat(newItem.unit_price) < 0) {
      toast.error('Valid unit price is required');
      return;
    }
    createItemMutation.mutate({
      name: newItem.name,
      description: newItem.description,
      type: newItem.type,
      unit_price: parseFloat(newItem.unit_price)
    });
  };

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeItems = filteredItems.filter(item => item.active !== false);
  const inactiveItems = filteredItems.filter(item => item.active === false);

  if (!settings?.quickbooks_connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QuickBooks Not Connected</CardTitle>
          <CardDescription>Connect to QuickBooks in Settings to manage items</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">QuickBooks Items</h2>
          <p className="text-gray-600 mt-1">Manage products and services for invoicing</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => syncItemsMutation.mutate()}
            disabled={syncItemsMutation.isPending}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncItemsMutation.isPending ? 'animate-spin' : ''}`} />
            Sync from QB
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create QuickBooks Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Item Name *</Label>
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="e.g., Consulting Services"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select value={newItem.type} onValueChange={(value) => setNewItem({ ...newItem, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="NonInventory">Non-Inventory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateItem}
                    disabled={createItemMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createItemMutation.isPending ? 'Creating...' : 'Create Item'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Items</p>
                <p className="text-2xl font-bold text-gray-900">{activeItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Package className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Inactive Items</p>
                <p className="text-2xl font-bold text-gray-900">{inactiveItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Items List</CardTitle>
          <CardDescription>
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Unit Price</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Last Synced</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-gray-600">{item.description || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {item.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        ${item.unit_price?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.active !== false ? (
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {item.synced_at ? new Date(item.synced_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}