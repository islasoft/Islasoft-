import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AutomatedReminderSettings() {
  const [settings, setSettings] = useState({
    enabled: false,
    preDueReminder: {
      enabled: true,
      daysBeforeDue: 3
    },
    firstReminder: {
      enabled: true,
      daysAfterDue: 1
    },
    secondReminder: {
      enabled: true,
      daysAfterDue: 7
    },
    finalReminder: {
      enabled: true,
      daysAfterDue: 14
    }
  });

  const handleSave = () => {
    // In a real implementation, this would save to user preferences or app settings
    localStorage.setItem('invoiceReminderSettings', JSON.stringify(settings));
    toast.success('Reminder settings saved successfully!');
  };

  // Load settings on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('invoiceReminderSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Automated Reminder Settings
            </CardTitle>
            <CardDescription className="mt-2">
              Configure automated email reminders for unpaid invoices
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="masterSwitch">Enable Automation</Label>
            <Switch
              id="masterSwitch"
              checked={settings.enabled}
              onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Alert */}
        <div className={`flex items-center gap-3 p-4 rounded-lg ${
          settings.enabled ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-800'
        }`}>
          {settings.enabled ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Automated reminders are active</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Automated reminders are disabled</span>
            </>
          )}
        </div>

        {/* Pre-Due Reminder */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.preDueReminder.enabled}
                onCheckedChange={(enabled) => 
                  setSettings({
                    ...settings,
                    preDueReminder: { ...settings.preDueReminder, enabled }
                  })
                }
                disabled={!settings.enabled}
              />
              <div>
                <Label className="text-base font-semibold">Pre-Due Reminder</Label>
                <p className="text-sm text-gray-600">Send before invoice is due</p>
              </div>
            </div>
            <Badge variant="secondary">Before Due Date</Badge>
          </div>
          <div className="flex items-center gap-2 ml-11">
            <Label htmlFor="preDueDays" className="text-sm">Send</Label>
            <Input
              id="preDueDays"
              type="number"
              min="1"
              max="30"
              value={settings.preDueReminder.daysBeforeDue}
              onChange={(e) => 
                setSettings({
                  ...settings,
                  preDueReminder: { 
                    ...settings.preDueReminder, 
                    daysBeforeDue: parseInt(e.target.value) || 3 
                  }
                })
              }
              className="w-20"
              disabled={!settings.enabled || !settings.preDueReminder.enabled}
            />
            <Label className="text-sm">days before due date</Label>
          </div>
        </div>

        {/* First Reminder */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.firstReminder.enabled}
                onCheckedChange={(enabled) => 
                  setSettings({
                    ...settings,
                    firstReminder: { ...settings.firstReminder, enabled }
                  })
                }
                disabled={!settings.enabled}
              />
              <div>
                <Label className="text-base font-semibold">First Reminder</Label>
                <p className="text-sm text-gray-600">Gentle reminder after due date</p>
              </div>
            </div>
            <Badge variant="secondary">After Due Date</Badge>
          </div>
          <div className="flex items-center gap-2 ml-11">
            <Label htmlFor="firstReminderDays" className="text-sm">Send</Label>
            <Input
              id="firstReminderDays"
              type="number"
              min="1"
              max="30"
              value={settings.firstReminder.daysAfterDue}
              onChange={(e) => 
                setSettings({
                  ...settings,
                  firstReminder: { 
                    ...settings.firstReminder, 
                    daysAfterDue: parseInt(e.target.value) || 1 
                  }
                })
              }
              className="w-20"
              disabled={!settings.enabled || !settings.firstReminder.enabled}
            />
            <Label className="text-sm">days after due date</Label>
          </div>
        </div>

        {/* Second Reminder */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.secondReminder.enabled}
                onCheckedChange={(enabled) => 
                  setSettings({
                    ...settings,
                    secondReminder: { ...settings.secondReminder, enabled }
                  })
                }
                disabled={!settings.enabled}
              />
              <div>
                <Label className="text-base font-semibold">Second Reminder</Label>
                <p className="text-sm text-gray-600">Follow-up reminder</p>
              </div>
            </div>
            <Badge variant="secondary">After Due Date</Badge>
          </div>
          <div className="flex items-center gap-2 ml-11">
            <Label htmlFor="secondReminderDays" className="text-sm">Send</Label>
            <Input
              id="secondReminderDays"
              type="number"
              min="1"
              max="30"
              value={settings.secondReminder.daysAfterDue}
              onChange={(e) => 
                setSettings({
                  ...settings,
                  secondReminder: { 
                    ...settings.secondReminder, 
                    daysAfterDue: parseInt(e.target.value) || 7 
                  }
                })
              }
              className="w-20"
              disabled={!settings.enabled || !settings.secondReminder.enabled}
            />
            <Label className="text-sm">days after due date</Label>
          </div>
        </div>

        {/* Final Notice */}
        <div className="space-y-3 p-4 border rounded-lg border-orange-300 bg-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.finalReminder.enabled}
                onCheckedChange={(enabled) => 
                  setSettings({
                    ...settings,
                    finalReminder: { ...settings.finalReminder, enabled }
                  })
                }
                disabled={!settings.enabled}
              />
              <div>
                <Label className="text-base font-semibold">Final Notice</Label>
                <p className="text-sm text-gray-600">Last reminder before escalation</p>
              </div>
            </div>
            <Badge variant="destructive">Final Notice</Badge>
          </div>
          <div className="flex items-center gap-2 ml-11">
            <Label htmlFor="finalReminderDays" className="text-sm">Send</Label>
            <Input
              id="finalReminderDays"
              type="number"
              min="1"
              max="60"
              value={settings.finalReminder.daysAfterDue}
              onChange={(e) => 
                setSettings({
                  ...settings,
                  finalReminder: { 
                    ...settings.finalReminder, 
                    daysAfterDue: parseInt(e.target.value) || 14 
                  }
                })
              }
              className="w-20"
              disabled={!settings.enabled || !settings.finalReminder.enabled}
            />
            <Label className="text-sm">days after due date</Label>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 p-4 rounded-lg text-sm">
          <p className="font-medium text-blue-900 mb-2">📌 How it works:</p>
          <ul className="space-y-1 text-blue-800">
            <li>• Automated reminders are checked daily</li>
            <li>• Reminders are only sent to invoices with status "sent" or "overdue"</li>
            <li>• Each reminder type is sent only once per invoice</li>
            <li>• You can manually send reminders anytime from the invoice actions</li>
            <li>• Paid and cancelled invoices are automatically excluded</li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}