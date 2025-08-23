'use client';

import { useState } from 'react';
import DraggableEvent from './DraggableEvent';
import './EventPanel.css';

interface TimelineEventData {
  id: string;
  title: string;
  color: string;
  duration: number;
  date?: Date;
}

interface EventPanelProps {
  events: TimelineEventData[];
  onAddEvent: (event: TimelineEventData) => void;
}

const EventPanel = ({ events, onAddEvent }: EventPanelProps) => {
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventColor, setNewEventColor] = useState('#3b82f6');
  const [newEventDuration, setNewEventDuration] = useState(15);
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEventTitle.trim()) {
      const newEvent: TimelineEventData = {
        id: Date.now().toString(),
        title: newEventTitle.trim(),
        color: newEventColor,
        duration: newEventDuration
      };
      onAddEvent(newEvent);
      setNewEventTitle('');
      setNewEventDuration(15);
      setIsAddingEvent(false);
    }
  };

  const predefinedColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16'  // lime
  ];

  return (
    <div className="event-panel">
      <div className="panel-header">
        <h3>Available Events</h3>
        <button 
          className="add-event-btn"
          onClick={() => setIsAddingEvent(!isAddingEvent)}
        >
          {isAddingEvent ? '×' : '+'}
        </button>
      </div>
      
      {isAddingEvent && (
        <form className="add-event-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Event title"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            className="event-title-input"
            autoFocus
          />
          <div className="duration-input-wrapper">
            <label htmlFor="duration-input">Duration (minutes):</label>
            <input
              id="duration-input"
              type="number"
              min="1"
              max="1440"
              value={newEventDuration}
              onChange={(e) => setNewEventDuration(parseInt(e.target.value) || 15)}
              className="duration-input"
            />
          </div>
          <div className="color-picker">
            {predefinedColors.map(color => (
              <button
                key={color}
                type="button"
                className={`color-option ${newEventColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setNewEventColor(color)}
              />
            ))}
          </div>
          <div className="form-actions">
            <button type="submit" className="create-btn">Create</button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => {
                setIsAddingEvent(false);
                setNewEventTitle('');
                setNewEventDuration(15);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      
      <p>Drag events onto the timeline</p>
      
      <div className="events-list">
        {events.map((event) => (
          <DraggableEvent key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default EventPanel;
