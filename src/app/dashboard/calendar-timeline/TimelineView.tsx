'use client';

import { useState, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { TimelineEvent, CreateTimelineEventData } from '@/types/timeline';
import { createTimelineEvent, updateTimelineEvent, deleteTimelineEvent } from '@/lib/timeline-db';

interface TimelineViewProps {
  events: TimelineEvent[];
  onEventUpdate: () => void;
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

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function TimelineView({ events, onEventUpdate }: TimelineViewProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    event_type: 'general',
    category: 'personal',
    priority: 'medium',
  });

  // Calculate timeline range
  const timelineRange = useMemo(() => {
    if (events.length === 0) {
      const now = new Date();
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    }

    const dates = events.map(event => parseISO(event.event_date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return {
      start: startOfMonth(minDate),
      end: endOfMonth(maxDate),
    };
  }, [events]);

  // Generate timeline months
  const timelineMonths = useMemo(() => {
    return eachMonthOfInterval(timelineRange);
  }, [timelineRange]);

  // Group events by month
  const eventsByMonth = useMemo(() => {
    const grouped: Record<string, TimelineEvent[]> = {};
    events.forEach(event => {
      const monthKey = format(parseISO(event.event_date), 'yyyy-MM');
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(event);
    });
    return grouped;
  }, [events]);

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
      onEventUpdate();
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
      onEventUpdate();
      toast.success('Event updated successfully');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteTimelineEvent(eventId);
      onEventUpdate();
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

  const getEventsForMonth = (month: Date) => {
    const monthKey = format(month, 'yyyy-MM');
    return eventsByMonth[monthKey] || [];
  };

  const isOverdue = (event: TimelineEvent) => {
    return !event.is_completed && parseISO(event.event_date) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Timeline View</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Timeline Event</DialogTitle>
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

      {/* Timeline Visualization */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            {/* Timeline Bar */}
            <div className="relative h-2 bg-blue-500 rounded-full mb-8">
              {/* Timeline months */}
              <div className="absolute -top-8 left-0 right-0 flex justify-between text-xs text-gray-600">
                {timelineMonths.map((month, index) => (
                  <div key={month.toISOString()} className="text-center">
                    <div className="font-medium">{format(month, 'MMM')}</div>
                    <div>{format(month, 'yyyy')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Events */}
            <div className="relative">
              {timelineMonths.map((month, monthIndex) => {
                const monthEvents = getEventsForMonth(month);
                return monthEvents.map((event, eventIndex) => {
                  const eventDate = parseISO(event.event_date);
                  const monthStart = startOfMonth(month);
                  const monthEnd = endOfMonth(month);
                  const progressInMonth = (eventDate.getTime() - monthStart.getTime()) / (monthEnd.getTime() - monthStart.getTime());
                  const position = (monthIndex + progressInMonth) / timelineMonths.length;
                  const isAbove = eventIndex % 2 === 0;

                  return (
                    <div
                      key={event.id}
                      className="absolute"
                      style={{
                        left: `${position * 100}%`,
                        top: isAbove ? '-120px' : '40px',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {/* Event Line */}
                      <div className={`w-0.5 h-16 bg-gray-400 mx-auto ${isAbove ? 'mb-2' : 'mt-2'}`}>
                        <div className={`w-3 h-3 rounded-full ${eventTypeColors[event.event_type]} mx-auto -mt-1.5`} />
                      </div>

                      {/* Event Card */}
                      <div className={`w-64 bg-white border rounded-lg shadow-lg p-3 ${isAbove ? 'mb-2' : 'mt-2'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className={`font-medium text-sm ${event.is_completed ? 'line-through text-gray-500' : ''}`}>
                            {event.title}
                          </h4>
                          {isOverdue(event) && (
                            <div className="w-2 h-2 bg-red-500 rounded-full" title="Overdue" />
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{event.description}</p>
                        )}
                        <div className="text-xs text-gray-500 mb-2">
                          {format(eventDate, 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          <Badge className={`text-xs ${eventTypeColors[event.event_type]}`}>
                            {event.event_type}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${priorityColors[event.priority]}`}>
                            {event.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => handleEditEvent(event)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Timeline Event</DialogTitle>
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
