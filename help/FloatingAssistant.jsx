import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2, X, Minimize2, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Init conversation on first open
  useEffect(() => {
    if (open && !conversation) {
      base44.agents.createConversation({
        agent_name: 'app_guide',
        metadata: { name: 'App Guide' }
      }).then(conv => {
        setConversation(conv);
        setMessages([]);
      });
    }
    if (open) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      setIsLoading(false);
      if (!open) setUnreadCount(n => n + 1);
    });
    return () => unsubscribe();
  }, [conversation?.id, open]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conversation || isLoading) return;
    const text = input.trim();
    setInput('');
    setIsLoading(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: text });
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat window */}
      {open && (
        <div className={`bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-200 ${minimized ? 'h-14 w-80 overflow-hidden' : 'w-80 sm:w-96 h-[520px]'}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-sky-600 to-sky-500 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Isla</p>
                <p className="text-sky-200 text-xs leading-tight">App Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(m => !m)}
                className="text-white/70 hover:text-white p-1 rounded transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {messages.length === 0 && (
                  <div className="text-center py-6 text-slate-500">
                    <Bot className="w-10 h-10 mx-auto mb-2 text-sky-400" />
                    <p className="font-medium text-sm text-slate-700 mb-1">Hi! I'm Isla 👋</p>
                    <p className="text-xs text-slate-500 mb-3">How can I help you navigate the app?</p>
                    <div className="space-y-1.5">
                      {['How do I add a client?', 'How does time tracking work?', 'How do I create an invoice?'].map(q => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); inputRef.current?.focus(); }}
                          className="block w-full text-left text-xs bg-sky-50 hover:bg-sky-100 text-sky-700 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-3 h-3 text-sky-600" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-sky-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                      {msg.role === 'user' ? (
                        <p>{msg.content}</p>
                      ) : (
                        <ReactMarkdown
                          className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0 text-sm">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-3 mb-1 text-sm">{children}</ul>,
                            li: ({ children }) => <li className="mb-0.5">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3 h-3 text-slate-600" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3 h-3 text-sky-600" />
                    </div>
                    <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3 py-2">
                      <div className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-slate-100 p-3 flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Ask Isla anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    disabled={isLoading}
                    className="text-sm h-9 rounded-xl border-slate-200"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl bg-sky-600 hover:bg-sky-700 flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-sky-600 hover:bg-sky-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-white relative"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}