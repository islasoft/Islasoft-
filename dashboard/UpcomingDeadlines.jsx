import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertCircle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function UpcomingDeadlines({ projects }) {
  const today = new Date();
  
  const upcomingProjects = projects
    .filter(p => p.due_date && p.status !== 'completed')
    .map(p => ({
      ...p,
      daysUntil: differenceInDays(parseISO(p.due_date), today),
    }))
    .filter(p => p.daysUntil >= 0 && p.daysUntil <= 14)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Deadlines (Next 14 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingProjects.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">No upcoming deadlines</p>
        ) : (
          <div className="space-y-3">
            {upcomingProjects.map((project) => (
              <Link key={project.id} to={createPageUrl('Projects')}>
                <div className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{project.project_type}</p>
                    <p className="text-xs text-gray-500">{project.client_name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(parseISO(project.due_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    project.daysUntil <= 3 ? 'bg-red-100 text-red-700' :
                    project.daysUntil <= 7 ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {project.daysUntil === 0 ? 'Today' : 
                     project.daysUntil === 1 ? 'Tomorrow' : 
                     `${project.daysUntil}d`}
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