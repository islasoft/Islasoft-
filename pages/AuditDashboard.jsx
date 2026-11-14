import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7days');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.list('-created_date', 500);
      return logs;
    },
    enabled: currentUser?.role === 'admin',
  });

  const isAdmin = currentUser?.role === 'admin';

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-600">
              Audit logs are only available to Administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getDateThreshold = () => {
    const now = new Date();
    switch (dateFilter) {
      case '24hours':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    
    const logDate = new Date(log.created_date);
    const matchesDate = logDate >= getDateThreshold();
    
    return matchesSearch && matchesAction && matchesDate;
  });

  const actionTypeLabels = {
    'view_client': 'Viewed Client',
    'edit_client': 'Edited Client',
    'delete_client': 'Deleted Client',
    'view_invoice': 'Viewed Invoice',
    'create_invoice': 'Created Invoice',
    'view_report': 'Viewed Report',
    'export_report': 'Exported Report',
    'view_password': 'Viewed Password',
    'access_portal': 'Accessed Portal',
    'login': 'Logged In',
    'logout': 'Logged Out',
  };

  const actionColors = {
    'view_client': 'bg-blue-100 text-blue-800',
    'edit_client': 'bg-yellow-100 text-yellow-800',
    'delete_client': 'bg-red-100 text-red-800',
    'view_invoice': 'bg-blue-100 text-blue-800',
    'create_invoice': 'bg-green-100 text-green-800',
    'view_report': 'bg-blue-100 text-blue-800',
    'export_report': 'bg-purple-100 text-purple-800',
    'view_password': 'bg-orange-100 text-orange-800',
    'access_portal': 'bg-indigo-100 text-indigo-800',
    'login': 'bg-green-100 text-green-800',
    'logout': 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Audit Log</h1>
          <p className="text-gray-600 mt-1">Monitor all system access and activities</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-input">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search-input"
                  name="search"
                  placeholder="Search by user or resource..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-filter">Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action-filter">
                  <SelectValue placeholder="Action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="view_client">View Client</SelectItem>
                  <SelectItem value="edit_client">Edit Client</SelectItem>
                  <SelectItem value="delete_client">Delete Client</SelectItem>
                  <SelectItem value="view_invoice">View Invoice</SelectItem>
                  <SelectItem value="create_invoice">Create Invoice</SelectItem>
                  <SelectItem value="view_report">View Report</SelectItem>
                  <SelectItem value="export_report">Export Report</SelectItem>
                  <SelectItem value="view_password">View Password</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-filter">Time Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger id="date-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hours">Last 24 Hours</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filteredLogs.length} entries)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Timestamp</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Resource</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700">
                        {format(new Date(log.created_date), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{log.user_name}</p>
                          <p className="text-xs text-gray-500">{log.user_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action_type] || 'bg-gray-100 text-gray-800'}`}>
                          {actionTypeLabels[log.action_type] || log.action_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{log.resource_name || 'N/A'}</p>
                          {log.resource_type && (
                            <p className="text-xs text-gray-500">{log.resource_type}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        <div className="max-w-xs truncate">
                          {log.details || '-'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}