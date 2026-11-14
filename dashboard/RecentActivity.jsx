import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, FolderKanban, Clock, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function RecentActivity({ projects, timeEntries, invoices }) {
  const activities = [];

  // Recent projects
  projects.slice(0, 3).forEach(p => {
    activities.push({
      type: 'project',
      icon: FolderKanban,
      text: `Project created: ${p.project_type}`,
      subtext: p.client_name,
      date: p.created_date,
    });
  });

  // Recent time entries
  timeEntries.slice(0, 3).forEach(t => {
    activities.push({
      type: 'time',
      icon: Clock,
      text: `${t.hours}h logged on ${t.project_name}`,
      subtext: t.staff_name,
      date: t.created_date,
    });
  });

  // Recent invoices
  invoices.slice(0, 2).forEach(inv => {
    activities.push({
      type: 'invoice',
      icon: FileText,
      text: `Invoice #${inv.invoice_number} ${inv.status}`,
      subtext: inv.client_name,
      date: inv.created_date,
    });
  });

  const sortedActivities = activities
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedActivities.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {sortedActivities.map((activity, idx) => {
              const Icon = activity.icon;
              return (
                <div key={idx} className="flex items-start gap-3 p-2">
                  <div className="bg-gray-100 p-2 rounded">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                    <p className="text-xs text-gray-500">{activity.subtext}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(parseISO(activity.date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}