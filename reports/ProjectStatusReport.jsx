import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import ExportReportButton from './ExportReportButton';

const statusColors = {
  'not_started': 'bg-gray-100 text-gray-800',
  'in_progress': 'bg-blue-100 text-blue-800',
  'waiting': 'bg-yellow-100 text-yellow-800',
  'on_hold': 'bg-orange-100 text-orange-800',
  'completed': 'bg-green-100 text-green-800',
};

export default function ProjectStatusReport({ projects, clients, users = [], filters = {} }) {
  const navigate = useNavigate();

  const getProjectCreator = (createdBy) => {
    const user = users.find(u => u.email === createdBy);
    return user?.display_name || user?.full_name || createdBy || 'Unknown';
  };

  const handleDoubleClick = (project) => {
    navigate(createPageUrl('Projects') + `?editProject=${project.id}`);
  };

  const filteredProjects = projects.filter((project) => {
    if (filters.clients?.length > 0 && !filters.clients.includes(project.client_id)) return false;
    if (filters.statuses?.length > 0 && !filters.statuses.includes(project.status)) return false;
    if (filters.assignedTos?.length > 0 && !filters.assignedTos.includes(project.assigned_to_id)) return false;

    if (filters.dueDateFrom || filters.dueDateTo) {
      const dueDate = project.due_date ? new Date(project.due_date) : null;
      if (!dueDate) return false;
      if (filters.dueDateFrom && dueDate < new Date(filters.dueDateFrom)) return false;
      if (filters.dueDateTo) {
        const toDate = new Date(filters.dueDateTo);
        toDate.setHours(23, 59, 59);
        if (dueDate > toDate) return false;
      }
    }

    return true;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (!a.due_date || !b.due_date) return 0;
    return new Date(a.due_date) - new Date(b.due_date);
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Status Report</CardTitle>
          <ExportReportButton 
            reportData={filteredProjects} 
            reportTitle="Project Status Report" 
            reportType="projects"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Project</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Client</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Due Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Project Manager</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Assigned To</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500">
                    No projects found
                  </td>
                </tr>
              ) : (
                sortedProjects.map((project) => {
                  const dueDate = project.due_date ? new Date(project.due_date) : null;
                  const isOverdue = dueDate && dueDate < new Date() && project.status !== 'completed';

                  return (
                    <tr key={project.id} className="border-b hover:bg-gray-50 cursor-pointer" onDoubleClick={() => handleDoubleClick(project)}>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {project.project_type?.replace(/_/g, ' ') || 'Unnamed Project'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{project.client_name}</td>
                      <td className="py-3 px-4 text-gray-700">
                        <div className="flex items-center gap-2">
                          {dueDate && format(dueDate, 'MMM d, yyyy')}
                          {isOverdue && (
                            <AlertCircle className="w-4 h-4 text-red-500" title="Overdue" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{getProjectCreator(project.created_by)}</td>
                      <td className="py-3 px-4 text-gray-700">{project.assigned_to_name || 'Unassigned'}</td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[project.status] || 'bg-gray-100 text-gray-800'}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}