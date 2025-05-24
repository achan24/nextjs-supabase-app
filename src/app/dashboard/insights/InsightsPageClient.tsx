'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TagMetrics {
  tag: string;
  totalUsage: number;
  todayUsage: number;
  weeklyTrend: { date: string; count: number }[];
  timeSpentToday: number;
  nodes: Array<{
    id: string;
    label: string;
    timeSpent?: number;
    status?: string;
    completedAt?: string;
  }>;
}

interface NodeWithTags {
  id?: string;
  data: {
    tags?: string[];
    status?: string;
    timeSpent?: number;
    label?: string;
    completedAt?: string;
    completionHistory?: Array<{
      timestamp: string;
      timeSpent: number;
    }>;
  };
  created_at: string;
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
    }
  }, [user]);

  const fetchTagMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Fetch process flows for the current user
      console.log('Fetching process flows for user:', user.id);
      const { data: flows, error: flowsError } = await supabase
        .from('process_flows')
        .select('nodes, created_at')
        .eq('user_id', user.id);
      
      console.log('Flows response:', { flows, error: flowsError });
      
      if (flowsError) throw flowsError;

      // Get unique tags from all flows
      const uniqueTags = new Set<string>();
      flows?.forEach(flow => {
        flow.nodes?.forEach((node: any) => {
          if (node.data?.tags?.length) {
            console.log('Node with tags:', {
              id: node.id,
              label: node.data.label,
              tags: node.data.tags,
              status: node.data.status,
              timeSpent: node.data.timeSpent,
              completedAt: node.data.completedAt,
              completionHistory: node.data.completionHistory,
              rawData: node.data
            });
          }
          node.data?.tags?.forEach((tag: string) => {
            uniqueTags.add(tag.toLowerCase());
          });
        });
      });

      console.log('Unique tags found:', Array.from(uniqueTags));

      // Process all nodes from flows
      const allNodes: NodeWithTags[] = flows?.flatMap(flow => {
        console.log('Processing flow:', {
          created_at: flow.created_at,
          nodeCount: flow.nodes?.length
        });
        return flow.nodes.map((node: NodeWithTags) => {
          if (node.data?.status === 'completed') {
            console.log('Found completed node:', {
              id: node.id,
              label: node.data.label,
              status: node.data.status,
              timeSpent: node.data.timeSpent,
              completedAt: node.data.completedAt,
              completionHistory: node.data.completionHistory
            });
          }
          return {
            ...node,
            created_at: flow.created_at
          };
        });
      }) || [];

      // Calculate metrics for each tag
      const metrics: TagMetrics[] = Array.from(uniqueTags).map((tag: string) => {
        // Get nodes with this tag
        const nodesWithTag = allNodes.filter(node => 
          node.data?.tags?.some((t: string) => t.toLowerCase() === tag)
        );

        // Get node details
        const nodeDetails = nodesWithTag.map(node => ({
          id: node.id || '',
          label: node.data?.label || 'Untitled Node',
          timeSpent: node.data?.timeSpent,
          status: node.data?.status,
          completedAt: node.data?.completedAt
        }));

        // Calculate total usage
        const totalUsage = nodesWithTag.length;

        // Calculate today's usage
        const today = new Date().toISOString().split('T')[0];
        const todayUsage = nodesWithTag.filter(node => 
          node.created_at.startsWith(today)
        ).length;
        
        console.log(`Processing tag "${tag}" for today (${today}):`, {
          nodesWithTag: nodesWithTag.length,
          completedNodes: nodesWithTag.filter(n => n.data?.status === 'completed').length,
          nodesWithCompletedAt: nodesWithTag.filter(n => n.data?.completedAt).length,
          nodesWithCompletionHistory: nodesWithTag.filter(n => n.data?.completionHistory).length,
          sampleNodes: nodesWithTag.slice(0, 2).map(n => ({
            id: n.id,
            status: n.data?.status,
            timeSpent: n.data?.timeSpent,
            completedAt: n.data?.completedAt,
            completionHistory: n.data?.completionHistory
          }))
        });

        // Sum up time spent on tasks completed today
        const timeSpentToday = nodesWithTag
          .filter(node => {
            const isCompletedToday = node.data?.completedAt?.startsWith(today);
            if (node.data?.status === 'completed') {
              console.log('Checking completed node for today:', {
                id: node.id,
                label: node.data.label,
                completedAt: node.data?.completedAt,
                isCompletedToday,
                timeSpent: node.data?.timeSpent
              });
            }
            return isCompletedToday;
          })
          .reduce((sum, node) => sum + (node.data?.timeSpent || 0), 0);

        console.log(`Stats for "${tag}":`, {
          totalNodes: totalUsage,
          todayNodes: todayUsage,
          timeSpentToday,
          nodeDetails: nodeDetails.slice(0, 2) // Only log first 2 nodes for brevity
        });

        // Calculate weekly trend
        const weeklyTrend = calculateWeeklyTrend(nodesWithTag);

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

  const calculateWeeklyTrend = (nodes: NodeWithTags[]) => {
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

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`;
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

          {/* Today's Activity */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Today's Tag Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tagMetrics
                .filter(metric => metric.todayUsage > 0)
                .map(metric => (
                  <div key={metric.tag} className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium">#{metric.tag}</div>
                    <div className="text-2xl font-bold text-blue-600">{metric.todayUsage}</div>
                    <div className="text-sm text-gray-600">uses today</div>
                    {metric.timeSpentToday > 0 && (
                      <div className="text-sm text-green-600 mt-1">
                        Time spent: {formatTime(metric.timeSpentToday)}
                      </div>
                    )}
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
                          Today: {formatTime(metric.timeSpentToday)}
                        </span>
                      )}
                    </div>
                  </button>
                  {expandedTags.has(metric.tag) && (
                    <div className="border-t">
                      <div className="grid gap-2 p-4">
                        {metric.nodes.map(node => (
                          <div key={node.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="font-medium">{node.label}</span>
                            <div className="flex items-center gap-2">
                              {node.timeSpent && (
                                <span className="text-sm text-gray-600">{formatTime(node.timeSpent)}</span>
                              )}
                              {node.status === 'completed' && (
                                <span className="text-green-500">✓</span>
                              )}
                            </div>
                          </div>
                        ))}
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
          </Card>
        </div>
      )}
    </div>
  );
} 