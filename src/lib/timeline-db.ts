import { createClient } from '@/lib/supabase/client';

import type { TimelineEvent, CreateTimelineEventData, UpdateTimelineEventData, TimelineFilters } from '@/types/timeline';

export interface Timeline {
  id: string;
  title: string;
  description?: string;
  userId: string;
  rootNodeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineNode {
  id: string;
  timelineId: string;
  title: string;
  kind: 'action' | 'decision';
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  defaultDurationMs?: number;
  chosenChildId?: string | null;
}

export interface TimelineActionRecord {
  id: string;
  nodeId: string;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  userId: string;
}

export interface TimelineDecisionRecord {
  id: string;
  nodeId: string;
  chosenChildId: string;
  decidedAt: string;
  userId: string;
}

export interface TimelineGraph {
  timeline: Timeline;
  nodes: TimelineNode[];
  rootId?: string;
}

class TimelineDB {
  private supabase = createClient();

  private mapTimeline(row: any): Timeline {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      userId: row.user_id,
      rootNodeId: row.root_node_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapNode(row: any): TimelineNode {
    return {
      id: row.id,
      timelineId: row.timeline_id,
      title: row.title,
      kind: row.kind,
      parentId: row.parent_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userId: row.user_id,
      defaultDurationMs: row.default_duration_ms ?? undefined,
      chosenChildId: row.chosen_child_id ?? null,
    };
  }

  // Get all timelines for a user
  async getTimelines(userId: string): Promise<Timeline[]> {
    const { data, error } = await this.supabase
      .from('timelines')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapTimeline);
  }

  // Get a single timeline
  async getTimeline(id: string): Promise<Timeline | null> {
    const { data, error } = await this.supabase
      .from('timelines')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? this.mapTimeline(data) : null;
  }

