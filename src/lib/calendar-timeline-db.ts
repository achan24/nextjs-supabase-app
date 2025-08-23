import { createClient } from '@/lib/supabase/client';

export interface CalendarTimelineEvent {
  id: string;
  user_id: string;
  title: string;
  color: string;
  duration: number; // in minutes
  event_date: string; // ISO string
  created_at: string;
  updated_at: string;
  date?: Date; // computed field for the frontend
}

export interface CreateCalendarTimelineEventData {
  title: string;
  color: string;
  duration: number;
  event_date: Date;
}

export interface UpdateCalendarTimelineEventData {
  title?: string;
  color?: string;
  duration?: number;
  event_date?: Date;
}

// Create a new calendar timeline event
export async function createCalendarTimelineEvent(data: CreateCalendarTimelineEventData): Promise<CalendarTimelineEvent> {
  console.log('🗄️ [DB] Creating calendar timeline event:', data);
  
  const supabase = createClient();
  
  // Use hardcoded user ID (you)
  const HARDCODED_USER_ID = '875d44ba-8794-4d12-ba86-48e5e90dc796';
  
  console.log('✅ [DB] Using hardcoded user ID:', HARDCODED_USER_ID);
  
  const insertData = {
    title: data.title,
    color: data.color,
    duration: data.duration,
    event_date: data.event_date.toISOString(),
    user_id: HARDCODED_USER_ID
  };
  
  console.log('📝 [DB] Inserting data:', insertData);
  
  const { data: event, error } = await supabase
    .from('calendar_timeline_events')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('❌ [DB] Insert error:', error);
    throw error;
  }
  
  console.log('✅ [DB] Event created successfully:', event);
  
  // Add computed date field
  return {
    ...event,
    date: new Date(event.event_date)
  };
}

// Get all calendar timeline events for the current user
export async function getCalendarTimelineEvents(): Promise<CalendarTimelineEvent[]> {
  console.log('🗄️ [DB] Fetching calendar timeline events');
  
  const supabase = createClient();
  
  // Use hardcoded user ID (you)
  const HARDCODED_USER_ID = '875d44ba-8794-4d12-ba86-48e5e90dc796';
  
  console.log('✅ [DB] Using hardcoded user ID:', HARDCODED_USER_ID);

  const { data: events, error } = await supabase
    .from('calendar_timeline_events')
    .select('*')
    .eq('user_id', HARDCODED_USER_ID)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('❌ [DB] Fetch error:', error);
    throw error;
  }
  
  console.log('✅ [DB] Fetched events:', events?.length || 0);
  
  // Add computed date field to each event
  return (events || []).map(event => ({
    ...event,
    date: new Date(event.event_date)
  }));
}

// Update a calendar timeline event
export async function updateCalendarTimelineEvent(id: string, data: UpdateCalendarTimelineEventData): Promise<CalendarTimelineEvent> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.duration !== undefined) updateData.duration = data.duration;
  if (data.event_date !== undefined) updateData.event_date = data.event_date.toISOString();

  const { data: event, error } = await supabase
    .from('calendar_timeline_events')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  
  // Add computed date field
  return {
    ...event,
    date: new Date(event.event_date)
  };
}

// Delete a calendar timeline event
export async function deleteCalendarTimelineEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { error } = await supabase
    .from('calendar_timeline_events')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// Get calendar timeline events by date range
export async function getCalendarTimelineEventsByDateRange(startDate: Date, endDate: Date): Promise<CalendarTimelineEvent[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { data: events, error } = await supabase
    .from('calendar_timeline_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('event_date', startDate.toISOString())
    .lte('event_date', endDate.toISOString())
    .order('event_date', { ascending: true });

  if (error) throw error;
  
  // Add computed date field to each event
  return (events || []).map(event => ({
    ...event,
    date: new Date(event.event_date)
  }));
}
