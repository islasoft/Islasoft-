import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, EyeOff, Copy, Edit, Trash2, ExternalLink, Key, Upload, Shield } from 'lucide-react';
import { toast } from 'sonner';
import PasswordForm from '../components/vault/PasswordForm';
import PasswordImportDialog from '../components/vault/PasswordImportDialog';
import PasswordAnalyzer from '../components/vault/PasswordAnalyzer';
import { logAudit } from '../components/security/AuditLogger';
import { formatDate } from '@/lib/utils';

export default function PasswordVault() {
  const [showForm, setShowForm] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showImport, setShowImport] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = currentUser?.role === 'admin' || currentUser?.team_category === 'cpa' || currentUser?.team_category === 'senior_staff';

  const { data: passwords = [], isLoading } = useQuery({
    queryKey: ['passwords'],
    queryFn: () => base44.entities.PasswordVault.list('-date'),
    enabled: !!currentUser,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!currentUser,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PasswordVault.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passwords'] });
      setShowForm(false);
      setEditingPassword(null);
      toast.success('Password saved');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PasswordVault.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passwords'] });
      setShowForm(false);
      setEditingPassword(null);
      toast.success('Password updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PasswordVault.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passwords'] });
      toast.success('Password deleted');
    },
  });

  const handleSubmit = (data) => {
    if (editingPassword) {
      updateMutation.mutate({ id: editingPassword.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const togglePasswordVisibility = (id) => {
    const password = passwords.find(p => p.id === id);
    if (password && !visiblePasswords[id]) {
      logAudit('view_password', 'Password', id, password.name);
    }
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleDelete = (password) => {
    if (window.confirm(`Delete password for ${password.name}?`)) {
      deleteMutation.mutate(password.id);
    }
  };

  const filteredPasswords = passwords.filter(pwd =>
    pwd.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pwd.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pwd.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pwd.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryColors = {
    accounting_software: 'bg-blue-100 text-blue-800',
    tax_software: 'bg-green-100 text-green-800',
    banking: 'bg-yellow-100 text-yellow-800',
    government_portal: 'bg-red-100 text-red-800',
    client_portal: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800',
  };

  if (currentUser && !isManager) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600">Password Vault is only accessible to Managers and Admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Password Vault</h1>
          <p className="text-gray-600 mt-1">Securely store credentials for online services</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAnalyzer(!showAnalyzer)}
            variant="outline"
          >
            <Shield className="w-4 h-4 mr-2" />
            Analyze
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
              setEditingPassword(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Password
          </Button>
        </div>
      </div>

      {showForm && (
        <PasswordForm
          password={editingPassword}
          clients={clients}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingPassword(null);
          }}
        />
      )}

      {showImport && (
        <PasswordImportDialog
          onClose={() => setShowImport(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['passwords'] })}
        />
      )}

      {showAnalyzer && (
        <PasswordAnalyzer passwords={passwords} />
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search by name, username, category, or client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading passwords...</div>
      ) : filteredPasswords.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No passwords found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPasswords.map((pwd) => (
            <Card key={pwd.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Key className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{pwd.name}</h3>
                          {pwd.category && (
                            <Badge className={categoryColors[pwd.category]}>
                              {pwd.category.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {pwd.client_name && (
                            <Badge variant="outline">{pwd.client_name}</Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-24">Username:</span>
                            <span className="font-mono">{pwd.username || 'N/A'}</span>
                            {pwd.username && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(pwd.username, 'Username')}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-24">Password:</span>
                            <span className="font-mono">
                              {visiblePasswords[pwd.id] ? pwd.password : '••••••••'}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => togglePasswordVisibility(pwd.id)}
                            >
                              {visiblePasswords[pwd.id] ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </Button>
                            {pwd.password && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(pwd.password, 'Password')}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            )}
                          </div>

                          {pwd.link && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-24">Link:</span>
                              <a
                                href={pwd.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {pwd.link}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}

                          {pwd.contact_phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-24">Phone:</span>
                              <span>{pwd.contact_phone}</span>
                            </div>
                          )}

                          {pwd.security_questions && (
                            <div className="flex items-start gap-2">
                              <span className="text-gray-500 w-24">Security:</span>
                              <span className="flex-1">{pwd.security_questions}</span>
                            </div>
                          )}

                          {pwd.comments && (
                            <div className="flex items-start gap-2">
                              <span className="text-gray-500 w-24">Notes:</span>
                              <span className="flex-1 text-gray-700">{pwd.comments}</span>
                            </div>
                          )}

                          {pwd.date && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-24">Date:</span>
                              <span>{formatDate(pwd.date)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPassword(pwd);
                        setShowForm(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(pwd)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}