'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, ChevronLeft, ChevronRight, CheckCircle, Circle, AlertCircle, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { TimelineEvent, CreateTimelineEventData } from '@/types/timeline';
import { createTimelineEvent, updateTimelineEvent, deleteTimelineEvent, getTimelineEvents } from '@/lib/timeline-db';
import TimelineView from './TimelineView';

interface CalendarTimelineClientProps {
  initialEvents: TimelineEvent[];
}

interface EventFormData {
  title: string;
  description: string;
  event_date: string;
  event_type: TimelineEvent['event_type'];
  category: TimelineEvent['category'];
  priority: TimelineEvent['priority'];
}

const eventTypeColors = {
  general: 'bg-gray-500',
  goal: 'bg-blue-500',
  skill: 'bg-green-500',
  deadline: 'bg-red-500',
  milestone: 'bg-purple-500',
};

export default function CalendarTimelineClient({ initialEvents }: CalendarTimelineClientProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('timeline');
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    event_type: 'general',
    category: 'personal',
    priority: 'medium',
  });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(parseISO(event.event_date), date));
  };

  // Check if event is overdue
  const isOverdue = (event: TimelineEvent) => {
    return !event.is_completed && parseISO(event.event_date) < new Date();
  };

  const handleAddEvent = async () => {
    try {
      await createTimelineEvent(formData);
      setIsAddDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        event_date: format(new Date(), 'yyyy-MM-dd'),
        event_type: 'general',
        category: 'personal',
        priority: 'medium',
      });
      const updatedEvents = await getTimelineEvents();
      setEvents(updatedEvents);
      toast.success('Event added successfully');
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    
    try {
      await updateTimelineEvent(editingEvent.id, formData);
      setIsEditDialogOpen(false);
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        event_date: format(new Date(), 'yyyy-MM-dd'),
        event_type: 'general',
        category: 'personal',
        priority: 'medium',
      });
      const updatedEvents = await getTimelineEvents();
      setEvents(updatedEvents);
      toast.success('Event updated successfully');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteTimelineEvent(eventId);
      const updatedEvents = await getTimelineEvents();
      setEvents(updatedEvents);
      toast.success('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleEditEvent = (event: TimelineEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: format(parseISO(event.event_date), 'yyyy-MM-dd'),
      event_type: event.event_type,
      category: event.category,
      priority: event.priority,
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleComplete = async (event: TimelineEvent) => {
    try {
      await updateTimelineEvent(event.id, { is_completed: !event.is_completed });
      const updatedEvents = await getTimelineEvents();
      setEvents(updatedEvents);
      toast.success('Event updated successfully');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  const handleEventUpdate = async () => {
    try {
      const updatedEvents = await getTimelineEvents();
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Error updating events:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Calendar Timeline</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('timeline')}
            >
              <Clock className="w-4 h-4 mr-2" />
              Timeline
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Event title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                />
                <Select value={formData.event_type} onValueChange={(value: TimelineEvent['event_type']) => setFormData(prev => ({ ...prev, event_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="goal">Goal</SelectItem>
                    <SelectItem value="skill">Skill</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={formData.category} onValueChange={(value: TimelineEvent['category']) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="learning">Learning</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={formData.priority} onValueChange={(value: TimelineEvent['priority']) => setFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button onClick={handleAddEvent} className="flex-1">Add Event</Button>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View Mode Selection */}
      {viewMode === 'timeline' ? (
        <TimelineView events={events} onEventUpdate={handleEventUpdate} />
      ) : (
        <>
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
            <Button variant="outline" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-white p-2 text-center font-medium text-sm">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarDays.map(day => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`bg-white min-h-[120px] p-2 cursor-pointer hover:bg-gray-50 ${
                        isCurrentDay ? 'bg-blue-50 border-2 border-blue-200' : ''
                      }`}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="text-sm font-medium mb-1">
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs p-1 rounded truncate ${
                              eventTypeColors[event.event_type]
                            } text-white cursor-pointer`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEvent(event);
                            }}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Events */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>Events for {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleToggleComplete(event)}
                          className="text-gray-400 hover:text-green-500"
                        >
                          {event.is_completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-medium ${event.is_completed ? 'line-through text-gray-500' : ''}`}>
                              {event.title}
                            </h3>
                            {isOverdue(event) && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-gray-600">{event.description}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={`text-xs ${eventTypeColors[event.event_type]}`}>
                              {event.event_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {event.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEvent(event)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {getEventsForDate(selectedDate).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No events for this date</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Event title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
            <Textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
            <Input
              type="date"
              value={formData.event_date}
              onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
            />
            <Select value={formData.event_type} onValueChange={(value: TimelineEvent['event_type']) => setFormData(prev => ({ ...prev, event_type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="goal">Goal</SelectItem>
                <SelectItem value="skill">Skill</SelectItem>
                <SelectItem value="deadline">Deadline</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formData.category} onValueChange={(value: TimelineEvent['category']) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formData.priority} onValueChange={(value: TimelineEvent['priority']) => setFormData(prev => ({ ...prev, priority: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={handleUpdateEvent} className="flex-1">Update Event</Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
