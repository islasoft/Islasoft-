import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function InternalMessaging({ clients }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [newMessage, setNewMessage] = useState({ subject: '', content: '' });
  const [showNewMessage, setShowNewMessage] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedClientId],
    queryFn: () => {
      if (!selectedClientId) return [];
      return base44.entities.Message.filter({ client_id: selectedClientId, is_internal: true }, '-created_date');
    },
    enabled: !!selectedClientId,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const client = clients.find(c => c.id === selectedClientId);
      return base44.entities.Message.create({
        ...data,
        client_id: selectedClientId,
        client_name: client?.company_name,
        sender_id: currentUser?.id,
        sender_name: currentUser?.full_name,
        is_internal: true,
        read_by: [currentUser?.id],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setNewMessage({ subject: '', content: '' });
      setShowNewMessage(false);
      toast.success('Message sent');
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      const message = messages.find(m => m.id === messageId);
      if (!message.read_by?.includes(currentUser?.id)) {
        return base44.entities.Message.update(messageId, {
          read_by: [...(message.read_by || []), currentUser?.id],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const handleSend = () => {
    if (!newMessage.subject || !newMessage.content) {
      toast.error('Please enter subject and message');
      return;
    }
    createMutation.mutate(newMessage);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Client Selection */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Select Client</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedClient && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedClient.company_name}</p>
              <p className="text-sm text-gray-600">{selectedClient.contact_person}</p>
              <p className="text-sm text-gray-600">{selectedClient.email}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages Thread */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Internal Team Messages</CardTitle>
            {selectedClientId && (
              <Button size="sm" onClick={() => setShowNewMessage(!showNewMessage)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                New Message
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedClientId ? (
            <p className="text-center text-gray-500 py-8">Select a client to view messages</p>
          ) : (
            <>
              {showNewMessage && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6 space-y-3">
                    <Input
                      placeholder="Subject"
                      value={newMessage.subject}
                      onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    />
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage.content}
                      onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSend} disabled={createMutation.isPending}>
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewMessage(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No messages yet</p>
                ) : (
                  messages.map(message => {
                    const isUnread = !message.read_by?.includes(currentUser?.id);
                    return (
                      <Card
                        key={message.id}
                        className={isUnread ? 'border-blue-300 bg-blue-50' : ''}
                        onClick={() => isUnread && markAsReadMutation.mutate(message.id)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{message.sender_name}</span>
                              {isUnread && <Badge variant="default">New</Badge>}
                            </div>
                            <span className="text-xs text-gray-500">
                              {format(new Date(message.created_date), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          <h4 className="font-semibold mb-2">{message.subject}</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}