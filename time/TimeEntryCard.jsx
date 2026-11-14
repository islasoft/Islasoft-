import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Play, Square, Edit, Save, X, Trash2 } from 'lucide-react';
import LiveTimerClock from './LiveTimerClock';

function isBeforeMidnightToday() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  return now <= midnight;
}

export default function TimeEntryCard({ entry, canEdit, onResume, onStop, onUpdate, onDelete, currentUser, allProjects = [] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    hours: entry.hours || 0,
    description: entry.description || '',
  });

  const isAdmin = currentUser?.role === 'admin';

  // After release (submitted=true): only admin can edit
  // Before release: anyone can edit (unless invoiced — admin only)
  const canEditEntry = entry.submitted
    ? isAdmin
    : (!entry.invoiced || isAdmin);

  const handleSave = () => {
    const hours = parseFloat(editData.hours);
    onUpdate({
      ...entry,
      hours,
      description: editData.description,
      timer_accumulated: hours * 3600,
      timer_start: null, // clear running timer when saving explicit hours
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({ hours: entry.hours || 0, description: entry.description || '' });
    setIsEditing(false);
  };

  if (isEditing && canEditEntry) {
    return (
      <div className="border rounded-lg p-4 bg-blue-50">
        <p className="font-medium mb-3">{entry.project_name}</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Hours</label>
            <Input
              type="number"
              step="0.25"
              value={editData.hours}
              onChange={(e) => setEditData({ ...editData, hours: e.target.value })}
              className="w-32"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Description</label>
            <Textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Detect issues
  const hasInvalidProjectId = entry.project_id && 
    allProjects.length > 0 && 
    !allProjects.find(p => p.id === entry.project_id);
  const isMissingHours = !entry.hours || entry.hours <= 0;
  const isMissingProject = !entry.project_id && !entry.project_name;
  const isMissingClient = !entry.client_id && !entry.client_name;
  const isStuckTimer = entry.timer_start && isMissingHours && !entry.timer_accumulated;
  const hasIssue = hasInvalidProjectId || isMissingHours || isMissingProject || isMissingClient || isStuckTimer;

  const issueMessages = [];
  if (isStuckTimer) issueMessages.push('Stuck timer — hours not recorded');
  else if (isMissingHours) issueMessages.push('Missing hours — please edit and enter time');
  if (isMissingProject) issueMessages.push('Missing project');
  if (isMissingClient) issueMessages.push('Missing client');
  if (hasInvalidProjectId) issueMessages.push('Invalid project — please reselect');

  return (
    <div className={`border rounded-lg p-4 ${hasIssue ? 'border-orange-400 bg-orange-50' : ''}`}>
      {issueMessages.length > 0 && (
        <div className="text-xs text-orange-700 font-medium mb-2 space-y-0.5">
          {issueMessages.map((msg, i) => <div key={i}>⚠️ {msg}</div>)}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium">{entry.project_name}</p>
          <p className="text-sm text-gray-600">{entry.description || 'No description'}</p>
          {entry.invoiced && currentUser?.role !== 'admin' && (
            <p className="text-xs text-orange-600 font-medium mt-1">🔒 Invoiced — cannot edit</p>
          )}
          {entry.invoiced && currentUser?.role === 'admin' && (
            <p className="text-xs text-blue-600 font-medium mt-1">ℹ️ Invoiced — admin can edit</p>
          )}
          {!canEditEntry && !entry.invoiced && entry.submitted && (
            <p className="text-xs text-slate-400 mt-1">🔒 Released — only admin can edit</p>
          )}
        </div>
        <div className="text-right flex items-center gap-3">
          {/* Live clock if running, else static hours */}
          {entry.timer_start ? (
            <LiveTimerClock entry={entry} className="text-2xl text-red-600" />
          ) : (
            <p className="text-2xl font-mono font-bold">
              {entry.hours > 0 ? `${entry.hours.toFixed(2)}h` : '0.00h'}
            </p>
          )}

          {canEditEntry && (
            <div className="flex flex-col gap-1">
              {/* Running timer: show Stop button */}
              {entry.timer_start && onStop && (
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => onStop(entry)}>
                  <Square className="w-3 h-3 mr-1" />
                  Stop
                </Button>
              )}
              {/* Paused timer: show Resume */}
              {!entry.timer_start && entry.timer_accumulated > 0 && !(entry.hours > 0) && (
                <Button size="sm" variant="outline" onClick={() => onResume(entry)}>
                  <Play className="w-3 h-3 mr-1" />
                  Resume
                </Button>
              )}
              {!entry.timer_start && (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && !entry.timer_start && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { if (confirm('Delete this time entry?')) onDelete(entry.id); }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}