'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2, Save } from 'lucide-react';
import { actionTimelineService } from '@/services/actionTimelineService';
// Define the ActionTimeline type locally to avoid import issues
interface ActionTimeline {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  data: any;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
  execution_count: number;
  total_execution_time: number;
  favorite: boolean;
}
import { TimelineEngine } from '../types';

interface TimelineSelectorProps {
  currentTimeline: ActionTimeline | null;
  timelineEngine: TimelineEngine;
  onTimelineChange: (timeline: ActionTimeline | null, engine: TimelineEngine) => void;
  onSaveStatusChange: (status: { type: 'success' | 'error' | 'saving' | null; message: string }) => void;
}

export const TimelineSelector: React.FC<TimelineSelectorProps> = ({
  currentTimeline,
  timelineEngine,
  onTimelineChange,
  onSaveStatusChange
}) => {
  const [timelines, setTimelines] = useState<ActionTimeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load available timelines
  const loadTimelines = async () => {
    try {
      const userTimelines = await actionTimelineService.getUserTimelines();
      setTimelines(userTimelines);
    } catch (error) {
      console.error('Error loading timelines:', error);
    }
  };

  useEffect(() => {
    loadTimelines();
  }, []);

  // Save current timeline
  const saveCurrentTimeline = async (showStatus = true) => {
    if (!currentTimeline || !timelineEngine) return;

    try {
      if (showStatus) {
        onSaveStatusChange({ type: 'saving', message: 'Saving timeline...' });
      }

      const timelineData = timelineEngine.toJSON();
      await actionTimelineService.updateTimeline(currentTimeline.id, {
        data: timelineData
      });

      if (showStatus) {
        onSaveStatusChange({ type: 'success', message: 'Timeline saved!' });
      }
    } catch (error) {
      console.error('Error saving timeline:', error);
      onSaveStatusChange({ type: 'error', message: 'Failed to save timeline' });
    }
  };

  // Create new timeline
  const createNewTimeline = async () => {
    if (!newName.trim()) return;

    setLoading(true);
    try {
      const newEngine = new TimelineEngine();
      const savedTimeline = await actionTimelineService.saveTimeline(
        newName.trim(),
        'New action timeline',
        newEngine,
        false,
        [],
        false
      );

      if (savedTimeline) {
        setTimelines(prev => [savedTimeline, ...prev]);
        onTimelineChange(savedTimeline, newEngine);
        setNewName('');
        setIsCreating(false);
        onSaveStatusChange({ type: 'success', message: 'New timeline created!' });
      }
    } catch (error) {
      console.error('Error creating timeline:', error);
      onSaveStatusChange({ type: 'error', message: 'Failed to create timeline' });
    } finally {
      setLoading(false);
    }
  };

  // Load selected timeline
  const loadTimeline = async (timelineId: string) => {
    setLoading(true);
    try {
      const timeline = await actionTimelineService.loadTimeline(timelineId);
      if (timeline) {
        const newEngine = new TimelineEngine();
        newEngine.fromJSON(timeline.data);
        onTimelineChange(timeline, newEngine);
      }
    } catch (error) {
      console.error('Error loading timeline:', error);
      onSaveStatusChange({ type: 'error', message: 'Failed to load timeline' });
    } finally {
      setLoading(false);
    }
  };

  // Delete timeline
  const deleteTimeline = async (timelineId: string) => {
    if (!confirm('Are you sure you want to delete this timeline?')) return;

    try {
      await actionTimelineService.deleteTimeline(timelineId);
      setTimelines(prev => prev.filter(t => t.id !== timelineId));
      
      if (currentTimeline?.id === timelineId) {
        onTimelineChange(null, new TimelineEngine());
      }
      
      onSaveStatusChange({ type: 'success', message: 'Timeline deleted!' });
    } catch (error) {
      console.error('Error deleting timeline:', error);
      onSaveStatusChange({ type: 'error', message: 'Failed to delete timeline' });
    }
  };

  // Rename timeline
  const renameTimeline = async () => {
    if (!currentTimeline || !newName.trim()) return;

    try {
      await actionTimelineService.updateTimeline(currentTimeline.id, {
        name: newName.trim()
      });

      setTimelines(prev => 
        prev.map(t => t.id === currentTimeline.id ? { ...t, name: newName.trim() } : t)
      );
      
      onTimelineChange({ ...currentTimeline, name: newName.trim() }, timelineEngine);
      setEditingName(false);
      setNewName('');
      onSaveStatusChange({ type: 'success', message: 'Timeline renamed!' });
    } catch (error) {
      console.error('Error renaming timeline:', error);
      onSaveStatusChange({ type: 'error', message: 'Failed to rename timeline' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Timeline Selector */}
      <div className="flex flex-col space-y-2">
        <Label className="text-sm font-medium">Select Timeline</Label>
        <div className="flex gap-2">
          <select
            value={currentTimeline?.id || ''}
            onChange={(e) => e.target.value ? loadTimeline(e.target.value) : onTimelineChange(null, new TimelineEngine())}
            className="flex-1 px-2 py-1 border rounded text-sm"
            disabled={loading}
          >
            <option value="">New Timeline</option>
            {timelines.map(timeline => (
              <option key={timeline.id} value={timeline.id}>
                {timeline.name}
              </option>
            ))}
          </select>
          
          {currentTimeline && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => deleteTimeline(currentTimeline.id)}
              className="px-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Timeline Name Editor */}
      {currentTimeline && (
        <div className="flex flex-col space-y-2">
          <Label className="text-sm font-medium">Timeline Name</Label>
          {editingName ? (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Timeline name"
                className="text-sm"
                onKeyPress={(e) => e.key === 'Enter' && renameTimeline()}
              />
              <Button size="sm" onClick={renameTimeline} disabled={!newName.trim()}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditingName(false); setNewName(''); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium flex-1">{currentTimeline.name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setEditingName(true); setNewName(currentTimeline.name); }}
                className="px-2"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create New Timeline */}
      {!currentTimeline && (
        <div className="flex flex-col space-y-2">
          <Label className="text-sm font-medium">Create New Timeline</Label>
          {isCreating ? (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Timeline name"
                className="text-sm"
                onKeyPress={(e) => e.key === 'Enter' && createNewTimeline()}
              />
              <Button size="sm" onClick={createNewTimeline} disabled={!newName.trim() || loading}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setIsCreating(false); setNewName(''); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 w-fit"
            >
              <Plus className="w-4 h-4" />
              Create New Timeline
            </Button>
          )}
        </div>
      )}

      {/* Manual Save Button */}
      {currentTimeline && (
        <Button
          size="sm"
          onClick={() => saveCurrentTimeline(true)}
          className="flex items-center gap-2 w-fit"
          disabled={loading}
        >
          <Save className="w-4 h-4" />
          Save Now
        </Button>
      )}
    </div>
  );
};

// Export the save function for external use
export const useTimelineAutoSave = (
  currentTimeline: ActionTimeline | null,
  timelineEngine: TimelineEngine,
  onSaveStatusChange: (status: { type: 'success' | 'error' | 'saving' | null; message: string }) => void
) => {
  return async (showStatus = false) => {
    if (!currentTimeline || !timelineEngine) return;

    try {
      if (showStatus) {
        onSaveStatusChange({ type: 'saving', message: 'Saving timeline...' });
      }

      const timelineData = timelineEngine.toJSON();
      await actionTimelineService.updateTimeline(currentTimeline.id, {
        data: timelineData
      });

      if (showStatus) {
        onSaveStatusChange({ type: 'success', message: 'Timeline saved!' });
      }
    } catch (error) {
      console.error('Error saving timeline:', error);
      if (showStatus) {
        onSaveStatusChange({ type: 'error', message: 'Failed to save timeline' });
      }
    }
  };
};
