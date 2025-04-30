'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getAIResponse } from '@/lib/ai';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Bot, User } from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  context: {
    tasks: any[];
    completionRate: number;
    focusTime: number;
    commonPatterns: any[];
  };
}

export function AIAssistant({ context }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const previousMessages = messages.map(({ role, content }) => ({ role, content }));
      const response = await getAIResponse(input, context, user.id, previousMessages);

      if (response.error) {
        throw new Error(response.error);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Show error in chat
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-2 p-4 border-b">
        <Bot className="w-6 h-6 text-primary" />
        <h2 className="text-lg font-semibold">Guardian Angel Assistant</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p>👋 Hi! I'm your Guardian Angel assistant.</p>
            <p>I'm here to help you manage your tasks and time more effectively.</p>
            <p>Feel free to ask me anything!</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-2 ${
              message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
            }`}
          >
            <div className="flex-shrink-0">
              {message.role === 'assistant' ? (
                <Bot className="w-6 h-6 text-primary" />
              ) : (
                <User className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div
              className={`rounded-lg p-3 max-w-[80%] ${
                message.role === 'assistant'
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </Card>
  );
} 