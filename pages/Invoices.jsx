import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, AlertCircle, Sparkles, FileSpreadsheet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '../components/mobile/PageHeader';
import PullToRefresh from '../components/mobile/PullToRefresh';
import CreateInvoiceDialog from '../components/invoices/CreateInvoiceDialog';
import InvoiceList from '../components/invoices/InvoiceList';
import InvoiceDataExtractor from '../components/invoices/InvoiceDataExtractor';
import ExpenseCategorizer from '../components/invoices/ExpenseCategorizer';
import AIInvoiceGenerator from '../components/invoices/AIInvoiceGenerator';
import AutomatedReminderSettings from '../components/invoices/AutomatedReminderSettings';
import { logAudit } from '../components/security/AuditLogger';

export default function Invoices() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [aiGeneratedInvoice, setAiGeneratedInvoice] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.team_category === 'cpa' || user?.team_category === 'senior_staff';

  useEffect(() => {
    if (user) {
      setHasAccess(isManager);
      if (isManager) {
        logAudit('view_invoice', 'Invoice', null, 'Invoice Dashboard');
      }
    }
  }, [user, isManager]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
    enabled: hasAccess,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: hasAccess,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: hasAccess,
  });

  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    enabled: hasAccess,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['invoices'] });
      const previousInvoices = queryClient.getQueryData(['invoices']);
      
      queryClient.setQueryData(['invoices'], (old = []) =>
        old.map((invoice) => (invoice.id === id ? { ...invoice, ...data } : invoice))
      );
      
      return { previousInvoices };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['invoices'], context.previousInvoices);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const exportToSheetsMatution = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('exportInvoicesToGoogleSheets', {});
      return response.data;
    },
    onError: (error) => {
      alert('Failed to export: ' + error.message);
    },
  });

  if (user && !isManager) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600">Invoice management is only accessible to Managers and Admins.</p>
        </div>
      </div>
    );
  }

  const handleAIGeneratedInvoice = (invoiceData) => {
    // Open create dialog with pre-filled data
    setShowCreateDialog(true);
    // You could pass the data to CreateInvoiceDialog if needed
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    await queryClient.invalidateQueries({ queryKey: ['clients'] });
    await queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <PageHeader title="Invoices" />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 hidden md:block">Invoices</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base hidden md:block">Create and manage client invoices</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              const result = await exportToSheetsMatution.mutateAsync();
              if (result.success) {
                window.open(result.spreadsheetUrl, '_blank');
              }
            }}
            variant="outline"
            disabled={exportToSheetsMatution.isPending}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {exportToSheetsMatution.isPending ? 'Exporting...' : 'Export to Google Sheets'}
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {showCreateDialog && (
        <CreateInvoiceDialog
          clients={clients}
          timeEntries={allTimeEntries}
          invoices={invoices}
          projects={projects}
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">All Invoices</TabsTrigger>
          <TabsTrigger value="reminders">Reminder Settings</TabsTrigger>
          <TabsTrigger value="ai-tools">AI Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-6">
          <InvoiceList
            invoices={invoices}
            isLoading={isLoading}
            onStatusChange={(id, status) => {
              updateMutation.mutate({ id, data: { status } });
            }}
            clients={clients}
          />
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <AutomatedReminderSettings />
        </TabsContent>

        <TabsContent value="ai-tools" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIInvoiceGenerator
              clients={clients}
              projects={projects}
              onInvoiceGenerated={handleAIGeneratedInvoice}
            />
            <InvoiceDataExtractor />
          </div>
          <div className="mt-6">
            <ExpenseCategorizer />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </PullToRefresh>
  );
}