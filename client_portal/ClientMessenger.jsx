import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ClientMessenger({ clientId, clientName }) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['clientMessages', clientId],
    queryFn: () => base44.entities.ClientMessage.filter({ client_id: clientId }, 'created_date'),
    enabled: !!clientId,
  });

  const createMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.ClientMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientMessages'] });
      setNewMessage('');
    },
    onError: (err) => {
      toast.error('Failed to send message.');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !currentUser) return;

    createMessageMutation.mutate({
      client_id: clientId,
      client_name: clientName,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      sender_type: 'client',
      recipient_id: null,
      recipient_name: null,
      content: newMessage,
    });
  };

  if (isLoading) {
    return <p className="text-center text-gray-500 py-4">Loading messages...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4">Error loading messages.</p>;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Secure Messenger</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px] overflow-y-auto space-y-4 p-4 border-b">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquare className="w-12 h-12 mb-2" />
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col max-w-[70%] ${msg.sender_type === 'client' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2 rounded-lg ${
                  msg.sender_type === 'client' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {msg.sender_name} - {format(new Date(msg.created_date), 'MMM d, hh:mm a')}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="pt-4">
        <div className="flex w-full space-x-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim() || createMessageMutation.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}