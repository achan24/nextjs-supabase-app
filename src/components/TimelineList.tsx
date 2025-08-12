"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseBrowser } from '@/lib/supabase/client';
import { timelineDB, Timeline } from '@/lib/timeline-db';
import { Plus, Clock, Edit, Trash2, Play } from 'lucide-react';

export default function TimelineList() {
  const supabase = useSupabaseBrowser();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  // Load timelines
  useEffect(() => {
    const loadTimelines = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const userTimelines = await timelineDB.getTimelines(user.id);
        setTimelines(userTimelines);
      } catch (error) {
        console.error('Failed to load timelines:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTimelines();
  }, [user]);

  const createTimeline = async () => {
    if (!user || !newTimelineTitle.trim()) return;
    
    try {
      const newTimeline = await timelineDB.createTimeline({
        title: newTimelineTitle.trim(),
        description: '',
        userId: user.id,
        rootNodeId: null,
      });
      
      setTimelines(prev => [...prev, newTimeline]);
      setNewTimelineTitle('');
      setShowCreateForm(false);
      
      // Navigate to the new timeline
      router.push(`/dashboard/decision-timelines/${newTimeline.id}`);
    } catch (error) {
      console.error('Failed to create timeline:', error);
    }
  };

  const deleteTimeline = async (timelineId: string) => {
    if (!confirm('Are you sure you want to delete this timeline? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Note: This will cascade delete all nodes due to foreign key constraints
      const { error } = await supabase
        .from('timelines')
        .delete()
        .eq('id', timelineId);
      
      if (error) throw error;
      
      setTimelines(prev => prev.filter(t => t.id !== timelineId));
    } catch (error) {
      console.error('Failed to delete timeline:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timelines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-900">Decision Timelines</h1>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Timeline
            </button>
          </div>
          <p className="mt-2 text-gray-600">Create and manage your decision timelines</p>
        </div>

        {/* Create Timeline Form */}
        {showCreateForm && (
          <div className="mb-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Create New Timeline</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTimelineTitle}
                onChange={(e) => setNewTimelineTitle(e.target.value)}
                placeholder="Enter timeline title..."
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyPress={(e) => e.key === 'Enter' && createTimeline()}
              />
              <button
                onClick={createTimeline}
                disabled={!newTimelineTitle.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewTimelineTitle('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Timelines Grid */}
        {timelines.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No timelines yet</h3>
            <p className="text-gray-600 mb-6">Create your first timeline to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create First Timeline
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timelines.map((timeline) => (
              <div
                key={timeline.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {timeline.title}
                    </h3>
                    {timeline.description && (
                      <p className="text-sm text-gray-600">{timeline.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Created {new Date(timeline.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/decision-timelines/${timeline.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/decision-timelines/${timeline.id}/run`)}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    Run
                  </button>
                  <button
                    onClick={() => deleteTimeline(timeline.id)}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
