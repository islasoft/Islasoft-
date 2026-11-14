import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { PenLine, Send, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG = {
  draft:          { label: 'Draft',            color: 'bg-gray-100 text-gray-600',      icon: Clock },
  pending_review: { label: 'Pending Review',   color: 'bg-amber-100 text-amber-700',    icon: Clock },
  approved:       { label: 'Approved',         color: 'bg-green-100 text-green-700',    icon: CheckCircle2 },
  sent:           { label: 'Awaiting Sig.',    color: 'bg-blue-100 text-blue-700',      icon: Send },
  signed:         { label: 'Signed ✓',         color: 'bg-emerald-100 text-emerald-700',icon: PenLine },
  declined:       { label: 'Declined',         color: 'bg-red-100 text-red-700',        icon: AlertTriangle },
};

/**
 * Fetches the latest engagement letter for a client and shows a compact status badge.
 * Only shows a badge if a letter exists (returns null otherwise).
 */
export default function SignatureStatusBadge({ clientId }) {
  const { data: letters } = useQuery({
    queryKey: ['engagementLetters', clientId],
    queryFn: () => base44.entities.EngagementLetter.filter({ client_id: clientId }, '-created_date', 1),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const latest = letters?.[0];
  if (!latest) return null;

  const cfg = STATUS_CONFIG[latest.status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}
      title={`Engagement Letter: ${cfg.label}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}