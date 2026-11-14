import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, FolderKanban, MessageSquare, Upload, LayoutDashboard } from 'lucide-react';
import PageHeader from '../components/mobile/PageHeader';
import PullToRefresh from '../components/mobile/PullToRefresh';
import ClientProjectStatus from '../components/client_portal/ClientProjectStatus';
import ClientInvoiceList from '../components/client_portal/ClientInvoiceList';
import ClientDocumentManager from '../components/client_portal/ClientDocumentManager';
import ClientMessenger from '../components/client_portal/ClientMessenger';

export default function ClientPortal() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: currentUser, isLoading: isUserLoading, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientList, isLoading: isClientLoading, error: clientError } = useQuery({
    queryKey: ['clientData', currentUser?.id],
    queryFn: () => base44.entities.Client.filter({ user_id: currentUser.id }),
    enabled: !!currentUser,
  });

  const currentClient = clientList?.[0];

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    await queryClient.invalidateQueries({ queryKey: ['clientData'] });
    await queryClient.invalidateQueries({ queryKey: ['clientProjects'] });
    await queryClient.invalidateQueries({ queryKey: ['clientInvoices'] });
    await queryClient.invalidateQueries({ queryKey: ['clientDocuments'] });
    await queryClient.invalidateQueries({ queryKey: ['clientMessages'] });
  };

  if (isUserLoading || isClientLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading client portal...</p>
      </div>
    );
  }

  if (userError || clientError || !currentClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have access to a client portal or your account is not linked.</p>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <PageHeader 
          title={currentClient.company_name ? `${currentClient.company_name} Portal` : "Client Portal"} 
          showBack={false} 
        />
        
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome, {currentClient.contact_person || currentClient.name || currentClient.company_name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your projects, invoices, and documents here.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 md:w-fit md:mx-auto">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
              <LayoutDashboard className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs sm:text-sm">
              <FolderKanban className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs sm:text-sm">
              <FileText className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm">
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs sm:text-sm">
              <MessageSquare className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-600">Overview of your current status, upcoming deadlines, and recent activity.</p>
                <ClientProjectStatus clientId={currentClient.id} simpleView={true} />
                <ClientInvoiceList clientId={currentClient.id} simpleView={true} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <ClientProjectStatus clientId={currentClient.id} />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <ClientInvoiceList clientId={currentClient.id} />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <ClientDocumentManager 
              clientId={currentClient.id} 
              clientName={currentClient.company_name || currentClient.name} 
            />
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <ClientMessenger 
              clientId={currentClient.id} 
              clientName={currentClient.company_name || currentClient.name} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </PullToRefresh>
  );
}