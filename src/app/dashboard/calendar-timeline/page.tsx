export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CalendarTimelineClient from './CalendarTimelineClient';
import { CalendarTimelineEvent } from '@/lib/calendar-timeline-db';

async function getTimelineData(): Promise<CalendarTimelineEvent[]> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  try {
    // Use hardcoded user ID (you)
    const HARDCODED_USER_ID = '875d44ba-8794-4d12-ba86-48e5e90dc796';
    
    console.log('📄 [Page] Fetching events for user:', HARDCODED_USER_ID);
    
    const { data: events, error: eventsError } = await supabase
      .from('calendar_timeline_events')
      .select('*')
      .eq('user_id', HARDCODED_USER_ID)
      .order('event_date', { ascending: true });

    if (eventsError) {
      console.error('❌ [Page] Error fetching calendar timeline events:', eventsError);
      return [];
    }

    console.log('✅ [Page] Fetched events:', events?.length || 0);

    // Add computed date field to each event
    return (events || []).map(event => ({
      ...event,
      date: new Date(event.event_date)
    }));
  } catch (error) {
    console.error('❌ [Page] Error loading timeline events:', error);
    return [];
  }
}

export default async function CalendarTimelinePage() {
  const events = await getTimelineData();
  
  return <CalendarTimelineClient initialEvents={events} />;
}
