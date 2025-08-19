export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CalendarTimelineClient from './CalendarTimelineClient';

async function getTimelineData() {
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

  // Get timeline events for the next 30 days
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error: eventsError } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true });

  if (eventsError) {
    console.error('Error fetching timeline events:', eventsError);
  }

  return events || [];
}

export default async function CalendarTimelinePage() {
  const events = await getTimelineData();
  
  return <CalendarTimelineClient initialEvents={events} />;
}
