import React from 'react';

const STATUS_CONFIG = {
  // Project / Task statuses
  active: { label: 'Active', classes: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', classes: 'bg-emerald-100 text-emerald-700' },
  paid: { label: 'Paid', classes: 'bg-emerald-100 text-emerald-700' },
  signed: { label: 'Signed', classes: 'bg-emerald-100 text-emerald-700' },

  in_progress: { label: 'In Progress', classes: 'bg-sky-100 text-sky-700' },
  sent: { label: 'Sent', classes: 'bg-sky-100 text-sky-700' },
  pending: { label: 'Pending', classes: 'bg-amber-100 text-amber-700' },
  on_hold: { label: 'On Hold', classes: 'bg-amber-100 text-amber-700' },
  waiting: { label: 'Waiting', classes: 'bg-amber-100 text-amber-700' },

  overdue: { label: 'Overdue', classes: 'bg-rose-100 text-rose-700' },
  urgent: { label: 'Urgent', classes: 'bg-rose-100 text-rose-700' },
  cancelled: { label: 'Cancelled', classes: 'bg-rose-100 text-rose-700' },
  terminated: { label: 'Terminated', classes: 'bg-rose-100 text-rose-700' },

  not_started: { label: 'Not Started', classes: 'bg-slate-100 text-slate-600' },
  draft: { label: 'Draft', classes: 'bg-slate-100 text-slate-600' },
  inactive: { label: 'Inactive', classes: 'bg-slate-100 text-slate-600' },
  expired: { label: 'Expired', classes: 'bg-slate-100 text-slate-600' },

  // Priority
  low: { label: 'Low', classes: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', classes: 'bg-sky-100 text-sky-700' },
  high: { label: 'High', classes: 'bg-amber-100 text-amber-700' },

  // Misc
  todo: { label: 'To Do', classes: 'bg-slate-100 text-slate-600' },
};

export default function StatusBadge({ status, label, className = '' }) {
  if (!status) return null;
  const config = STATUS_CONFIG[status] || { label: status, classes: 'bg-slate-100 text-slate-600' };
  const displayLabel = label || config.label || status.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.classes} ${className}`}>
      {displayLabel}
    </span>
  );
}