'use client';

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

export default function InsightsPage() {
  const [tagStats, setTagStats] = useState<TagStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadTagStats();
  }, []);

  const loadTagStats = async () => {
    try {
      setIsLoading(true);
      const { data: flows, error } = await supabase
        .from('process_flows')
        .select('*');

      if (error) throw error;

      const statsMap = new Map<string, TagStats>();

      flows?.forEach(flow => {
        if (!Array.isArray(flow.nodes)) return;

        flow.nodes.forEach((node: any) => {
          if (!Array.isArray(node.data?.tags)) return;

          node.data.tags.forEach((tag: string) => {
            const stats = statsMap.get(tag) || {
              tag,
              count: 0,
              maps: 0,
              completedNodes: 0,
              totalNodes: 0
            };

            stats.count++;
            stats.totalNodes++;
            if (node.data.status === 'completed') {
              stats.completedNodes++;
            }

            // Only increment maps count once per tag per flow
            if (!statsMap.has(tag)) {
              stats.maps++;
            }

            statsMap.set(tag, stats);
          });
        });
      });

      setTagStats(Array.from(statsMap.values()));
    } catch (error) {
      console.error('Error loading tag stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Insights</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div>Loading tag statistics...</div>
        ) : tagStats.length === 0 ? (
          <div>No tags found in any maps.</div>
        ) : (
          tagStats.map(stat => (
            <Card key={stat.tag} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4" />
                <h3 className="text-lg font-semibold">#{stat.tag}</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>Used in {stat.maps} map{stat.maps !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Total occurrences: {stat.count}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    Completion rate: {stat.totalNodes > 0 
                      ? Math.round((stat.completedNodes / stat.totalNodes) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 