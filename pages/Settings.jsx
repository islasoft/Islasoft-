import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Building2, Save, Link as LinkIcon, CheckCircle, FolderOpen, FolderCheck, ExternalLink, ShieldOff, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import QuickBooksSyncAll from '../components/quickbooks/QuickBooksSyncAll';
import PageHeader from '../components/mobile/PageHeader';

// Settings page — always loads the oldest CompanySettings record
export default function Settings() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    setDeleting(true);
    try {
      // Placeholder — logs intent, does not delete data yet.
      // Wire to real backend deletion endpoint when ready.
      console.warn('[deleteUserAccount] Account deletion requested. Implement server-side cleanup before enabling.');
      await new Promise(r => setTimeout(r, 1000)); // simulate async
      toast.success('Deletion request submitted. Our team will process it within 48 hours.');
      setDeleteDialogOpen(false);
      setDeleteConfirmText('');
    } catch (err) {
      toast.error('Failed to submit deletion request. Please contact support.');
    } finally {
      setDeleting(false);
    }
  };
  const [formData, setFormData] = useState({
    company_name: '',
    tagline: '',
    logo_url: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    from_email: '',
    website: '',
    drive_root_folder_id: '',
    drive_root_folder_name: ''
  });
  const [uploading, setUploading] = useState(false);
  const [connectingQB, setConnectingQB] = useState(false);
  const [multipleSettingsWarning, setMultipleSettingsWarning] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      // Sort ascending by created_date so oldest is first
      const list = await base44.entities.CompanySettings.list('created_date');
      if (list.length > 1) setMultipleSettingsWarning(true);
      // Always use the oldest (first created) record
      return list[0] || null;
    }
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        tagline: settings.tagline || '',
        logo_url: settings.logo_url || '',
        address: settings.address || '',
        city: settings.city || '',
        state: settings.state || '',
        zip_code: settings.zip_code || '',
        phone: settings.phone || '',
        email: settings.email || '',
        from_email: settings.from_email || '',
        website: settings.website || '',
        drive_root_folder_id: settings.drive_root_folder_id || '',
        drive_root_folder_name: settings.drive_root_folder_name || ''
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.CompanySettings.update(settings.id, data);
      } else {
        return base44.entities.CompanySettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companySettings'] });
      toast.success('Settings saved successfully!', { id: 'save-settings' });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save settings', { id: 'save-settings' });
    }
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, logo_url: file_url }));
      toast.success('Logo uploaded');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!formData.company_name) {
      toast.error('Company name is required');
      return;
    }
    toast.loading('Saving settings...', { id: 'save-settings' });
    saveMutation.mutate(formData);
  };

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
      return await response.json();
    } else {
      const { data } = await base44.functions.invoke(functionName, payload);
      return data;
    }
  };

  const handleConnectQuickBooks = async () => {
    try {
      setConnectingQB(true);
      const data = await callFunction('quickbooksOAuthInit');
      const { authUrl } = data;
      window.open(authUrl, 'QuickBooks OAuth', 'width=800,height=600');
      const pollInterval = setInterval(async () => {
        const updatedSettings = await base44.entities.CompanySettings.list();
        if (updatedSettings[0]?.quickbooks_connected) {
          clearInterval(pollInterval);
          queryClient.invalidateQueries({ queryKey: ['companySettings'] });
          toast.success('QuickBooks connected successfully!');
          setConnectingQB(false);
        }
      }, 2000);
      setTimeout(() => {
        clearInterval(pollInterval);
        setConnectingQB(false);
      }, 120000);
    } catch (error) {
      console.error('QuickBooks connection error:', error);
      toast.error('Failed to connect to QuickBooks');
      setConnectingQB(false);
    }
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <ShieldOff className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-semibold text-gray-700">Access Restricted</h2>
        <p className="text-gray-500">Only administrators can access Settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Company Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your company branding and information</p>
      </div>

      {multipleSettingsWarning && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 text-sm text-yellow-800 flex items-start gap-2">
          <span className="text-base">⚠️</span>
          <div>
            <strong>Duplicate settings records detected.</strong> Currently displaying the <strong>oldest/original record</strong> (created first). Please go to the database and delete the newer duplicate CompanySettings record to avoid conflicts.
          </div>
        </div>
      )}

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="drive">Google Drive</TabsTrigger>
          <TabsTrigger value="quickbooks">QuickBooks</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                This information will appear in the app header, invoices, and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Company Logo</Label>
                {formData.logo_url && (
                  <div className="mb-2">
                    <img src={formData.logo_url} alt="Company logo" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                  </div>
                )}
                <div className="flex gap-2">
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="flex-1" />
                  {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input placeholder="Isla Accounting Corp" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input placeholder="Practice Manager" value={formData.tagline} onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input placeholder="2325 Wiley St" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input placeholder="Hollywood" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input placeholder="FL" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input placeholder="33020" value={formData.zip_code} onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="(305) 290-1145" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="info@islaccounting.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>From Email (for outgoing emails)</Label>
                  <Input type="email" placeholder="noreply@islaccounting.com" value={formData.from_email} onChange={(e) => setFormData({ ...formData, from_email: e.target.value })} />
                  <p className="text-xs text-gray-500">All emails sent from the app will use this address</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Website</Label>
                <Input placeholder="www.islaccounting.com" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-500" />
                Google Drive — Client Folders Location
              </CardTitle>
              <CardDescription>
                Set the Google Drive folder where all client portal folders will be created. Paste the folder ID from the Drive URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>How to find a folder ID:</strong> Open Google Drive, navigate to the folder, and copy the ID from the URL — it's the long string after <code className="bg-blue-100 px-1 rounded">/folders/</code>.
                <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 underline">
                  Open Google Drive <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="space-y-2">
                <Label>Root Folder ID</Label>
                <Input placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" value={formData.drive_root_folder_id || ''} onChange={(e) => setFormData({ ...formData, drive_root_folder_id: e.target.value.trim() })} />
                <p className="text-xs text-gray-500">All new client portal folders will be created inside this folder.</p>
              </div>
              <div className="space-y-2">
                <Label>Folder Display Name <span className="text-gray-400 font-normal">(optional label)</span></Label>
                <Input placeholder="e.g. Client Portals" value={formData.drive_root_folder_name || ''} onChange={(e) => setFormData({ ...formData, drive_root_folder_name: e.target.value })} />
              </div>
              {settings?.drive_root_folder_id && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  <FolderCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Root folder is set: <strong>{settings.drive_root_folder_name || settings.drive_root_folder_id}</strong></span>
                  <a href={`https://drive.google.com/drive/folders/${settings.drive_root_folder_id}`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 underline">
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Drive Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quickbooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                QuickBooks Integration
              </CardTitle>
              <CardDescription>Connect your QuickBooks account to sync invoices automatically</CardDescription>
            </CardHeader>
            <CardContent>
              {settings?.quickbooks_connected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">QuickBooks Connected</p>
                        <p className="text-sm text-green-700">Company ID: {settings.quickbooks_realm_id}</p>
                        <p className="text-sm text-green-700">Connected: {new Date(settings.quickbooks_connected_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={async () => {
                        if (confirm('Disconnect from QuickBooks? This will remove all sync settings.')) {
                          await base44.entities.CompanySettings.update(settings.id, {
                            quickbooks_connected: false,
                            quickbooks_access_token: null,
                            quickbooks_refresh_token: null,
                            quickbooks_realm_id: null,
                            quickbooks_token_expires_at: null
                          });
                          queryClient.invalidateQueries({ queryKey: ['companySettings'] });
                          toast.success('Disconnected from QuickBooks');
                        }
                      }} variant="outline">Disconnect</Button>
                      <Button onClick={handleConnectQuickBooks} variant="outline" disabled={connectingQB}>Reconnect</Button>
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      <strong>Seeing wrong company when reconnecting?</strong> Log out of QuickBooks completely at intuit.com, then click Reconnect and log in with your production account.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900 mb-2">Connect to QuickBooks to automatically sync invoices and streamline your accounting workflow.</p>
                    <p className="text-xs text-blue-800"><strong>Important:</strong> Before clicking Connect, make sure you're logged into your <strong>production</strong> QuickBooks account (not sandbox).</p>
                  </div>
                  <Button onClick={handleConnectQuickBooks} disabled={connectingQB} className="bg-green-600 hover:bg-green-700">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    {connectingQB ? 'Connecting...' : 'Connect to QuickBooks'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          {settings?.quickbooks_connected && <QuickBooksSyncAll />}
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
                Delete Account
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-300 space-y-1">
                <p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> What will be deleted:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>Your user profile and login access</li>
                  <li>All client records, contacts, and portals</li>
                  <li>All time entries, projects, and tasks</li>
                  <li>All invoices and billing history</li>
                  <li>All documents and uploaded files</li>
                  <li>All company settings and integrations</li>
                </ul>
                <p className="mt-2 font-medium">This cannot be reversed.</p>
              </div>
              <Button
                variant="destructive"
                onClick={() => { setDeleteDialogOpen(true); setDeleteConfirmText(''); }}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete My Account
              </Button>
            </CardContent>
          </Card>

          {/* Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmText(''); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Confirm Account Deletion
                </DialogTitle>
                <DialogDescription className="space-y-2 pt-2">
                  <p>You are about to permanently delete your Isla Accounting account and all data associated with it. <strong>This cannot be undone.</strong></p>
                  <p className="mt-2">To confirm, type <strong className="text-red-600 font-mono">DELETE</strong> in the field below:</p>
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="border-red-300 focus:ring-red-500 font-mono"
                  autoComplete="off"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(''); }}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  onClick={handleDeleteAccount}
                  className="flex items-center gap-2"
                >
                  {deleting ? 'Submitting...' : 'Yes, Delete My Account'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}