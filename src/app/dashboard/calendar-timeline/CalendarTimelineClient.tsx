'use client';

import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Timeline from './components/Timeline';
import EventPanel from './components/EventPanel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  getCalendarTimelineEvents, 
  createCalendarTimelineEvent, 
  updateCalendarTimelineEvent, 
  deleteCalendarTimelineEvent,
  type CalendarTimelineEvent 
} from '@/lib/calendar-timeline-db';
import { toast } from 'sonner';

interface TimelineEventData {
  id: string;
  title: string;
  color: string;
  duration: number;
  date?: Date;
}

interface CalendarTimelineClientProps {
  initialEvents: CalendarTimelineEvent[];
}

export default function CalendarTimelineClient({ initialEvents }: CalendarTimelineClientProps) {
  const [events, setEvents] = useState<TimelineEventData[]>([
    { id: '1', title: 'Project Start', color: '#3b82f6', duration: 15 },
    { id: '2', title: 'First Milestone', color: '#10b981', duration: 30 },
    { id: '3', title: 'Second Milestone', color: '#f59e0b', duration: 45 },
    { id: '4', title: 'Project End', color: '#ef4444', duration: 15 },
  ]);
  
  const [timelineEvents, setTimelineEvents] = useState<CalendarTimelineEvent[]>(initialEvents);
  const [isLoading, setIsLoading] = useState(false);

  // Load events from database on mount
  useEffect(() => {
    loadTimelineEvents();
  }, []);

  const loadTimelineEvents = async () => {
    try {
      setIsLoading(true);
      const events = await getCalendarTimelineEvents();
      setTimelineEvents(events);
    } catch (error) {
      console.error('Error loading timeline events:', error);
      toast.error('Failed to load timeline events');
    } finally {
      setIsLoading(false);
    }
  };

  const addEventToTimeline = async (event: TimelineEventData, date: Date) => {
    console.log('🎯 [CalendarTimeline] Attempting to add event:', {
      title: event.title,
      color: event.color,
      duration: event.duration,
      date: date.toISOString()
    });
    console.log('🎯 [CalendarTimeline] Full event object:', event);
    
    try {
      const newEvent = await createCalendarTimelineEvent({
        title: event.title,
        color: event.color,
        duration: event.duration,
        event_date: date
      });
      
      console.log('✅ [CalendarTimeline] Event created successfully:', newEvent);
      setTimelineEvents(prev => [...prev, newEvent]);
      toast.success('Event added to timeline');
    } catch (error) {
      console.error('❌ [CalendarTimeline] Error adding event to timeline:', error);
      toast.error('Failed to add event to timeline');
    }
  };

  const removeEventFromTimeline = async (eventId: string) => {
    try {
      await deleteCalendarTimelineEvent(eventId);
      setTimelineEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success('Event removed from timeline');
    } catch (error) {
      console.error('Error removing event from timeline:', error);
      toast.error('Failed to remove event from timeline');
    }
  };

  const repositionEvent = async (eventId: string, newDate: Date) => {
    try {
      const updatedEvent = await updateCalendarTimelineEvent(eventId, {
        event_date: newDate
      });
      setTimelineEvents(prev => prev.map(event => 
        event.id === eventId ? updatedEvent : event
      ));
      toast.success('Event repositioned');
    } catch (error) {
      console.error('Error repositioning event:', error);
      toast.error('Failed to reposition event');
    }
  };

  const addEvent = (newEvent: TimelineEventData) => {
    setEvents(prev => [...prev, newEvent]);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">
                Interactive Calendar Timeline
              </CardTitle>
              <p className="text-center text-gray-600 dark:text-gray-400">
                Drag events onto the timeline and zoom from hours to years to explore different time scales
              </p>
            </CardHeader>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <EventPanel events={events} onAddEvent={addEvent} />
            </div>
            <div className="lg:col-span-3">
              <Timeline 
                timelineEvents={timelineEvents}
                onAddEvent={addEventToTimeline}
                onRemoveEvent={removeEventFromTimeline}
                onRepositionEvent={repositionEvent}
              />
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
