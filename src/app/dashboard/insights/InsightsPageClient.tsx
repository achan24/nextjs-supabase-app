'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ChevronDown, ChevronRight, Link2 } from 'lucide-react';
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

  const getNodeCompletionsToday = (node: NodeDetail) => {
    const today = new Date().toISOString().split('T')[0];
    const completions = node.completionHistory?.filter(record => {
      const completionDate = new Date(record.completedAt).toISOString().split('T')[0];
      console.log('Comparing dates:', {
        nodeLabel: node.label,
        today,
        completionDate,
        completionTimestamp: record.completedAt,
        isToday: completionDate === today
      });
      return completionDate === today;
    }) || [];
    return completions;
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
            <h2 className="text-xl font-semibold mb-4">Today's Timeline</h2>
            <div className="space-y-1">
              {getHourSlots().map(slot => {
                // Get all tasks completed in this hour across all tags
                const hourTasks: Array<{ node: NodeDetail, completion: any }> = [];
                tagMetrics.forEach(metric => {
                  metric.nodes.forEach(node => {
                    const todayCompletions = getNodeCompletionsToday(node);
                    todayCompletions.forEach(completion => {
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
          </Card>

          {/* Today's Activity */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Today's Tag Activity</h2>
            <div className="space-y-4">
              {tagMetrics
                .filter(metric => {
                  // Only show tags that have completions today
                  const hasCompletionsToday = metric.nodes.some(node => 
                    getNodeCompletionsToday(node).length > 0
                  );
                  return hasCompletionsToday;
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
                        .filter(node => getNodeCompletionsToday(node).length > 0)
                        // Sort nodes by their earliest completion time today
                        .sort((a, b) => {
                          const aTime = Math.min(...getNodeCompletionsToday(a).map(c => c.completedAt));
                          const bTime = Math.min(...getNodeCompletionsToday(b).map(c => c.completedAt));
                          return aTime - bTime;
                        })
                        .map(node => {
                          const todayCompletions = getNodeCompletionsToday(node);
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
                                  {todayCompletions
                                    .sort((a, b) => a.completedAt - b.completedAt)
                                    .map((completion, idx) => (
                                      <span key={completion.completedAt}>
                                        {formatStartTime(completion.completedAt)} - {formatTimeForDisplay(completion.timeSpent)}
                                        {completion.note && ` - ${completion.note}`}
                                        {idx < todayCompletions.length - 1 && ', '}
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
                          const todayCompletions = getNodeCompletionsToday(node);
                          const hasCompletionsToday = todayCompletions.length > 0;
                          
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
                                {hasCompletionsToday && (
                                  <div className="text-sm text-gray-600">
                                    {todayCompletions.map((completion, idx) => (
                                      <div key={completion.completedAt}>
                                        {formatTimeForDisplay(completion.timeSpent)}
                                        {completion.note && ` - ${completion.note}`}
                                        {idx < todayCompletions.length - 1 && ', '}
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