import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function TimeEntryList({ entries, isLoading, onEdit, onDelete, currentUser }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-500">Loading time entries...</p>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No time entries yet</p>
          <p className="text-sm text-gray-400 mt-1">Start tracking your hours by adding a time entry</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Time Entries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry) => {
            const missingHours = !entry.hours || entry.hours === 0;
            const missingProject = !entry.project_name && !entry.project_id;
            const missingClient = !entry.client_name && !entry.client_id;
            const isIncomplete = missingHours || missingProject || missingClient;

            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  isIncomplete
                    ? 'border-amber-400 bg-amber-50 hover:bg-amber-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    {isIncomplete && (
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                    <h3 className="font-medium text-gray-900">
                      {entry.project_name || <span className="text-amber-600 italic">No project</span>}
                    </h3>
                    {entry.billable && (
                      <Badge className="bg-green-100 text-green-800">Billable</Badge>
                    )}
                    {entry.invoiced && (
                      <Badge className="bg-blue-100 text-blue-800">Invoiced</Badge>
                    )}
                    {isIncomplete && (
                      <Badge className="bg-amber-100 text-amber-800 border border-amber-300">Incomplete</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {entry.client_name || <span className="text-amber-600 italic">No client</span>}
                  </p>
                  {entry.description && (
                    <p className="text-sm text-gray-500 mt-1">{entry.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                    <span className={`flex items-center gap-1 ${missingHours ? 'text-amber-600 font-medium' : ''}`}>
                      <Clock className="w-3 h-3" />
                      {missingHours ? 'No hours recorded' : `${entry.hours} hours`}
                    </span>
                  </div>
                  {isIncomplete && (
                    <p className="text-xs text-amber-700 mt-1 font-medium">
                      ⚠ Needs attention: {[
                        missingHours && 'missing hours',
                        missingProject && 'missing project',
                        missingClient && 'missing client',
                      ].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(entry)}
                    disabled={entry.invoiced && currentUser?.role !== 'admin'}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Delete this time entry?')) {
                        onDelete(entry.id);
                      }
                    }}
                    disabled={entry.invoiced && currentUser?.role !== 'admin'}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}