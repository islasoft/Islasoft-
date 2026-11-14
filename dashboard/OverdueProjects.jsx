import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function OverdueProjects({ projects }) {
  const today = new Date();
  
  const overdueProjects = projects
    .filter(p => p.due_date && p.status !== 'completed')
    .map(p => ({
      ...p,
      daysOverdue: differenceInDays(today, parseISO(p.due_date)),
    }))
    .filter(p => p.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          Overdue Projects
        </CardTitle>
      </CardHeader>
      <CardContent>
        {overdueProjects.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">No overdue projects</p>
        ) : (
          <div className="space-y-3">
            {overdueProjects.map((project) => (
              <Link key={project.id} to={createPageUrl('Projects')}>
                <div className="flex items-start justify-between p-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{project.project_type}</p>
                    <p className="text-xs text-gray-500">{project.client_name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Due: {format(parseISO(project.due_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">
                    {project.daysOverdue}d overdue
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}