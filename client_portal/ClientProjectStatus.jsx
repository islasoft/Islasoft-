import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FolderKanban } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientProjectStatus({ clientId, simpleView = false }) {
  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['clientProjects', clientId],
    queryFn: () => base44.entities.Project.filter({ client_id: clientId }, '-due_date'),
    enabled: !!clientId,
  });

  if (isLoading) {
    return <p className="text-center text-gray-500 py-4">Loading projects...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4">Error loading projects.</p>;
  }

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    waiting: 'bg-yellow-100 text-yellow-800',
    on_hold: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
  };

  const filteredProjects = simpleView ? projects.slice(0, 3) : projects;

  return (
    <Card className={simpleView ? '' : 'mt-6'}>
      <CardHeader>
        <CardTitle>{simpleView ? "Recent Projects" : "Your Projects"}</CardTitle>
      </CardHeader>
      <CardContent>
        {filteredProjects.length === 0 ? (
          <p className="text-gray-500">No projects found for your account.</p>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map(project => (
              <div key={project.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold">
                    {project.description || project.project_type?.replace(/_/g, ' ') || 'Unnamed Project'}
                  </h3>
                  <Badge className={statusColors[project.status] || 'bg-gray-100 text-gray-800'}>
                    {project.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2 capitalize">
                  {project.project_category?.replace(/_/g, ' ')}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {project.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {format(new Date(project.due_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {project.assigned_to_name && (
                    <div className="flex items-center gap-1">
                      <FolderKanban className="w-4 h-4" />
                      <span>Assigned to: {project.assigned_to_name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}