  // Create a new timeline
  async createTimeline(timeline: Omit<Timeline, 'id' | 'createdAt' | 'updatedAt'>): Promise<Timeline> {
    const { data, error } = await this.supabase
      .from('timelines')
      .insert({
        title: timeline.title,
        description: timeline.description,
        user_id: timeline.userId,
        // Do not include root_node_id on insert; set later after creating root node
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapTimeline(data);
  }

  // Get all nodes for a specific timeline
  async getNodes(timelineId: string): Promise<TimelineNode[]> {
    const { data, error } = await this.supabase
      .from('timeline_nodes')
      .select('*')
      .eq('timeline_id', timelineId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapNode);
  }

  // Get a single node
  async getNode(id: string): Promise<TimelineNode | null> {
    const { data, error } = await this.supabase
      .from('timeline_nodes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? this.mapNode(data) : null;
  }

  // Create a new node
  async createNode(node: Omit<TimelineNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimelineNode> {
    const { data, error } = await this.supabase
      .from('timeline_nodes')
      .insert({
        timeline_id: node.timelineId,
        title: node.title,
        kind: node.kind,
        parent_id: node.parentId,
        user_id: node.userId,
        default_duration_ms: node.defaultDurationMs,
        chosen_child_id: node.chosenChildId,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapNode(data);
  }

  // Update a node
  async updateNode(id: string, updates: Partial<TimelineNode>): Promise<TimelineNode> {
    const { data, error } = await this.supabase
      .from('timeline_nodes')
      .update({
        title: updates.title,
        default_duration_ms: updates.defaultDurationMs,
        chosen_child_id: updates.chosenChildId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapNode(data);
  }

  // Delete a node (cascades to children)
  async deleteNode(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('timeline_nodes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Get action records for a node
  async getActionRecords(nodeId: string): Promise<TimelineActionRecord[]> {
    const { data, error } = await this.supabase
      .from('timeline_action_records')
      .select('*')
      .eq('node_id', nodeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Record an action completion
  async recordAction(record: Omit<TimelineActionRecord, 'id'>): Promise<TimelineActionRecord> {
    const { data, error } = await this.supabase
      .from('timeline_action_records')
      .insert({
        node_id: record.nodeId,
        duration_ms: record.durationMs,
        started_at: record.startedAt,
        completed_at: record.completedAt,
        user_id: record.userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get decision records for a node
  async getDecisionRecords(nodeId: string): Promise<TimelineDecisionRecord[]> {
    const { data, error } = await this.supabase
      .from('timeline_decision_records')
      .select('*')
      .eq('node_id', nodeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Record a decision choice
  async recordDecision(record: Omit<TimelineDecisionRecord, 'id'>): Promise<TimelineDecisionRecord> {
    const { data, error } = await this.supabase
      .from('timeline_decision_records')
      .insert({
        node_id: record.nodeId,
        chosen_child_id: record.chosenChildId,
        decided_at: record.decidedAt,
        user_id: record.userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get the complete graph for a timeline
  async getGraph(timelineId: string): Promise<TimelineGraph> {
    const timeline = await this.getTimeline(timelineId);
    if (!timeline) throw new Error('Timeline not found');
    
    const nodes = await this.getNodes(timelineId);
    
    return {
      timeline,
      nodes,
      rootId: timeline.rootNodeId || undefined,
    };
  }

  // Get the first timeline for a user (or create one if none exists)
  async getFirstTimeline(userId: string): Promise<Timeline> {
    const timelines = await this.getTimelines(userId);
    
    if (timelines.length === 0) {
      // Create a default timeline
      const defaultTimeline = await this.createTimeline({
        title: 'My First Timeline',
        description: 'Default timeline',
        userId,
        rootNodeId: null,
      });
      return defaultTimeline;
    }
    
    return timelines[0];
  }

  // Calculate average duration for an action node
  async getAverageDuration(nodeId: string): Promise<number | null> {
    const records = await this.getActionRecords(nodeId);
    if (records.length === 0) return null;
    
    const totalDuration = records.reduce((sum, record) => sum + record.durationMs, 0);
    return Math.round(totalDuration / records.length);
  }
}

export const timelineDB = new TimelineDB();

export async function upsertEbookByPath(storagePath: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No auth');
  const payload = { user_id: user.id, storage_path: storagePath } as const;
  const { data, error } = await supabase
    .from('ebooks')
    .upsert(payload, { onConflict: 'user_id,storage_path' })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

export async function fetchBookmarks(ebookId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ebook_bookmarks')
    .select('id,page,label,created_at')
    .eq('ebook_id', ebookId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addBookmarkSql(ebookId: string, page: number, label: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No auth');
  const { data, error } = await supabase
    .from('ebook_bookmarks')
    .insert({ ebook_id: ebookId, page, label, user_id: user.id })
    .select('id,page,label,created_at')
    .single();
  if (error) throw error;
  return data!;
}

export async function updateBookmarkLabel(id: string, label: string) {
  const supabase = createClient();
  const { error } = await supabase.from('ebook_bookmarks').update({ label }).eq('id', id);
  if (error) throw error;
}

export async function removeBookmark(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('ebook_bookmarks').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchNotes(ebookId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ebook_notes')
    .select('id,content')
    .eq('ebook_id', ebookId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function saveNotes(ebookId: string, content: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No auth');
  const existing = await fetchNotes(ebookId);
  if (existing) {
    const { error } = await supabase
      .from('ebook_notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('ebook_notes')
      .insert({ ebook_id: ebookId, content, user_id: user.id });
    if (error) throw error;
  }
}

export async function saveProgress(storagePath: string, lastPage: number, lastZoom: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  try {
    // First ensure the ebook record exists
    await upsertEbookByPath(storagePath);
    
    // Then update the progress
    const { error } = await supabase
      .from('ebooks')
      .update({ last_page: lastPage, last_zoom: lastZoom })
      .eq('user_id', user.id)
      .eq('storage_path', storagePath);
    
    if (error) {
      console.warn('[Ebooks] Failed to save progress:', error);
    }
  } catch (e) {
    console.warn('[Ebooks] Error saving progress:', e);
  }
}

export async function getProgress(storagePath: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  try {
    const { data, error } = await supabase
      .from('ebooks')
      .select('last_page,last_zoom')
      .eq('user_id', user.id)
      .eq('storage_path', storagePath)
      .maybeSingle();
    
    if (error) {
      console.warn('[Ebooks] Failed to get progress:', error);
      return null;
    }
    
    return data || null;
  } catch (e) {
    console.warn('[Ebooks] Error getting progress:', e);
    return null;
  }
}

// Timeline Events Functions
export async function createTimelineEvent(data: CreateTimelineEventData): Promise<TimelineEvent> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { data: event, error } = await supabase
    .from('timeline_events')
    .insert({ ...data, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return event;
}

export async function getTimelineEvents(filters?: TimelineFilters): Promise<TimelineEvent[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  let query = supabase
    .from('timeline_events')
    .select('*')
    .eq('user_id', user.id)
    .order('event_date', { ascending: true });

  if (filters) {
    if (filters.start_date) {
      query = query.gte('event_date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('event_date', filters.end_date);
    }
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.is_completed !== undefined) {
      query = query.eq('is_completed', filters.is_completed);
    }
    if (filters.related_goal_id) {
      query = query.eq('related_goal_id', filters.related_goal_id);
    }
    if (filters.related_skill_id) {
      query = query.eq('related_skill_id', filters.related_skill_id);
    }
  }

  const { data: events, error } = await query;
  if (error) throw error;
  return events || [];
}

export async function getTimelineEvent(id: string): Promise<TimelineEvent | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { data: event, error } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return event;
}

export async function updateTimelineEvent(id: string, data: UpdateTimelineEventData): Promise<TimelineEvent> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { data: event, error } = await supabase
    .from('timeline_events')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return event;
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { error } = await supabase
    .from('timeline_events')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getTimelineEventsByDateRange(startDate: string, endDate: string): Promise<TimelineEvent[]> {
  return getTimelineEvents({ start_date: startDate, end_date: endDate });
}

export async function getUpcomingTimelineEvents(days: number = 7): Promise<TimelineEvent[]> {
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return getTimelineEvents({ start_date: startDate, end_date: endDate });
}

export async function getOverdueTimelineEvents(): Promise<TimelineEvent[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { data: events, error } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('user_id', user.id)
    .lt('event_date', new Date().toISOString())
    .eq('is_completed', false)
    .order('event_date', { ascending: true });

  if (error) throw error;
  return events || [];
}
