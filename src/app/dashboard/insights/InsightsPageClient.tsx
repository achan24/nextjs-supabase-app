'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ChevronDown, ChevronRight, Link2, ChevronLeft, Plus } from 'lucide-react';
import Link from 'next/link';

interface ProcessFlow {
  id: string;
  nodes: any[];
  created_at: string;
}

interface NodeWithTags {
  id?: string;
  data: {
    tags?: string[];
    status?: string;
    timeSpent?: number;
    label?: string;
    completionHistory?: Array<{
      completedAt: number;
      timeSpent: number;
      note?: string;
    }>;
  };
  created_at: string;
  flowId: string;
}

interface NodeDetail {
  id: string;
  label: string;
  timeSpent?: number;
  status?: string;
  completionHistory?: Array<{
    completedAt: number;
    timeSpent: number;
    note?: string;
  }>;
  created_at: string;
  flowId: string;
}

interface TagMetrics {
  tag: string;
  totalUsage: number;
  todayUsage: number;
  weeklyTrend: { date: string; count: number }[];
  timeSpentToday: number;
  nodes: NodeDetail[];
}

interface InsightsPageProps {
  user: any;
}

export default function InsightsPageClient({ user }: InsightsPageProps) {
  const [tagMetrics, setTagMetrics] = useState<TagMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestions, setSuggestions] = useState<Array<{
    label: string,
    flowId: string,
    nodeId: string,
    type: 'overdue_habit' | 'rare_task',
    lastDone?: Date,
    completionCount?: number,
    daysBetweenCompletions?: number
  }>>([]);
  const supabase = createClient();

  const toggleTag = (tag: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(tag)) {
      newExpanded.delete(tag);
    } else {
      newExpanded.add(tag);
    }
    setExpandedTags(newExpanded);
  };

  useEffect(() => {
    if (user?.id) {
      console.log('InsightsPage mounted, fetching metrics for user:', user.id);
      fetchTagMetrics();

      // Set up an interval to refresh every minute
      const intervalId = setInterval(() => {
        console.log('Refreshing tag metrics...');
        fetchTagMetrics();
      }, 60000); // 60 seconds

      // Cleanup interval on unmount
      return () => clearInterval(intervalId);
    }
  }, [user]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user?.id) return;
      
      const now = new Date();
      const newSuggestions: Array<{
        label: string,
        flowId: string,
        nodeId: string,
        type: 'overdue_habit' | 'rare_task',
        lastDone?: Date,
        completionCount?: number,
        daysBetweenCompletions?: number
      }> = [];

      // First get habits that are due
      const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id);

      if (habits) {
        for (const habit of habits) {
          if (habit.linked_flow_id && habit.linked_node_id) {
            // Get the latest completion for this habit
            const { data: completions } = await supabase
              .from('habit_completions')
              .select('completed_at')
              .eq('habit_id', habit.id)
              .order('completed_at', { ascending: false })
              .limit(1);

            const lastCompletion = completions?.[0]?.completed_at;
            const daysSinceLastCompletion = lastCompletion 
              ? Math.floor((now.getTime() - new Date(lastCompletion).getTime()) / (1000 * 60 * 60 * 24))
              : Infinity;

            // If it's been more than the habit's frequency in days, it's overdue
            const frequencyInDays = habit.frequency === 'daily' ? 1 
              : habit.frequency === 'weekly' ? 7 
              : habit.frequency === 'monthly' ? 30 
              : 1; // default to daily

            if (daysSinceLastCompletion >= frequencyInDays) {
              newSuggestions.push({
                label: habit.name,
                flowId: habit.linked_flow_id,
                nodeId: habit.linked_node_id,
                type: 'overdue_habit' as const,
                lastDone: lastCompletion ? new Date(lastCompletion) : undefined
              });
            }
          }
        }
      }
      
      // Then add rarely done tasks
      tagMetrics.forEach(metric => {
        metric.nodes.forEach(node => {
          if (!node.completionHistory?.length) return;
          
          // Sort completions by date, most recent first
          const sortedCompletions = [...node.completionHistory].sort((a, b) => b.completedAt - a.completedAt);
          const lastCompletion = new Date(sortedCompletions[0].completedAt);
          
          // Get node creation date
          const nodeCreatedAt = new Date(node.created_at);
          const daysSinceCreation = Math.floor((now.getTime() - nodeCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
          
          // Only consider tasks that are at least 2 weeks old
          if (daysSinceCreation < 14) return;

          // For completion rate, look at either the last 30 days or since creation, whichever is shorter
          const daysToLookBack = Math.min(30, daysSinceCreation);
          const cutoffDate = new Date(now.getTime() - (daysToLookBack * 24 * 60 * 60 * 1000));
          
          // Get completions in look-back period
          const recentCompletions = sortedCompletions.filter(completion => 
            new Date(completion.completedAt) > cutoffDate
          );

          // Calculate average days between completions over the node's entire history
          let avgDaysBetween = 0;
          if (sortedCompletions.length > 1) {
            const timeSpans = sortedCompletions.slice(0, -1).map((completion, i) => {
              const current = new Date(completion.completedAt);
              const next = new Date(sortedCompletions[i + 1].completedAt);
              return (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
            });
            avgDaysBetween = timeSpans.reduce((sum, span) => sum + span, 0) / timeSpans.length;
          }

          // Consider a task "rare" if:
          // 1. Few completions relative to its age (less than once per 10 days on average)
          // 2. Long average time between completions (more than 10 days)
          const completionsPerDay = recentCompletions.length / daysToLookBack;
          if (completionsPerDay < 0.1 || avgDaysBetween > 10) {
            newSuggestions.push({
              label: node.label,
              flowId: node.flowId,
              nodeId: node.id,
              type: 'rare_task' as const,
              completionCount: recentCompletions.length,
              lastDone: lastCompletion,
              daysBetweenCompletions: Math.round(avgDaysBetween)
            });
          }
        });
      });

      // Sort suggestions - overdue habits first, then rare tasks
      newSuggestions.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'overdue_habit' ? -1 : 1;
        return ((b.lastDone?.getTime() || 0) - (a.lastDone?.getTime() || 0));
      });

      setSuggestions(newSuggestions.slice(0, 5));
    };

    fetchSuggestions();
  }, [user, tagMetrics]);

  const getNodeTimeSpentToday = (node: NodeDetail): number => {
    const today = new Date().toISOString().split('T')[0];
    
    // If node has completion history, use that
    if (node.completionHistory?.length) {
      // Get all completions from today
      const todayCompletions = node.completionHistory.filter(record => {
        const completionDate = new Date(record.completedAt).toISOString().split('T')[0];
        return completionDate === today;
      });

      // Sum up time spent from all of today's completions
      const totalTimeFromCompletions = todayCompletions.reduce((sum, record) => sum + record.timeSpent, 0);
      
      console.log('Time calculation for node with history:', {
        nodeId: node.id,
        nodeLabel: node.label,
        todayCompletions: todayCompletions.length,
        timeSpentFromCompletions: totalTimeFromCompletions,
        allCompletions: node.completionHistory
      });

      return totalTimeFromCompletions;
    }
    
    // If no completion history but node is completed today and has timeSpent, use that
    if (node.status === 'completed' && node.timeSpent && node.timeSpent > 0 && node.id && node.label) {
      console.log('Time calculation for completed node without history:', {
        nodeId: node.id,
        nodeLabel: node.label,
        timeSpent: node.timeSpent
      });
      return node.timeSpent;
    }

    return 0;
  };

  const getNodeCompletionsForDate = (node: NodeDetail, date: Date) => {
    return node.completionHistory?.filter(record => {
      const completionDate = new Date(record.completedAt);
      return isSameDay(completionDate, date);
    }) || [];
  };

  const formatTimeForDisplay = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    if (minutes === 0) {
      return `${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const formatStartTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: 'numeric',
      hour12: true 
    });
  };

  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();
  };

  const getHourSlots = () => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
      slots.push({
        hour: i,
        label: new Date(2020, 0, 1, i).toLocaleTimeString('en-US', { 
          hour: 'numeric',
          hour12: true 
        })
      });
    }
    return slots;
  };

  const getTasksForHour = (tasks: Array<{ node: NodeDetail, completion: any }>, hour: number) => {
    return tasks.filter(task => {
      const completionHour = new Date(task.completion.completedAt).getHours();
      return completionHour === hour;
    });
  };

  const getTimeBarWidth = (timeSpent: number) => {
    // Cap at 2 hours for the bar width calculation
    const maxTime = 2 * 60 * 60 * 1000; // 2 hours in ms
    const percentage = Math.min((timeSpent / maxTime) * 100, 100);
    return `${percentage}%`;
  };

  const getTimeOfDay = (date: Date): string => {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const getSuggestions = async () => {
    const now = new Date();
    const suggestions: Array<{
      label: string,
      flowId: string,
      nodeId: string,
      type: 'overdue_habit' | 'rare_task',
      lastDone?: Date,
      completionCount?: number,
      daysBetweenCompletions?: number
    }> = [];

    // First get habits that are due
    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id);

    if (habits) {
      for (const habit of habits) {
        if (habit.linked_flow_id && habit.linked_node_id) {
          // Get the latest completion for this habit
          const { data: completions } = await supabase
            .from('habit_completions')
            .select('completed_at')
            .eq('habit_id', habit.id)
            .order('completed_at', { ascending: false })
            .limit(1);

          const lastCompletion = completions?.[0]?.completed_at;
          const daysSinceLastCompletion = lastCompletion 
            ? Math.floor((now.getTime() - new Date(lastCompletion).getTime()) / (1000 * 60 * 60 * 24))
            : Infinity;

          // If it's been more than the habit's frequency in days, it's overdue
          const frequencyInDays = habit.frequency === 'daily' ? 1 
            : habit.frequency === 'weekly' ? 7 
            : habit.frequency === 'monthly' ? 30 
            : 1; // default to daily

          if (daysSinceLastCompletion >= frequencyInDays) {
            suggestions.push({
              label: habit.name,
              flowId: habit.linked_flow_id,
              nodeId: habit.linked_node_id,
              type: 'overdue_habit',
              lastDone: lastCompletion ? new Date(lastCompletion) : undefined
            });
          }
        }
      }
    }
    
    // Then add rarely done tasks
    tagMetrics.forEach(metric => {
      metric.nodes.forEach(node => {
        if (!node.completionHistory?.length) return;
        
        // Sort completions by date, most recent first
        const sortedCompletions = [...node.completionHistory].sort((a, b) => b.completedAt - a.completedAt);
        const lastCompletion = new Date(sortedCompletions[0].completedAt);
        
        // Get node creation date
        const nodeCreatedAt = new Date(node.created_at);
        const daysSinceCreation = Math.floor((now.getTime() - nodeCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        // Only consider tasks that are at least 2 weeks old
        if (daysSinceCreation < 14) return;

        // For completion rate, look at either the last 30 days or since creation, whichever is shorter
        const daysToLookBack = Math.min(30, daysSinceCreation);
        const cutoffDate = new Date(now.getTime() - (daysToLookBack * 24 * 60 * 60 * 1000));
        
        // Get completions in look-back period
        const recentCompletions = sortedCompletions.filter(completion => 
          new Date(completion.completedAt) > cutoffDate
        );

        // Calculate average days between completions over the node's entire history
        let avgDaysBetween = 0;
        if (sortedCompletions.length > 1) {
          const timeSpans = sortedCompletions.slice(0, -1).map((completion, i) => {
            const current = new Date(completion.completedAt);
            const next = new Date(sortedCompletions[i + 1].completedAt);
            return (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
          });
          avgDaysBetween = timeSpans.reduce((sum, span) => sum + span, 0) / timeSpans.length;
        }

        // Consider a task "rare" if:
        // 1. Few completions relative to its age (less than once per 10 days on average)
        // 2. Long average time between completions (more than 10 days)
        const completionsPerDay = recentCompletions.length / daysToLookBack;
        if (completionsPerDay < 0.1 || avgDaysBetween > 10) {
          suggestions.push({
            label: node.label,
            flowId: node.flowId,
            nodeId: node.id,
            type: 'rare_task' as const,
            completionCount: recentCompletions.length,
            lastDone: lastCompletion,
            daysBetweenCompletions: Math.round(avgDaysBetween)
          });
        }
      });
    });

    // Sort suggestions - overdue habits first, then rare tasks
    return suggestions
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'overdue_habit' ? -1 : 1;
        return ((b.lastDone?.getTime() || 0) - (a.lastDone?.getTime() || 0));
      })
      .slice(0, 5);
  };

  const fetchTagMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Fetch process flows for the current user
      console.log('Fetching process flows for user:', user.id);
      const { data: flows, error: flowsError } = await supabase
        .from('process_flows')
        .select('id, nodes, created_at')
        .eq('user_id', user.id);
      
      console.log('Flows response:', { flows, error: flowsError });
      
      if (flowsError) throw flowsError;

      // Get unique tags from all flows
      const uniqueTags = new Set<string>();
      (flows as ProcessFlow[])?.forEach(flow => {
        flow.nodes?.forEach((node: any) => {
          if (node.data?.tags?.length) {
            console.log('Node with tags:', {
              id: node.id,
              label: node.data.label,
              tags: node.data.tags,
              status: node.data.status,
              timeSpent: node.data.timeSpent,
              completionHistory: node.data.completionHistory,
              rawData: node.data
            });
          }
          node.data?.tags?.forEach((tag: string) => {
            uniqueTags.add(tag.toLowerCase());
          });
        });
      });

      // Process all nodes from flows
      const allNodes: NodeWithTags[] = (flows as ProcessFlow[])?.flatMap(flow => 
        flow.nodes.map((node: any) => ({
          ...node,
          created_at: flow.created_at,
          flowId: flow.id
        }))
      ) || [];

      // Calculate metrics for each tag
      const metrics: TagMetrics[] = Array.from(uniqueTags).map((tag: string) => {
        // Get nodes with this tag
        const nodesWithTag = allNodes.filter(node => 
          node.data?.tags?.some((t: string) => t.toLowerCase() === tag)
        );

        // Convert to NodeDetail format
        const nodeDetails: NodeDetail[] = nodesWithTag.map(node => ({
          id: node.id || '',
          label: node.data?.label || 'Untitled Node',
          timeSpent: node.data?.timeSpent,
          status: node.data?.status,
          completionHistory: node.data?.completionHistory,
          created_at: node.created_at,
          flowId: node.flowId
        }));

        // Calculate total usage
        const totalUsage = nodesWithTag.length;

        // Calculate today's usage and time spent
        const today = new Date().toISOString().split('T')[0];
        const todayUsage = nodeDetails.filter(node => 
          node.created_at.startsWith(today)
        ).length;

        // Calculate time spent today across all nodes with this tag
        const timeSpentToday = nodeDetails.reduce((sum, node) => {
          const nodeTimeToday = getNodeTimeSpentToday(node);
          return sum + nodeTimeToday;
        }, 0);

        console.log(`Stats for "${tag}":`, {
          totalNodes: totalUsage,
          todayNodes: todayUsage,
          timeSpentToday,
          nodeDetails: nodeDetails.map(n => ({
            label: n.label,
            timeSpent: n.timeSpent,
            completions: n.completionHistory?.length || 0
          }))
        });

        // Calculate weekly trend
        const weeklyTrend = calculateWeeklyTrend(nodeDetails);

        return {
          tag,
          totalUsage,
          todayUsage,
          weeklyTrend,
          timeSpentToday,
          nodes: nodeDetails
        };
      });

      // Sort metrics by total usage
      metrics.sort((a, b) => b.totalUsage - a.totalUsage);
      console.log('Final metrics:', metrics);
      
      setTagMetrics(metrics);
    } catch (error) {
      console.error('Error in fetchTagMetrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeeklyTrend = (nodes: NodeDetail[]) => {
    const trend: { [date: string]: number } = {};
    const today = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      trend[date.toISOString().split('T')[0]] = 0;
    }

    // Count nodes per day
    nodes.forEach(node => {
      const date = node.created_at.split('T')[0];
      if (trend[date] !== undefined) {
        trend[date]++;
      }
    });

    return Object.entries(trend).map(([date, count]) => ({ date, count }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Tag Insights</h1>
        <div className="text-center py-8">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Tag Insights</h1>
      
      {tagMetrics.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No Tags Found</h2>
          <p className="text-gray-600">
            Start adding tags to your process flow nodes to see insights and metrics here.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Day View Calendar */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Timeline</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(newDate.getDate() - 1);
                      setSelectedDate(newDate);
                    }}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Previous day"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="px-4 font-medium">
                    {formatDateForDisplay(selectedDate)}
                  </div>
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(newDate.getDate() + 1);
                      setSelectedDate(newDate);
                    }}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Next day"
                    disabled={isSameDay(selectedDate, new Date())}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={isSameDay(selectedDate, new Date())}
                >
                  Today
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {getHourSlots().map(slot => {
                // Get all tasks completed in this hour across all tags
                const hourTasks: Array<{ node: NodeDetail, completion: any }> = [];
                tagMetrics.forEach(metric => {
                  metric.nodes.forEach(node => {
                    const dateCompletions = getNodeCompletionsForDate(node, selectedDate);
                    dateCompletions.forEach(completion => {
                      const completionHour = new Date(completion.completedAt).getHours();
                      if (completionHour === slot.hour) {
                        hourTasks.push({ node, completion });
                      }
                    });
                  });
                });

                // Only show hours that have tasks
                if (hourTasks.length === 0) return null;

                return (
                  <div key={slot.hour} className="flex">
                    <div className="w-24 flex-shrink-0 py-2 text-sm text-gray-500">
                      {slot.label}
                    </div>
                    <div className="flex-1 border-l pl-4 py-2">
                      {hourTasks
                        .sort((a, b) => a.completion.completedAt - b.completion.completedAt)
                        .map(({ node, completion }) => (
                          <div 
                            key={`${node.id}-${completion.completedAt}`} 
                            className="relative mb-4 last:mb-0"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-sm text-gray-600 w-16 flex-shrink-0">
                                {formatStartTime(completion.completedAt)}
                              </div>
                              <div className="flex-1 flex items-center gap-2">
                                <span className="font-medium">{node.label}</span>
                                <button
                                  onClick={() => {
                                    window.location.href = `/dashboard/process-flow?flowId=${node.flowId}&nodeId=${node.id}`;
                                  }}
                                  className="text-blue-600 hover:text-blue-700"
                                  title="Jump to node"
                                >
                                  <span role="img" aria-label="jump to node">🔗</span>
                                </button>
                                <span className="text-sm text-gray-600">
                                  ({formatTimeForDisplay(completion.timeSpent)})
                                  {completion.note && ` - ${completion.note}`}
                                </span>
                              </div>
                            </div>
                            <div className="ml-16 h-2 bg-gray-100 rounded overflow-hidden">
                              <div 
                                className="h-full bg-blue-200 rounded"
                                style={{ 
                                  width: getTimeBarWidth(completion.timeSpent),
                                  transition: 'width 0.3s ease-in-out'
                                }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Suggestions Section */}
            <div className="mt-6 border-t pt-4">
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                {showSuggestions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-medium">Suggestions for {getTimeOfDay(new Date())}</span>
              </button>
              
              {showSuggestions && (
                <div className="mt-3 space-y-2">
                  {suggestions.map(suggestion => (
                    <div 
                      key={`${suggestion.flowId}-${suggestion.nodeId}`} 
                      className={`flex items-center justify-between p-3 rounded ${
                        suggestion.type === 'overdue_habit' ? 'bg-orange-50' : 'bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          <span className="font-medium">{suggestion.label}</span>
                          {' '}
                          {suggestion.type === 'overdue_habit' ? (
                            <>
                              is overdue
                              {suggestion.lastDone && (
                                <span className="text-gray-500">
                                  {' '}• Last done: {suggestion.lastDone.toLocaleDateString()}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {suggestion.completionCount === 0 ? (
                                'hasn\'t been done recently'
                              ) : (
                                <>
                                  only done {suggestion.completionCount} time{suggestion.completionCount !== 1 ? 's' : ''} recently
                                  {suggestion.daysBetweenCompletions && suggestion.daysBetweenCompletions > 0 && 
                                    ` (avg. ${suggestion.daysBetweenCompletions} days between)`
                                  }
                                </>
                              )}
                              {suggestion.lastDone && (
                                <span className="text-gray-500">
                                  {' '}• Last done: {suggestion.lastDone.toLocaleDateString()}
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      <Link
                        href={`/dashboard/process-flow?flowId=${suggestion.flowId}&nodeId=${suggestion.nodeId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Task
                      </Link>
                    </div>
                  ))}
                  {suggestions.length === 0 && (
                    <div className="text-sm text-gray-500 italic">
                      No overdue habits or rarely-done tasks found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Today's Activity */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Today's Tag Activity</h2>
            <div className="space-y-4">
              {tagMetrics
                .filter(metric => {
                  // Only show tags that have completions for selected date
                  const hasCompletionsForDate = metric.nodes.some(node => 
                    getNodeCompletionsForDate(node, selectedDate).length > 0
                  );
                  return hasCompletionsForDate;
                })
                .map(metric => (
                  <div key={metric.tag} className="border rounded-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium">#{metric.tag}</h3>
                      </div>
                      {metric.timeSpentToday > 0 && (
                        <span className="text-sm text-green-600">
                          Total time: {formatTimeForDisplay(metric.timeSpentToday)}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      {metric.nodes
                        .filter(node => getNodeCompletionsForDate(node, selectedDate).length > 0)
                        // Sort nodes by their earliest completion time today
                        .sort((a, b) => {
                          const aTime = Math.min(...getNodeCompletionsForDate(a, selectedDate).map(c => c.completedAt));
                          const bTime = Math.min(...getNodeCompletionsForDate(b, selectedDate).map(c => c.completedAt));
                          return aTime - bTime;
                        })
                        .map(node => {
                          const dateCompletions = getNodeCompletionsForDate(node, selectedDate);
                          return (
                            <div key={node.id} className="flex items-center justify-between py-2">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="font-medium min-w-[200px] flex items-center gap-2">
                                  {node.label}
                                  <button
                                    onClick={() => {
                                      window.location.href = `/dashboard/process-flow?flowId=${node.flowId}&nodeId=${node.id}`;
                                    }}
                                    className="text-blue-600 hover:text-blue-700"
                                    title="Jump to node"
                                  >
                                    <span role="img" aria-label="jump to node">🔗</span>
                                  </button>
                                </div>
                                <div className="text-sm text-gray-600">
                                  {dateCompletions
                                    .sort((a, b) => a.completedAt - b.completedAt)
                                    .map((completion, idx) => (
                                      <span key={completion.completedAt}>
                                        {formatStartTime(completion.completedAt)} - {formatTimeForDisplay(completion.timeSpent)}
                                        {completion.note && ` - ${completion.note}`}
                                        {idx < dateCompletions.length - 1 && ', '}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Tag Details */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Tag Details</h2>
            <div className="space-y-4">
              {tagMetrics.map(metric => (
                <div key={metric.tag} className="border rounded-lg">
                  <button
                    onClick={() => toggleTag(metric.tag)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      {expandedTags.has(metric.tag) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <h3 className="text-lg font-medium">#{metric.tag}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{metric.totalUsage} nodes</span>
                      {metric.timeSpentToday > 0 && (
                        <span className="text-sm text-green-600">
                          Today: {formatTimeForDisplay(metric.timeSpentToday)}
                        </span>
                      )}
                    </div>
                  </button>
                  {expandedTags.has(metric.tag) && (
                    <div className="border-t">
                      <div className="grid gap-2 p-4">
                        {metric.nodes.map(node => {
                          const dateCompletions = getNodeCompletionsForDate(node, selectedDate);
                          const hasCompletionsForDate = dateCompletions.length > 0;
                          
                          return (
                            <div key={node.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="font-medium min-w-[200px] flex items-center gap-2">
                                  {node.label}
                                  <button
                                    onClick={() => {
                                      window.location.href = `/dashboard/process-flow?flowId=${node.flowId}&nodeId=${node.id}`;
                                    }}
                                    className="text-blue-600 hover:text-blue-700"
                                    title="Jump to node"
                                  >
                                    <span role="img" aria-label="jump to node">🔗</span>
                                  </button>
                                </div>
                                {hasCompletionsForDate && (
                                  <div className="text-sm text-gray-600">
                                    {dateCompletions.map((completion, idx) => (
                                      <div key={completion.completedAt}>
                                        {formatTimeForDisplay(completion.timeSpent)}
                                        {completion.note && ` - ${completion.note}`}
                                        {idx < dateCompletions.length - 1 && ', '}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Weekly Trends */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Weekly Tag Trends</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4">
                {tagMetrics.slice(0, 5).map((metric, index) => (
                  <div 
                    key={metric.tag}
                    className="flex items-center gap-2"
                    style={{ color: `hsl(${index * 60}, 70%, 50%)` }}
                  >
                    <div className="w-3 h-3" style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }} />
                    #{metric.tag}
                  </div>
                ))}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      allowDuplicatedCategory={false}
                    />
                    <YAxis />
                    <Tooltip />
                    {tagMetrics.slice(0, 5).map((metric, index) => (
                      <Line
                        key={metric.tag}
                        data={metric.weeklyTrend}
                        name={`#${metric.tag}`}
                        dataKey="count"
                        stroke={`hsl(${index * 60}, 70%, 50%)`}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Most Used Tags */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Most Used Tags</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagMetrics.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tag" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalUsage" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 