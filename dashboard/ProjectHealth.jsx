import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function ProjectHealth({ projects, messages, emailTracking }) {
  const today = new Date();

  const projectHealthData = projects
    .filter(p => p.status !== 'completed')
    .map(project => {
      let healthScore = 100;
      let healthStatus = 'good';
      let issues = [];

      // Check deadline
      if (project.due_date) {
        const daysUntilDue = differenceInDays(parseISO(project.due_date), today);
        if (daysUntilDue < 0) {
          healthScore -= 40;
          healthStatus = 'critical';
          issues.push(`${Math.abs(daysUntilDue)}d overdue`);
        } else if (daysUntilDue <= 3) {
          healthScore -= 20;
          healthStatus = healthStatus === 'good' ? 'warning' : healthStatus;
          issues.push(`Due in ${daysUntilDue}d`);
        }
      }

      // Check communication
      const projectMessages = messages.filter(m => m.client_id === project.client_id);
      const projectEmails = emailTracking.filter(e => e.client_id === project.client_id);
      
      let lastCommDate = null;
      if (projectMessages.length > 0) {
        lastCommDate = new Date(projectMessages[0].created_date);
      }
      if (projectEmails.length > 0) {
        const emailDate = new Date(projectEmails[0].sent_date);
        if (!lastCommDate || emailDate > lastCommDate) {
          lastCommDate = emailDate;
        }
      }

      if (lastCommDate) {
        const daysSinceComm = differenceInDays(today, lastCommDate);
        if (daysSinceComm > 14) {
          healthScore -= 30;
          healthStatus = healthStatus === 'good' ? 'warning' : healthStatus;
          issues.push(`${daysSinceComm}d since last comm`);
        } else if (daysSinceComm > 7) {
          healthScore -= 15;
          if (healthStatus === 'good') healthStatus = 'warning';
        }
      } else if (project.status === 'in_progress') {
        healthScore -= 25;
        if (healthStatus === 'good') healthStatus = 'warning';
        issues.push('No communication logged');
      }

      return {
        ...project,
        healthScore: Math.max(0, healthScore),
        healthStatus,
        issues,
      };
    })
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Project Health Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {projectHealthData.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">No active projects</p>
        ) : (
          <div className="space-y-3">
            {projectHealthData.map((project) => (
              <Link key={project.id} to={createPageUrl('Projects')}>
                <div className={`p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                  project.healthStatus === 'critical' ? 'border-red-200 bg-red-50' :
                  project.healthStatus === 'warning' ? 'border-orange-200 bg-orange-50' :
                  'border-green-200 bg-green-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {project.healthStatus === 'critical' ? (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        ) : project.healthStatus === 'warning' ? (
                          <Clock className="w-4 h-4 text-orange-600" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        <p className="font-medium text-sm">{project.project_type}</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{project.client_name}</p>
                      {project.issues.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {project.issues.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className={`text-xs font-bold ${
                      project.healthStatus === 'critical' ? 'text-red-700' :
                      project.healthStatus === 'warning' ? 'text-orange-700' :
                      'text-green-700'
                    }`}>
                      {project.healthScore}%
                    </div>
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