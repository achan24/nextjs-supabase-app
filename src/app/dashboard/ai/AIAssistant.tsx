'use client';

import { User } from '@supabase/supabase-js';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { format } from 'date-fns';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  user: User;
}

export default function AIAssistant({ user }: AIAssistantProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userContext, setUserContext] = useState<{
    tasks: any[];
    completionRate: number;
    focusTime: number;
    commonPatterns: any[];
  } | null>(null);

  useEffect(() => {
    loadUserContext();
    // Add initial welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hi! I\'m your Guardian Angel AI assistant. I can help you with task management, provide ADHD-specific strategies, and offer personalized suggestions based on your patterns. What would you like help with today?',
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUserContext = async () => {
    try {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      if (tasksError) throw tasksError;

      // Calculate completion rate
      const completedTasks = tasks?.filter(t => t.status === 'completed') || [];
      const completionRate = tasks?.length ? (completedTasks.length / tasks.length) * 100 : 0;

      // Calculate total focus time
      const totalFocusTime = tasks?.reduce((acc, task) => acc + (task.time_spent || 0), 0) || 0;

      setUserContext({
        tasks: tasks || [],
        completionRate,
        focusTime: totalFocusTime,
        commonPatterns: [], // To be implemented with pattern recognition
      });
    } catch (error) {
      console.error('Error loading user context:', error);
      setError('Failed to load user data');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement actual API call to OpenRouter DeepSeek
      // This is a placeholder response
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I understand you need help with task management. Based on your patterns, I notice you\'re most productive in the morning. Would you like me to help you organize your tasks for tomorrow morning?',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setError('Failed to get AI response');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <a href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to Dashboard
            </a>
            <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Context Summary */}
          {userContext && (
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-500">Task Completion Rate</h3>
                <p className="text-2xl font-semibold text-gray-900">{userContext.completionRate.toFixed(1)}%</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-500">Total Focus Time</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.floor(userContext.focusTime / 3600)}h {Math.floor((userContext.focusTime % 3600) / 60)}m
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-500">Active Tasks</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {userContext.tasks.filter(t => t.status !== 'completed').length}
                </p>
              </div>
            </div>
          )}

          {/* Chat Interface */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="h-[600px] overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'assistant'
                          ? 'bg-blue-50 text-blue-900'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {format(message.timestamp, 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-4 bg-blue-50">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
              {error && (
                <div className="mb-4 p-2 bg-red-50 text-red-700 rounded text-sm">
                  {error}
                </div>
              )}
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about your tasks, time management, or ADHD strategies..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 