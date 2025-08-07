'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User as UserIcon, Loader2, Paperclip, X, ChevronDown, Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getCharacterProgress } from '@/services/characterService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Attachment {
  id: string;
  type: 'character-data' | 'areas' | 'goals' | 'tasks' | 'process-flows' | 'specific-process-flow';
  name: string;
  data: any;
}

interface ProcessFlow {
  id: string;
  title: string;
  description: string;
  nodes: any[];
  edges: any[];
  created_at: string;
  updated_at: string;
}

export default function AIChatClient({ user }: { user: User }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [processFlows, setProcessFlows] = useState<ProcessFlow[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close attachment menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.attachment-menu-container')) {
        setShowAttachmentMenu(false);
      }
    };

    if (showAttachmentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachmentMenu]);

  // Load chats on component mount
  useEffect(() => {
    loadChats();
    loadProcessFlows();
  }, []);

  const loadProcessFlows = async () => {
    try {
      const { data, error } = await supabase
        .from('process_flows')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProcessFlows(data || []);
    } catch (error) {
      console.error('Error loading process flows:', error);
    }
  };

  const loadChats = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const createNewChat = async () => {
    setIsCreatingChat(true);
    try {
      const { data, error } = await supabase
        .from('ai_chats')
        .insert({
          user_id: user.id,
          title: 'New Chat',
        })
        .select()
        .single();

      if (error) throw error;
      
      setChats(prev => [data, ...prev]);
      setCurrentChatId(data.id);
      setMessages([]);
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const fetchCharacterData = async () => {
    setIsLoadingAttachments(true);
    try {
      console.log('[AI Chat] Fetching character data for user:', user.id);
      
      // Get character progress using the existing service
      const characterProgress = await getCharacterProgress(user.id);
      console.log('[AI Chat] Character progress:', characterProgress);
      
      // Create a character object from the progress data
      const character = {
        id: 'character-' + user.id,
        user_id: user.id,
        level: characterProgress.level,
        xp: characterProgress.xp,
        requiredXP: characterProgress.requiredXP,
        progress: characterProgress.progress
      };

      // Fetch character traits
      const { data: traits, error: traitsError } = await supabase
        .from('character_traits')
        .select('*')
        .eq('character_id', character.id)
        .order('last_updated', { ascending: false });

      if (traitsError) {
        console.log('[AI Chat] Character traits error:', traitsError);
      }

      // Fetch character areas (character development areas)
      const { data: characterAreas, error: characterAreasError } = await supabase
        .from('character_areas')
        .select(`
          *,
          subareas:character_subareas(
            *,
            goals:character_goals(*)
          )
        `)
        .eq('user_id', user.id);

      if (characterAreasError) {
        console.log('[AI Chat] Character areas error:', characterAreasError);
      }

      // Fetch life goal areas with their subareas and goals
      const { data: areas, error: areasError } = await supabase
        .from('life_goal_areas')
        .select(`
          *,
          subareas:life_goal_subareas(
            *,
            goals:life_goals(*)
          )
        `)
        .eq('user_id', user.id);

      if (areasError) throw areasError;

      // Fetch recent area points history (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: areaHistory, error: areaHistoryError } = await supabase
        .from('area_points_history')
        .select(`
          *,
          area:life_goal_areas(name)
        `)
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (areaHistoryError) throw areaHistoryError;

      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Calculate some stats
      const totalAreas = areas?.length || 0;
      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
      const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
      
      // Calculate recent performance (last 7 days)
      const recentPerformance = areaHistory?.reduce((acc, record) => {
        const areaName = record.area?.name || 'Unknown';
        if (!acc[areaName]) {
          acc[areaName] = { totalPoints: 0, totalTarget: 0, days: 0 };
        }
        acc[areaName].totalPoints += parseFloat(record.points || 0);
        acc[areaName].totalTarget += parseFloat(record.target || 0);
        acc[areaName].days += 1;
        return acc;
      }, {} as Record<string, { totalPoints: number; totalTarget: number; days: number }>);

      // Create attachment for character data
      const characterAttachment: Attachment = {
        id: 'character-data',
        type: 'character-data',
        name: `Character Data (Level ${character.level}, ${totalAreas} areas, ${totalTasks} tasks)`,
        data: {
          character: character,
          traits: traits || [],
          characterAreas: characterAreas || [],
          areas: areas || [],
          tasks: tasks || [],
          areaHistory: areaHistory || [],
          recentPerformance: recentPerformance || {},
          stats: {
            totalAreas,
            totalTasks,
            completedTasks,
            pendingTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
          }
        }
      };

      console.log('[AI Chat] Created attachment:', characterAttachment);
      setAttachments([characterAttachment]);
      console.log('[AI Chat] Attachment set successfully');
    } catch (error) {
      console.error('Error fetching character data:', error);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  const fetchProcessFlows = async () => {
    setIsLoadingAttachments(true);
    try {
      const attachment: Attachment = {
        id: 'process-flows',
        type: 'process-flows',
        name: `Process Flows (${processFlows.length} flows)`,
        data: {
          processFlows: processFlows
        }
      };

      setAttachments(prev => [...prev, attachment]);
    } catch (error) {
      console.error('Error fetching process flows:', error);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  const fetchSpecificProcessFlow = async (flowId: string) => {
    setIsLoadingAttachments(true);
    try {
      const flow = processFlows.find(f => f.id === flowId);
      if (!flow) return;

      const attachment: Attachment = {
        id: `process-flow-${flowId}`,
        type: 'specific-process-flow',
        name: `Process Flow: ${flow.title}`,
        data: {
          flow: flow
        }
      };

      setAttachments(prev => [...prev, attachment]);
    } catch (error) {
      console.error('Error fetching specific process flow:', error);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const getAttachmentContext = () => {
    if (attachments.length === 0) return '';
    
    let context = '\n\n**Attached Data:**\n';
    
    attachments.forEach(attachment => {
      if (attachment.type === 'character-data') {
        const { character, traits, characterAreas, areas, tasks, areaHistory, recentPerformance, stats } = attachment.data;
        
        context += `\n**Character Stats:**\n`;
        context += `- Level: ${character.level}\n`;
        context += `- XP: ${character.xp}\n`;
        context += `- Total Areas: ${stats.totalAreas}\n`;
        context += `- Total Tasks: ${stats.totalTasks}\n`;
        context += `- Completed Tasks: ${stats.completedTasks}\n`;
        context += `- Completion Rate: ${stats.completionRate}%\n`;
        
        if (traits?.length > 0) {
          context += `\n**Character Traits:**\n`;
          traits.forEach((trait: any) => {
            context += `- ${trait.name}: ${trait.value}/100\n`;
          });
        }
        
        if (characterAreas?.length > 0) {
          context += '\n**Character Development Areas:**\n';
          characterAreas.forEach((area: any) => {
            context += `- ${area.name}: ${area.current_points}/${area.target_points} points\n`;
            area.subareas?.forEach((subarea: any) => {
              context += `  - ${subarea.name}\n`;
              subarea.goals?.forEach((goal: any) => {
                context += `    - Goal: ${goal.title}\n`;
              });
            });
          });
        }
        
        context += '\n**Life Goal Areas:**\n';
        areas?.forEach((area: any) => {
          context += `- ${area.name} (Daily Target: ${area.daily_target} points)\n`;
          area.subareas?.forEach((subarea: any) => {
            context += `  - ${subarea.name}\n`;
            subarea.goals?.forEach((goal: any) => {
              context += `    - Goal: ${goal.title} (Status: ${goal.status})\n`;
            });
          });
        });
        
        if (Object.keys(recentPerformance).length > 0) {
          context += '\n**Recent Performance (Last 7 Days):**\n';
          Object.entries(recentPerformance).forEach(([areaName, performance]) => {
            const perf = performance as { totalPoints: number; totalTarget: number; days: number };
            const avgPoints = perf.days > 0 ? Math.round(perf.totalPoints / perf.days) : 0;
            const avgTarget = perf.days > 0 ? Math.round(perf.totalTarget / perf.days) : 0;
            const achievementRate = avgTarget > 0 ? Math.round((avgPoints / avgTarget) * 100) : 0;
            context += `- ${areaName}: ${avgPoints} points/day (Target: ${avgTarget}, Achievement: ${achievementRate}%)\n`;
          });
        }
        
        context += '\n**Recent Tasks:**\n';
        tasks?.slice(0, 10).forEach((task: any) => {
          context += `- ${task.title} (${task.status})\n`;
        });
        
        if (areaHistory?.length > 0) {
          context += '\n**Recent Activity (Last 7 Days):**\n';
          const recentDays = areaHistory.slice(0, 5);
          recentDays.forEach((record: any) => {
            const areaName = record.area?.name || 'Unknown';
            const achievementRate = parseFloat(record.target) > 0 ? Math.round((parseFloat(record.points) / parseFloat(record.target)) * 100) : 0;
            context += `- ${record.date}: ${areaName} - ${record.points} points (Target: ${record.target}, Achievement: ${achievementRate}%)\n`;
          });
        }
      } else if (attachment.type === 'process-flows') {
        const { processFlows } = attachment.data;
        
        context += '\n**Process Flows:**\n';
        processFlows?.forEach((flow: any) => {
          context += `- ${flow.title}: ${flow.description || 'No description'}\n`;
        });
      } else if (attachment.type === 'specific-process-flow') {
        const { flow } = attachment.data;
        
        context += `\n**Process Flow: ${flow.title}**\n`;
        context += `Description: ${flow.description || 'No description'}\n`;
        context += `Nodes: ${flow.nodes?.length || 0}\n`;
        context += `Edges: ${flow.edges?.length || 0}\n`;
        
        if (flow.nodes?.length > 0) {
          context += '\n**Flow Nodes:**\n';
          flow.nodes.slice(0, 5).forEach((node: any) => {
            context += `- ${node.data?.label || node.id}\n`;
          });
          if (flow.nodes.length > 5) {
            context += `... and ${flow.nodes.length - 5} more nodes\n`;
          }
        }
      }
    });
    
    return context;
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Create chat if none exists
    let chatId = currentChatId;
    if (!chatId) {
      try {
        const { data, error } = await supabase
          .from('ai_chats')
          .insert({
            user_id: user.id,
            title: userMessage.content.slice(0, 50) + '...',
          })
          .select()
          .single();

        if (error) throw error;
        chatId = data.id;
        setCurrentChatId(chatId);
        setChats(prev => [data, ...prev]);
      } catch (error) {
        console.error('Error creating chat:', error);
        setIsLoading(false);
        return;
      }
    }

    // Save user message to database
    try {
      await supabase
        .from('ai_messages')
        .insert({
          chat_id: chatId,
          role: 'user',
          content: userMessage.content,
        });
    } catch (error) {
      console.error('Error saving user message:', error);
    }

    // Get AI response
    try {
      const messagesWithContext = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add attachment context to THIS specific message if there are attachments
      if (attachments.length > 0) {
        const attachmentContext = getAttachmentContext();
        if (attachmentContext) {
          // Add context to the current user message (the last one)
          messagesWithContext[messagesWithContext.length - 1].content += attachmentContext;
        }
      }

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesWithContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      // Create AI message placeholder
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      // Add AI message placeholder immediately
      setMessages(prev => [...prev, aiMessage]);

      // Clear attachments after they've been used for this message
      setAttachments([]);

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  // Update the AI message content in real-time
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === aiMessage.id 
                        ? { ...msg, content: msg.content + parsed.content }
                        : msg
                    )
                  );
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Save AI message to database
      await supabase
        .from('ai_messages')
        .insert({
          chat_id: chatId,
          role: 'assistant',
          content: aiMessage.content,
        });

      // Update chat title if it's the first message
      if (messages.length === 0) {
        await supabase
          .from('ai_chats')
          .update({ title: userMessage.content.slice(0, 50) + '...' })
          .eq('id', chatId);
      }

    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-1 sm:p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 h-[calc(100vh-2rem)] sm:h-[calc(100vh-6rem)]">
          {/* Sidebar - Chat History (Hidden on mobile, overlay on mobile) */}
          <div className={`${showSidebar ? 'block' : 'hidden'} lg:block lg:col-span-1 fixed lg:relative inset-0 z-50 lg:z-auto`}>
            {showSidebar && (
              <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowSidebar(false)} />
            )}
            <div className="lg:hidden absolute left-0 top-0 w-80 h-full bg-white shadow-lg">
              <Card className="h-full border-0 rounded-none">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Chats</span>
                    <Button
                      size="sm"
                      onClick={createNewChat}
                      disabled={isCreatingChat}
                    >
                      {isCreatingChat ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'New'
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-8rem)]">
                    <div className="space-y-2">
                      {chats.map((chat) => (
                        <div
                          key={chat.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            currentChatId === chat.id
                              ? 'bg-blue-100 text-blue-900'
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => {
                            loadChatMessages(chat.id);
                            setShowSidebar(false);
                          }}
                        >
                          <div className="font-medium text-sm truncate">
                            {chat.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(chat.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            <div className="hidden lg:block">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Chats</span>
                  <Button
                    size="sm"
                    onClick={createNewChat}
                    disabled={isCreatingChat}
                  >
                    {isCreatingChat ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'New'
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <div className="space-y-2">
                    {chats.map((chat) => (
                      <div
                        key={chat.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          currentChatId === chat.id
                            ? 'bg-blue-100 text-blue-900'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => loadChatMessages(chat.id)}
                      >
                        <div className="font-medium text-sm truncate">
                          {chat.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(chat.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="col-span-1 lg:col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="lg:hidden"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                    <CardTitle>AI Chat</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    onClick={createNewChat}
                    disabled={isCreatingChat}
                    className="lg:hidden"
                  >
                    {isCreatingChat ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'New'
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-2 sm:p-6">
                {/* Attachments */}
                {attachments.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-blue-900">Attached Data</h4>
                    </div>
                    <div className="space-y-3">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-gray-700">{attachment.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(attachment.id)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {attachment.type === 'character-data' && (
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="flex flex-wrap gap-2 sm:gap-4">
                                <span className="text-xs">Level: {attachment.data.character?.level || 1}</span>
                                <span className="text-xs">Areas: {attachment.data.stats?.totalAreas || 0}</span>
                                <span className="text-xs">Tasks: {attachment.data.stats?.totalTasks || 0}</span>
                                <span className="text-xs">Completion: {attachment.data.stats?.completionRate || 0}%</span>
                              </div>
                              {attachment.data.areas?.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium mb-1">Areas:</div>
                                  <div className="space-y-1">
                                    {attachment.data.areas.slice(0, 3).map((area: any) => (
                                      <div key={area.id} className="ml-2">
                                        • {area.name}
                                        {area.subareas?.length > 0 && (
                                          <div className="ml-2 text-gray-500">
                                            {area.subareas.slice(0, 2).map((subarea: any) => (
                                              <div key={subarea.id}>
                                                - {subarea.name}
                                                {subarea.goals?.length > 0 && (
                                                  <div className="ml-2 text-gray-400">
                                                    {subarea.goals.slice(0, 1).map((goal: any) => (
                                                      <div key={goal.id}>• {goal.title}</div>
                                                    ))}
                                                    {subarea.goals.length > 1 && (
                                                      <div>• ... and {subarea.goals.length - 1} more goals</div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                            {area.subareas.length > 2 && (
                                              <div className="text-gray-400">... and {area.subareas.length - 2} more</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    {attachment.data.areas.length > 3 && (
                                      <div className="ml-2 text-gray-400">... and {attachment.data.areas.length - 3} more areas</div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {attachment.data.traits?.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium mb-1">Traits:</div>
                                  <div className="space-y-1">
                                    {attachment.data.traits.slice(0, 3).map((trait: any) => (
                                      <div key={trait.id} className="ml-2">
                                        • {trait.name}: {trait.value}/100
                                      </div>
                                    ))}
                                    {attachment.data.traits.length > 3 && (
                                      <div className="ml-2 text-gray-400">... and {attachment.data.traits.length - 3} more traits</div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {Object.keys(attachment.data.recentPerformance || {}).length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium mb-1">Recent Performance:</div>
                                  <div className="space-y-1">
                                    {Object.entries(attachment.data.recentPerformance).slice(0, 2).map(([areaName, performance]: [string, any]) => {
                                      const perf = performance as { totalPoints: number; totalTarget: number; days: number };
                                      const avgPoints = perf.days > 0 ? Math.round(perf.totalPoints / perf.days) : 0;
                                      const avgTarget = perf.days > 0 ? Math.round(perf.totalTarget / perf.days) : 0;
                                      const achievementRate = avgTarget > 0 ? Math.round((avgPoints / avgTarget) * 100) : 0;
                                      return (
                                        <div key={areaName} className="ml-2">
                                          • {areaName}: {achievementRate}% achievement
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {attachment.data.tasks?.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium mb-1">Recent Tasks:</div>
                                  <div className="space-y-1">
                                    {attachment.data.tasks.slice(0, 3).map((task: any) => (
                                      <div key={task.id} className="ml-2">
                                        • {task.title} ({task.status})
                                      </div>
                                    ))}
                                    {attachment.data.tasks.length > 3 && (
                                      <div className="ml-2 text-gray-400">... and {attachment.data.tasks.length - 3} more tasks</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {attachment.type === 'process-flows' && (
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="flex gap-4">
                                <span>Flows: {attachment.data.processFlows?.length || 0}</span>
                              </div>
                              {attachment.data.processFlows?.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium mb-1">Process Flows:</div>
                                  <div className="space-y-1">
                                    {attachment.data.processFlows.slice(0, 3).map((flow: any) => (
                                      <div key={flow.id} className="ml-2">
                                        • {flow.title}
                                      </div>
                                    ))}
                                    {attachment.data.processFlows.length > 3 && (
                                      <div className="ml-2 text-gray-400">... and {attachment.data.processFlows.length - 3} more flows</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {attachment.type === 'specific-process-flow' && (
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="flex gap-4">
                                <span>Nodes: {attachment.data.flow?.nodes?.length || 0}</span>
                                <span>Edges: {attachment.data.flow?.edges?.length || 0}</span>
                              </div>
                              {attachment.data.flow?.nodes?.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium mb-1">Flow Nodes:</div>
                                  <div className="space-y-1">
                                    {attachment.data.flow.nodes.slice(0, 3).map((node: any, index: number) => (
                                      <div key={index} className="ml-2">
                                        • {node.data?.label || node.id}
                                      </div>
                                    ))}
                                    {attachment.data.flow.nodes.length > 3 && (
                                      <div className="ml-2 text-gray-400">... and {attachment.data.flow.nodes.length - 3} more nodes</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <ScrollArea className="flex-1 mb-4">
                  <div className="space-y-4">
                    {messages.length === 0 && !isLoading && (
                      <div className="text-center text-gray-500 py-8">
                        Start a new conversation with AI
                      </div>
                    )}
                    
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`${
                          message.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="flex items-center gap-2 mb-1">
                          {message.role === 'assistant' && (
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <Bot className="h-3 w-3 text-blue-600" />
                            </div>
                          )}
                          {message.role === 'user' && (
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <UserIcon className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Message */}
                        <div
                          className={`w-full p-3 rounded-lg break-words ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="prose prose-sm max-w-none prose-table:overflow-x-auto prose-table:max-w-full">
                            {message.role === 'assistant' ? (
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                            ) : (
                              <div className="whitespace-pre-wrap">{message.content}</div>
                            )}
                          </div>
                          <div className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <Bot className="h-3 w-3 text-blue-600" />
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 p-3 rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <div className="relative attachment-menu-container">
                    <Button
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      disabled={isLoadingAttachments}
                      variant="outline"
                      size="icon"
                      title="Attach data to chat"
                    >
                      {isLoadingAttachments ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Paperclip className={`h-4 w-4 ${attachments.length > 0 ? 'text-blue-600' : ''}`} />
                      )}
                    </Button>
                    
                    {showAttachmentMenu && (
                      <div className="absolute bottom-full mb-2 left-0 w-64 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                        <div className="p-2">
                          <div className="text-xs font-medium text-gray-700 mb-2">Attach Data</div>
                          
                          <div className="space-y-1">
                            <button
                              onClick={() => {
                                fetchCharacterData();
                                setShowAttachmentMenu(false);
                              }}
                              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <Paperclip className="h-3 w-3" />
                              Character Data (Areas & Tasks)
                            </button>
                            
                            <button
                              onClick={() => {
                                fetchProcessFlows();
                                setShowAttachmentMenu(false);
                              }}
                              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <Paperclip className="h-3 w-3" />
                              All Process Flows ({processFlows.length})
                            </button>
                            
                            {processFlows.length > 0 && (
                              <div className="border-t pt-1 mt-1">
                                <div className="text-xs text-gray-500 px-2 py-1">Specific Process Flows:</div>
                                {processFlows.slice(0, 5).map((flow) => (
                                  <button
                                    key={flow.id}
                                    onClick={() => {
                                      fetchSpecificProcessFlow(flow.id);
                                      setShowAttachmentMenu(false);
                                    }}
                                    className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    {flow.title}
                                  </button>
                                ))}
                                {processFlows.length > 5 && (
                                  <div className="text-xs text-gray-400 px-2 py-1">
                                    ... and {processFlows.length - 5} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
