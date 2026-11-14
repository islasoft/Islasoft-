import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({
    task_assigned: { inApp: true, email: false },
    project_assigned: { inApp: true, email: false },
    deadline_approaching: { inApp: true, email: true },
    project_overdue: { inApp: true, email: true },
    task_overdue: { inApp: true, email: true },
    project_status_changed: { inApp: true, email: false },
    task_status_changed: { inApp: true, email: false },
    time_entry_submitted: { inApp: true, email: false },
    invoice_created: { inApp: true, email: true },
    message_received: { inApp: true, email: false },
  });

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (currentUser?.notification_preferences) {
      setPreferences(currentUser.notification_preferences);
    }
  }, [currentUser]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe({ notification_preferences: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Notification preferences saved');
    },
    onError: () => {
      toast.error('Failed to save preferences');
    },
  });

  const handleToggle = (type, channel) => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: !prev[type][channel]
      }
    }));
  };

  const handleSave = () => {
    updateMutation.mutate(preferences);
  };

  const notificationTypes = [
    { key: 'task_assigned', label: 'Task Assigned to You', description: 'When a task is assigned to you' },
    { key: 'project_assigned', label: 'Project Assigned to You', description: 'When a project is assigned to you' },
    { key: 'deadline_approaching', label: 'Approaching Deadlines', description: 'Project or task due within 3 days' },
    { key: 'project_overdue', label: 'Overdue Projects', description: 'When a project passes its due date' },
    { key: 'task_overdue', label: 'Overdue Tasks', description: 'When a task passes its due date' },
    { key: 'project_status_changed', label: 'Project Status Changes', description: 'When a project status is updated' },
    { key: 'task_status_changed', label: 'Task Status Changes', description: 'When a task status is updated' },
    { key: 'time_entry_submitted', label: 'Time Entry Submitted', description: 'When team members submit time entries' },
    { key: 'invoice_created', label: 'Invoice Created', description: 'When a new invoice is created' },
    { key: 'message_received', label: 'New Messages', description: 'When you receive a new message' },
  ];

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
        <p className="text-gray-600 mt-1">Manage how you receive notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose which events you want to be notified about and how you want to receive them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {notificationTypes.map((type) => (
              <div key={type.key} className="border-b pb-4 last:border-b-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-base font-medium">{type.label}</Label>
                    <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-gray-500" />
                      <Switch
                        checked={preferences[type.key]?.inApp ?? true}
                        onCheckedChange={() => handleToggle(type.key, 'inApp')}
                      />
                      <Label className="text-sm text-gray-600">In-App</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <Switch
                        checked={preferences[type.key]?.email ?? false}
                        onCheckedChange={() => handleToggle(type.key, 'email')}
                      />
                      <Label className="text-sm text-gray-600">Email</Label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Digest</CardTitle>
          <CardDescription>
            Email notifications are sent immediately for urgent events. Other notifications can be bundled into a daily digest.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}