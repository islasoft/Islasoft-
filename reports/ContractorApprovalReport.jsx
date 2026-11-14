import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, DollarSign, User, Briefcase, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ContractorApprovalReport() {
  const [selectedMember, setSelectedMember] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [approvalStatus, setApprovalStatus] = useState({});
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntriesForApproval', startDate, endDate],
    queryFn: async () => {
      const entries = await base44.entities.TimeEntry.list('-date');
      return entries.filter(entry => {
        const entryDate = new Date(entry.date);
        const matchesDateRange = (!startDate || entryDate >= new Date(startDate)) &&
                                 (!endDate || entryDate <= new Date(endDate));
        return matchesDateRange;
      });
    },
  });

  // Group time entries by staff member
  const groupedEntries = timeEntries.reduce((acc, entry) => {
    const staffId = entry.staff_id || 'unassigned';
    if (!acc[staffId]) {
      acc[staffId] = {
        staff: users.find(u => u.id === staffId),
        entries: [],
        totalHours: 0,
        approvedHours: 0,
      };
    }
    acc[staffId].entries.push(entry);
    acc[staffId].totalHours += entry.hours || 0;
    return acc;
  }, {});

  // Filter out already invoiced entries
  const uninvoicedEntries = timeEntries.filter(entry => !entry.invoiced);
  
  // Group uninvoiced time entries by staff member
  const groupedEntriesUnfiltered = uninvoicedEntries.reduce((acc, entry) => {
    const staffId = entry.staff_id || 'unassigned';
    if (!acc[staffId]) {
      acc[staffId] = {
        staff: users.find(u => u.id === staffId),
        entries: [],
        totalHours: 0,
        approvedHours: 0,
      };
    }
    acc[staffId].entries.push(entry);
    acc[staffId].totalHours += entry.hours || 0;
    return acc;
  }, {});

  // Filter by selected member
  const filteredData = selectedMember === 'all' 
    ? Object.values(groupedEntriesUnfiltered)
    : Object.values(groupedEntriesUnfiltered).filter(group => group.staff?.id === selectedMember);

  // Calculate approved hours
  filteredData.forEach(group => {
    group.approvedHours = group.entries.reduce((sum, entry) => {
      return sum + (approvalStatus[entry.id] ? entry.hours || 0 : 0);
    }, 0);
  });

  const handleApprovalToggle = (entryId, isApproved) => {
    setApprovalStatus(prev => ({
      ...prev,
      [entryId]: isApproved
    }));
  };

  const handleApproveAll = (entries) => {
    const newStatus = { ...approvalStatus };
    entries.forEach(entry => {
      newStatus[entry.id] = true;
    });
    setApprovalStatus(newStatus);
    toast.success('All hours approved');
  };

  const handleRejectAll = (entries) => {
    const newStatus = { ...approvalStatus };
    entries.forEach(entry => {
      newStatus[entry.id] = false;
    });
    setApprovalStatus(newStatus);
    toast.success('All hours rejected');
  };

  const finalizePaymentMutation = useMutation({
    mutationFn: async ({ staff, approvedEntries, approvedHours, totalPayment }) => {
      const currentUser = await base44.auth.me();
      
      // Create payment record
      await base44.entities.ContractorPayment.create({
        contractor_id: staff.id,
        contractor_name: staff.full_name,
        period_start: startDate || approvedEntries[0]?.date,
        period_end: endDate || approvedEntries[approvedEntries.length - 1]?.date,
        total_hours: approvedHours,
        hourly_rate: staff.hourly_rate || 0,
        total_amount: totalPayment,
        time_entry_ids: approvedEntries.map(e => e.id),
        approved_by_id: currentUser.id,
        approved_by_name: currentUser.full_name,
        status: 'pending'
      });

      // Mark time entries as invoiced
      for (const entry of approvedEntries) {
        await base44.entities.TimeEntry.update(entry.id, {
          invoiced: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntriesForApproval'] });
      setApprovalStatus({});
      toast.success('Payment finalized and moved to Contractor Payment report');
    },
    onError: (error) => {
      toast.error(`Failed to finalize payment: ${error.message}`);
    }
  });

  const handleFinalizePayment = (group) => {
    const approvedEntries = group.entries.filter(entry => approvalStatus[entry.id]);
    
    if (approvedEntries.length === 0) {
      toast.error('No hours approved. Please approve hours before finalizing.');
      return;
    }

    if (!confirm(`Finalize payment of $${calculatePayment(group.approvedHours, group.staff.hourly_rate)} for ${group.staff.full_name}? This will move approved hours to Contractor Payment report.`)) {
      return;
    }

    finalizePaymentMutation.mutate({
      staff: group.staff,
      approvedEntries,
      approvedHours: group.approvedHours,
      totalPayment: parseFloat(calculatePayment(group.approvedHours, group.staff.hourly_rate))
    });
  };

  const calculatePayment = (approvedHours, rate) => {
    return (approvedHours * (rate || 0)).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Contractor Payment Approval Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Team Member</label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {users.filter(u => u.contractor_form).map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Quick Filter</label>
              <Select onValueChange={(value) => {
                const today = new Date();
                if (value === 'this_week') {
                  const monday = new Date(today);
                  monday.setDate(today.getDate() - today.getDay() + 1);
                  setStartDate(format(monday, 'yyyy-MM-dd'));
                  setEndDate(format(today, 'yyyy-MM-dd'));
                } else if (value === 'this_month') {
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  setStartDate(format(firstDay, 'yyyy-MM-dd'));
                  setEndDate(format(today, 'yyyy-MM-dd'));
                } else if (value === 'last_month') {
                  const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                  setStartDate(format(firstDay, 'yyyy-MM-dd'));
                  setEndDate(format(lastDay, 'yyyy-MM-dd'));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Member Reports */}
      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No time entries found for the selected period
          </CardContent>
        </Card>
      ) : (
        filteredData.map(group => {
          const staff = group.staff || { full_name: 'Unassigned', hourly_rate: 0 };
          const totalPayment = calculatePayment(group.approvedHours, staff.hourly_rate);

          return (
            <Card key={staff.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <User className="w-5 h-5" />
                      {staff.full_name}
                    </CardTitle>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm">
                      <Badge variant="outline" className="bg-white dark:bg-gray-800">
                        <Clock className="w-3 h-3 mr-1" />
                        {group.totalHours.toFixed(2)} hrs logged
                      </Badge>
                      <Badge variant="outline" className="bg-white dark:bg-gray-800">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                        {group.approvedHours.toFixed(2)} hrs approved
                      </Badge>
                      <Badge variant="outline" className="bg-white dark:bg-gray-800">
                        <DollarSign className="w-3 h-3 mr-1" />
                        ${staff.hourly_rate || 0}/hr
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      ${totalPayment}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Total Payment Due
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproveAll(group.entries)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectAll(group.entries)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject All
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleFinalizePayment(group)}
                        disabled={finalizePaymentMutation.isPending || group.approvedHours === 0}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Finalize Payment
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Approve
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Project
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Client
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Description
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Hours
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {group.entries.map(entry => {
                        const isApproved = approvalStatus[entry.id] || false;
                        const amount = (entry.hours || 0) * (staff.hourly_rate || 0);

                        return (
                          <tr
                            key={entry.id}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
                              isApproved ? 'bg-green-50 dark:bg-green-950' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={isApproved}
                                onCheckedChange={(checked) => handleApprovalToggle(entry.id, checked)}
                              />
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {format(new Date(entry.date), 'MMM d, yyyy')}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-gray-400" />
                                {entry.project_name || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {entry.client_name || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                              {entry.description || 'No description'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">
                              {(entry.hours || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">
                              <span className={isApproved ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                                ${amount.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-gray-900 border-t-2">
                      <tr>
                        <td colSpan="5" className="px-4 py-4 text-right font-semibold">
                          Total Approved:
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-lg">
                          {group.approvedHours.toFixed(2)} hrs
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-lg text-green-600 dark:text-green-400">
                          ${totalPayment}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Overall Summary */}
      {filteredData.length > 0 && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200">
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredData.reduce((sum, g) => sum + g.totalHours, 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total Hours Logged
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {filteredData.reduce((sum, g) => sum + g.approvedHours, 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total Hours Approved
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                  ${filteredData.reduce((sum, g) => {
                    const rate = g.staff?.hourly_rate || 0;
                    return sum + (g.approvedHours * rate);
                  }, 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total Payment Due
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}