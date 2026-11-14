import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import MessageBubble from '../agents/MessageBubble';

export default function ProjectAssistantDialog({ open, onOpenChange }) {
  const [conversation, setConversation] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !conversation) {
      initConversation();
    }
  }, [open]);

  useEffect(() => {
    if (!conversation) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });

    return () => unsubscribe();
  }, [conversation]);

  const initConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'project_assistant',
        metadata: {
          name: 'Project Management Session',
          description: 'AI-powered project analysis and recommendations'
        }
      });
      setConversation(conv);
      
      // Send initial message
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: 'Hello! Please analyze my current projects and provide a summary of their status, any risks you identify, and your recommendations.'
      });
    } catch (error) {
      toast.error('Failed to start project assistant');
      console.error(error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !conversation || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Project Assistant
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-[400px]">
          {messages.length === 0 && !loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                <p className="text-sm">Analyzing your projects...</p>
              </div>
            </div>
          ) : (
            messages.map((message, idx) => (
              <MessageBubble key={idx} message={message} />
            ))
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about projects, risks, or next steps..."
            disabled={loading || !conversation}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading || !conversation}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}