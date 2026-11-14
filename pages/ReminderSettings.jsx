import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Plus, Trash2, Save, Calendar, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ReminderSettings() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSetting, setEditingSetting] = useState(null);
  const [formData, setFormData] = useState({
    reminder_type: 'project_deadline',
    days_before: 3,
    days_after: 7,
    notify_assigned_member: true,
    notify_client: false,
    notify_manager: false,
    additional_recipients: [],
    is_active: true,
  });
  const [newRecipient, setNewRecipient] = useState('');

  const queryClient = useQueryClient();

  const [defaultsCreated, setDefaultsCreated] = useState(false);

  const { data: settings = [], isLoading, isSuccess } = useQuery({
    queryKey: ['reminderSettings'],
    queryFn: () => base44.entities.ReminderSettings.list(),
  });

  useEffect(() => {
    if (!isSuccess || settings.length > 0 || defaultsCreated) return;

    const defaults = [
      {
        reminder_type: 'project_deadline',
        days_before: 3,
        notify_assigned_member: true,
        notify_client: false,
        notify_manager: false,
        additional_recipients: [],
        is_active: true,
      },
      {
        reminder_type: 'communication_followup',
        days_after: 7,
        notify_assigned_member: true,
        notify_client: false,
        notify_manager: false,
        additional_recipients: [],
        is_active: true,
      },
    ];

    setDefaultsCreated(true);
    Promise.all(defaults.map(d => base44.entities.ReminderSettings.create(d)))
      .then(() => {
        queryClient.invalidateQueries(['reminderSettings']);
        toast.success('Default reminder settings have been created. You can customize them below.');
      });
  }, [isSuccess, settings.length, defaultsCreated]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReminderSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reminderSettings']);
      toast.success('Reminder setting created');
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReminderSettings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reminderSettings']);
      toast.success('Reminder setting updated');
      setShowDialog(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReminderSettings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['reminderSettings']);
      toast.success('Reminder setting deleted');
    },
  });

  const resetForm = () => {
    setFormData({
      reminder_type: 'project_deadline',
      days_before: 3,
      days_after: 7,
      notify_assigned_member: true,
      notify_client: false,
      notify_manager: false,
      additional_recipients: [],
      is_active: true,
    });
    setEditingSetting(null);
    setNewRecipient('');
  };

  const handleEdit = (setting) => {
    setEditingSetting(setting);
    setFormData({
      reminder_type: setting.reminder_type,
      days_before: setting.days_before || 3,
      days_after: setting.days_after || 7,
      notify_assigned_member: setting.notify_assigned_member,
      notify_client: setting.notify_client,
      notify_manager: setting.notify_manager,
      additional_recipients: setting.additional_recipients || [],
      is_active: setting.is_active,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (formData.reminder_type === 'project_deadline' && (!formData.days_before || formData.days_before < 0)) {
      toast.error('Please enter valid number of days before deadline');
      return;
    }
    
    if (formData.reminder_type === 'communication_followup' && (!formData.days_after || formData.days_after < 0)) {
      toast.error('Please enter valid number of days after last communication');
      return;
    }

    if (editingSetting) {
      updateMutation.mutate({ id: editingSetting.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addRecipient = () => {
    const email = newRecipient.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (!formData.additional_recipients.includes(email)) {
        setFormData({
          ...formData,
          additional_recipients: [...formData.additional_recipients, email]
        });
        setNewRecipient('');
      } else {
        toast.error('Email already added');
      }
    } else {
      toast.error('Please enter a valid email');
    }
  };

  const removeRecipient = (email) => {
    setFormData({
      ...formData,
      additional_recipients: formData.additional_recipients.filter(e => e !== email)
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automated Reminders</h1>
          <p className="text-gray-600 mt-1">Configure automated reminders for project deadlines and client followups</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Reminder
        </Button>
      </div>

      <div className="grid gap-4">
        {settings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No reminder settings configured yet</p>
              <Button onClick={() => setShowDialog(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create First Reminder
              </Button>
            </CardContent>
          </Card>
        ) : (
          settings.map(setting => (
            <Card key={setting.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {setting.reminder_type === 'project_deadline' ? (
                        <>
                          <Calendar className="w-5 h-5" />
                          {setting.days_before} Day{setting.days_before !== 1 ? 's' : ''} Before Project Deadline
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-5 h-5" />
                          {setting.days_after} Day{setting.days_after !== 1 ? 's' : ''} After Last Communication
                        </>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {setting.is_active ? (
                        <span className="text-green-600 font-medium">Active</span>
                      ) : (
                        <span className="text-gray-500">Inactive</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(setting)}>
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(setting.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Recipients:</span>
                    <div className="flex flex-wrap gap-1">
                      {setting.notify_assigned_member && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Assigned Team Member</span>
                      )}
                      {setting.notify_manager && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Client Manager</span>
                      )}
                      {setting.notify_client && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Client</span>
                      )}
                      {setting.additional_recipients?.map(email => (
                        <span key={email} className="px-2 py-1 bg-gray-100 text-gray-800 rounded">{email}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSetting ? 'Edit' : 'Add'} Reminder Setting</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reminder Type *</Label>
              <Select 
                value={formData.reminder_type} 
                onValueChange={(value) => setFormData({ ...formData, reminder_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project_deadline">Project Deadline</SelectItem>
                  <SelectItem value="communication_followup">Communication Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.reminder_type === 'project_deadline' && (
              <div className="space-y-2">
                <Label>Days Before Deadline *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.days_before}
                  onChange={(e) => setFormData({ ...formData, days_before: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 3"
                />
              </div>
            )}

            {formData.reminder_type === 'communication_followup' && (
              <div className="space-y-2">
                <Label>Days After Last Communication *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.days_after}
                  onChange={(e) => setFormData({ ...formData, days_after: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 7"
                />
                <p className="text-xs text-gray-500">Send reminder if no communication for this many days</p>
              </div>
            )}

            <div className="space-y-3">
              <Label>Notify</Label>
              {formData.reminder_type === 'project_deadline' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Assigned Team Member</span>
                  <Switch
                    checked={formData.notify_assigned_member}
                    onCheckedChange={(checked) => setFormData({ ...formData, notify_assigned_member: checked })}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm">Client Manager</span>
                <Switch
                  checked={formData.notify_manager}
                  onCheckedChange={(checked) => setFormData({ ...formData, notify_manager: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Client (via Email)</span>
                <Switch
                  checked={formData.notify_client}
                  onCheckedChange={(checked) => setFormData({ ...formData, notify_client: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Recipients</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                />
                <Button type="button" onClick={addRecipient} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.additional_recipients.map(email => (
                  <div key={email} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                    {email}
                    <button onClick={() => removeRecipient(email)} className="ml-1 text-gray-500 hover:text-red-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}