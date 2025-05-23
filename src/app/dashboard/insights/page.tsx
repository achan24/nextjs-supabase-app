'use client';

import { User } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Tag, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface TagStats {
  tag: string;
  count: number;
  maps: number;
  completedNodes: number;
  totalNodes: number;
}

interface InsightsPageProps {
  user: User;
}

export default function InsightsPage({ user }: InsightsPageProps) {
  const [tagStats, setTagStats] = useState<TagStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadTagStats();
  }, []);

  const loadTagStats = async () => {
    try {
      // Get all process flows
      const { data: flows, error } = await supabase
        .from('process_flows')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Process all nodes across all flows to gather tag statistics
      const tagMap = new Map<string, TagStats>();

      flows.forEach(flow => {
        const nodes = flow.nodes || [];
        nodes.forEach((node: any) => {
          const tags = node.data?.tags || [];
          tags.forEach((tag: string) => {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, {
                tag,
                count: 0,
                maps: 0,
                completedNodes: 0,
                totalNodes: 0
              });
            }
            
            const stats = tagMap.get(tag)!;
            stats.count++;
            stats.totalNodes++;
            if (node.data?.status === 'completed') {
              stats.completedNodes++;
            }
          });
        });

        // Count unique maps for each tag
        const flowTags = new Set<string>();
        nodes.forEach((node: any) => {
          (node.data?.tags || []).forEach((tag: string) => flowTags.add(tag));
        });
        flowTags.forEach(tag => {
          if (tagMap.has(tag)) {
            tagMap.get(tag)!.maps++;
          }
        });
      });

      setTagStats(Array.from(tagMap.values())
        .sort((a, b) => b.count - a.count));
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading tag statistics:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Insights</h1>
        <p className="text-gray-600">
          Analytics and insights across all your process flows
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading insights...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tagStats.map(stat => (
              <Card key={stat.tag} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Tag className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">#{stat.tag}</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>Used in {stat.maps} map{stat.maps !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{stat.count} node{stat.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          {stat.completedNodes} of {stat.totalNodes} completed
                          ({Math.round((stat.completedNodes / stat.totalNodes) * 100)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 