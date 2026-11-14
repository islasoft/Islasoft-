import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function TeamChat({ currentUser, users }) {
  const [message, setMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('general');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['teamMessages', selectedChannel],
    queryFn: () => base44.entities.TeamMessage.filter(
      { channel: selectedChannel },
      '-created_date',
      50
    ),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const newMessage = await base44.entities.TeamMessage.create(data);
      
      // Send notifications to mentioned users
      if (data.mentions && data.mentions.length > 0) {
        const notifications = data.mentions.map(userId => ({
          user_id: userId,
          user_email: users.find(u => u.id === userId)?.email,
          type: 'message_received',
          title: `${currentUser.full_name} mentioned you in #${selectedChannel}`,
          message: data.content.substring(0, 100),
          priority: 'medium',
        }));
        await base44.entities.Notification.bulkCreate(notifications);
      }
      
      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teamMessages', selectedChannel]);
      setMessage('');
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;

    // Extract mentions
    const mentionRegex = /@(\w+\s*\w*)/g;
    const matches = message.matchAll(mentionRegex);
    const mentionedUserIds = [];
    
    for (const match of matches) {
      const name = match[1].trim();
      const user = users.find(u => u.full_name.toLowerCase().includes(name.toLowerCase()));
      if (user) mentionedUserIds.push(user.id);
    }

    sendMutation.mutate({
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      channel: selectedChannel,
      content: message,
      mentions: mentionedUserIds,
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Team Chat
          </CardTitle>
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  general
                </div>
              </SelectItem>
              <SelectItem value="projects">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  projects
                </div>
              </SelectItem>
              <SelectItem value="urgent">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  urgent
                </div>
              </SelectItem>
              <SelectItem value="announcements">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  announcements
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-auto space-y-3 mb-4">
          {messages.slice().reverse().map(msg => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg ${
                msg.sender_id === currentUser.id
                  ? 'bg-blue-50 ml-12'
                  : 'bg-gray-50 mr-12'
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="font-medium text-sm">{msg.sender_name}</p>
                <p className="text-xs text-gray-500">
                  {format(parseISO(msg.created_date), 'h:mm a')}
                </p>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder={`Message #${selectedChannel}... Use @name to mention`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={!message.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}