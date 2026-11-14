import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Clock, CheckCircle, Eye, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientCommunicationHistory({ clientId }) {
  const { data: emails = [] } = useQuery({
    queryKey: ['emailTracking', clientId],
    queryFn: () => base44.entities.EmailTracking.filter({ client_id: clientId }, '-sent_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', clientId],
    queryFn: () => base44.entities.Message.filter({ client_id: clientId }, '-created_date'),
  });

  const statusConfig = {
    sent: { icon: Clock, color: 'bg-blue-600', label: 'Sent' },
    delivered: { icon: CheckCircle, color: 'bg-green-600', label: 'Delivered' },
    opened: { icon: Eye, color: 'bg-purple-600', label: 'Opened' },
    failed: { icon: XCircle, color: 'bg-red-600', label: 'Failed' },
  };

  // Combine and sort all communications
  const allCommunications = [
    ...emails.map(e => ({ ...e, type: 'email', date: e.sent_date })),
    ...messages.map(m => ({ ...m, type: 'message', date: m.created_date })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Communication History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allCommunications.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No communication history</p>
        ) : (
          <div className="space-y-3">
            {allCommunications.map((comm, idx) => (
              <div key={`${comm.type}-${comm.id || idx}`} className="border rounded-lg p-4">
                {comm.type === 'email' ? (
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <Badge className={statusConfig[comm.status]?.color || 'bg-gray-600'}>
                          {statusConfig[comm.status]?.label || comm.status}
                        </Badge>
                        <Badge variant="outline">{comm.email_type?.replace(/_/g, ' ')}</Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comm.date), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <h4 className="font-semibold mb-1">{comm.subject}</h4>
                    <div className="text-sm text-gray-600">
                      <p>To: {comm.recipient_email}</p>
                      <p>Sent by: {comm.sent_by_name}</p>
                      {comm.opened_date && (
                        <p className="text-purple-600">
                          Opened: {format(new Date(comm.opened_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                        <Badge variant={comm.is_internal ? 'secondary' : 'default'}>
                          {comm.is_internal ? 'Internal Note' : 'Client Message'}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comm.date), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <h4 className="font-semibold mb-1">{comm.subject}</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comm.content}</p>
                    <p className="text-sm text-gray-600 mt-2">From: {comm.sender_name}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}