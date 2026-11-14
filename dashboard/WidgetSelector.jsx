import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BarChart3, Calendar, AlertTriangle, Activity, TrendingUp, Clock } from 'lucide-react';

const AVAILABLE_WIDGETS = [
  { id: 'projects_by_status', label: 'Projects by Status', icon: BarChart3 },
  { id: 'upcoming_deadlines', label: 'Upcoming Deadlines', icon: Calendar },
  { id: 'overdue_projects', label: 'Overdue Projects', icon: AlertTriangle },
  { id: 'recent_activity', label: 'Recent Activity', icon: Activity },
  { id: 'project_health', label: 'Project Health', icon: TrendingUp },
  { id: 'my_tasks', label: 'My Tasks', icon: Clock },
];

export default function WidgetSelector({ open, onClose, selectedWidgets, onSave }) {
  const [tempSelection, setTempSelection] = React.useState(selectedWidgets);

  React.useEffect(() => {
    setTempSelection(selectedWidgets);
  }, [selectedWidgets, open]);

  const toggleWidget = (widgetId) => {
    if (tempSelection.includes(widgetId)) {
      setTempSelection(tempSelection.filter(id => id !== widgetId));
    } else {
      setTempSelection([...tempSelection, widgetId]);
    }
  };

  const handleSave = () => {
    onSave(tempSelection);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize Dashboard Widgets</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {AVAILABLE_WIDGETS.map((widget) => {
            const Icon = widget.icon;
            return (
              <div key={widget.id} className="flex items-center space-x-3">
                <Checkbox
                  id={widget.id}
                  checked={tempSelection.includes(widget.id)}
                  onCheckedChange={() => toggleWidget(widget.id)}
                />
                <Label
                  htmlFor={widget.id}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Icon className="w-4 h-4 text-gray-600" />
                  {widget.label}
                </Label>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}