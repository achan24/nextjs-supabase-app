'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { format, addDays, addMonths, addYears, subDays, subMonths, subYears } from 'date-fns';
import TimelineEvent from './TimelineEvent';
import './Timeline.css';

interface TimelineEventData {
  id: string;
  title: string;
  color: string;
  duration: number;
  date?: Date;
}

interface TimelineConfig {
  totalUnits: number;
  unitWidth: number;
  getUnitDate: (index: number) => Date;
  formatLabel: (date: Date) => string;
  unitLabel: string;
}

interface TimelineProps {
  timelineEvents: (TimelineEventData | { id: string; title: string; color: string; duration: number; date?: Date })[];
  onAddEvent: (event: TimelineEventData, date: Date) => void;
  onRemoveEvent: (eventId: string) => void;
  onRepositionEvent: (eventId: string, newDate: Date) => void;
}

interface DragItem {
  id: string;
  type: string;
  isRepositioning?: boolean;
}

const Timeline = ({ timelineEvents, onAddEvent, onRemoveEvent, onRepositionEvent }: TimelineProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState<'hour' | 'day' | 'month' | 'year'>('day');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [hoverTime, setHoverTime] = useState<Date | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0, relativeX: 0 });
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Timeline configuration based on zoom level
  const getTimelineConfig = (): TimelineConfig => {
    switch (zoomLevel) {
      case 'hour':
        return {
          totalUnits: 24, // Show 24 hours
          unitWidth: 120, // Increased width for better visibility
          getUnitDate: (index: number) => {
            const baseDate = new Date(currentDate);
            baseDate.setHours(index, 0, 0, 0);
            return baseDate;
          },
          formatLabel: (date: Date) => {
            const hour = date.getHours();
            return `${hour.toString().padStart(2, '0')}:00`;
          },
          unitLabel: 'Hour'
        };
      case 'day':
        return {
          totalUnits: 7, // Show 7 days (week view)
          unitWidth: containerRef.current ? Math.floor(containerRef.current.clientWidth / 7) : 120,
          getUnitDate: (index: number) => addDays(currentDate, index - 3), // Center current date (3 days before, 3 after)
          formatLabel: (date: Date) => {
            const dayName = format(date, 'EEE');
            const monthDate = format(date, 'MMM dd');
            return `${dayName}\n${monthDate}`;
          },
          unitLabel: 'Day'
        };
      case 'month':
        return {
          totalUnits: 12, // Show 12 months
          unitWidth: 150,
          getUnitDate: (index: number) => addMonths(currentDate, index - 6),
          formatLabel: (date: Date) => format(date, 'MMM yyyy'),
          unitLabel: 'Month'
        };
      case 'year':
        return {
          totalUnits: 10, // Show 10 years
          unitWidth: 200,
          getUnitDate: (index: number) => addYears(currentDate, index - 5),
          formatLabel: (date: Date) => format(date, 'yyyy'),
          unitLabel: 'Year'
        };
      default:
        return getTimelineConfig();
    }
  };

  const config = getTimelineConfig();

  // Calculate time at mouse position
  const getTimeAtPosition = (clientX: number): Date | null => {
    if (!timelineRef.current) return null;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left + scrollPosition;
    const unitIndex = Math.floor(relativeX / config.unitWidth);
    
    if (unitIndex < 0 || unitIndex >= config.totalUnits) return null;
    
    const targetDate = config.getUnitDate(unitIndex);
    
    // For hour view, calculate more precise time within the hour
    if (zoomLevel === 'hour') {
      const positionInUnit = (relativeX % config.unitWidth) / config.unitWidth;
      const minutesIntoHour = Math.floor(positionInUnit * 60);
      const newDate = new Date(targetDate);
      newDate.setMinutes(minutesIntoHour);
      return newDate;
    }
    
    return targetDate;
  };

  // Handle mouse move for hover time display
  const handleMouseMove = (event: React.MouseEvent) => {
    const time = getTimeAtPosition(event.clientX);
    setHoverTime(time);
    
    // Calculate relative position for cursor line
    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      setMousePosition({ x: event.clientX, y: event.clientY, relativeX });
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  // Drop zone for events
  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: ['event', 'timeline-event'],
    hover: (item, monitor) => {
      // Update hover time during drag
      const clientOffset = monitor.getClientOffset();
      if (clientOffset) {
        const time = getTimeAtPosition(clientOffset.x);
        setHoverTime(time);
        setMousePosition({ 
          x: clientOffset.x, 
          y: clientOffset.y, 
          relativeX: clientOffset.x - (timelineRef.current?.getBoundingClientRect().left || 0) 
        });
      }
    },
    drop: (item, monitor) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      const relativeX = clientOffset.x - rect.left + scrollPosition;

      // Calculate which date this corresponds to
      const unitIndex = Math.floor(relativeX / config.unitWidth);
      const targetDate = config.getUnitDate(unitIndex);
      
      // For hour view, calculate more precise time within the hour
      if (zoomLevel === 'hour') {
        const positionInUnit = (relativeX % config.unitWidth) / config.unitWidth;
        const minutesIntoHour = Math.floor(positionInUnit * 60);
        targetDate.setMinutes(minutesIntoHour);
      }

      // Check if this is a repositioning operation or new event
      if (item.isRepositioning) {
        onRepositionEvent(item.id, targetDate);
      } else {
        // The dragged item IS the event data (from DraggableEvent)
        console.log('🎯 [Timeline] Drop detected:', item);
        onAddEvent(item, targetDate);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Scroll handling
  const handleScroll = (direction: number) => {
    const scrollAmount = config.unitWidth;
    const newPosition = scrollPosition + (direction * scrollAmount);
    const maxScroll = Math.max(0, (config.totalUnits * config.unitWidth) - (containerRef.current?.clientWidth || 800));
    
    setScrollPosition(Math.max(0, Math.min(newPosition, maxScroll)));
  };

  // Navigate timeline
  const navigateTimeline = (direction: number) => {
    switch (zoomLevel) {
      case 'hour':
        setCurrentDate(prev => {
          const newDate = new Date(prev);
          newDate.setHours(newDate.getHours() + (direction > 0 ? 12 : -12));
          return newDate;
        });
        break;
      case 'day':
        setCurrentDate(prev => direction > 0 ? addDays(prev, 7) : subDays(prev, 7));
        break;
      case 'month':
        setCurrentDate(prev => direction > 0 ? addMonths(prev, 3) : subMonths(prev, 3));
        break;
      case 'year':
        setCurrentDate(prev => direction > 0 ? addYears(prev, 2) : subYears(prev, 2));
        break;
    }
  };

  // Zoom controls
  const zoomIn = () => {
    if (zoomLevel === 'year') {
      setZoomLevel('month');
      setScrollPosition(0);
    }
    else if (zoomLevel === 'month') {
      setZoomLevel('day');
      setScrollPosition(0);
    }
    else if (zoomLevel === 'day') {
      setZoomLevel('hour');
      setScrollPosition(0);
    }
  };

  const zoomOut = () => {
    if (zoomLevel === 'hour') {
      setZoomLevel('day');
      setScrollPosition(0);
    }
    else if (zoomLevel === 'day') {
      setZoomLevel('month');
      setScrollPosition(0);
    }
    else if (zoomLevel === 'month') {
      setZoomLevel('year');
      setScrollPosition(0);
    }
  };

  // Go to today/now
  const goToToday = () => {
    const now = new Date();
    if (zoomLevel === 'hour') {
      // For hour view, go to current hour
      now.setMinutes(0, 0, 0);
    }
    setCurrentDate(now);
    setScrollPosition(0);
  };

  // Get position for timeline events
  const getEventPosition = (eventDate: Date): number | null => {
    for (let i = 0; i < config.totalUnits; i++) {
      const unitDate = config.getUnitDate(i);
      const unitStart = new Date(unitDate);
      const unitEnd = new Date(unitDate);
      
      if (zoomLevel === 'hour') {
        unitEnd.setHours(unitEnd.getHours() + 1);
      } else if (zoomLevel === 'day') {
        unitEnd.setDate(unitEnd.getDate() + 1);
      } else if (zoomLevel === 'month') {
        unitEnd.setMonth(unitEnd.getMonth() + 1);
      } else {
        unitEnd.setFullYear(unitEnd.getFullYear() + 1);
      }

      if (eventDate >= unitStart && eventDate < unitEnd) {
        // For hour view, position more precisely within the hour
        if (zoomLevel === 'hour') {
          const minutesIntoHour = eventDate.getMinutes();
          const hourProgress = minutesIntoHour / 60;
          return i * config.unitWidth + (config.unitWidth * hourProgress) - scrollPosition;
        }
        return i * config.unitWidth + config.unitWidth / 2 - scrollPosition;
      }
    }
    return null; // Event not visible in current view
  };

  return (
    <div className="timeline-container">
      {/* Controls */}
      <div className="timeline-controls">
        <div className="navigation-controls">
          <button onClick={() => navigateTimeline(-1)}>← Previous</button>
          <button onClick={goToToday}>
            {zoomLevel === 'hour' ? 'Now' : 'Today'}
          </button>
          <button onClick={() => navigateTimeline(1)}>Next →</button>
        </div>
        
        <div className="zoom-controls">
          <button 
            onClick={zoomOut} 
            disabled={zoomLevel === 'year'}
          >
            Zoom Out
          </button>
          <span className="zoom-level">{config.unitLabel} View</span>
          <button 
            onClick={zoomIn} 
            disabled={zoomLevel === 'hour'}
          >
            Zoom In
          </button>
        </div>

        <div className="scroll-controls">
          <button onClick={() => handleScroll(-1)}>← Scroll</button>
          <button onClick={() => handleScroll(1)}>Scroll →</button>
        </div>
      </div>

      {/* Timeline */}
      <div 
        ref={containerRef}
        className="timeline-wrapper"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          ref={(node) => {
            timelineRef.current = node;
            drop(node);
          }}
          className="timeline"
          data-zoom={zoomLevel}
          style={{
            width: zoomLevel === 'day' ? '100%' : 
                   zoomLevel === 'hour' ? Math.max(config.totalUnits * config.unitWidth, 2880) : 
                   Math.max(config.totalUnits * config.unitWidth, 800), 
            transform: `translateX(-${scrollPosition}px)`,
          }}
        >
          {/* Timeline line */}
          <div className="timeline-line" />
          
          {/* Hover cursor line */}
          {hoverTime && mousePosition.relativeX && (
            <div 
              className="hover-cursor-line"
              style={{
                position: 'absolute',
                left: mousePosition.relativeX,
                top: 0,
                bottom: 0,
                width: '2px',
                background: '#ef4444',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            />
          )}
          
          {/* Time markers */}
          {zoomLevel === 'hour' ? (
            // Refined hour view markers with reduced heights per specifications
            Array.from({ length: 24 }, (_, index) => (
              <div key={`hour-group-${index}`}>
                {/* Main hour marker */}
                <div
                  key={`hour-${index}`}
                  className="time-marker"
                  style={{
                    left: index * 120,
                    width: 120,
                    position: 'absolute',
                  }}
                >
                  {/* Hour marker line - 12.5% height starting at 37.5% */}
                  <div 
                    style={{
                      width: '2px',
                      height: '12.5%',
                      background: '#4b5563',
                      position: 'absolute',
                      top: '37.5%',
                      left: 0
                    }}
                  />
                  
                  {/* Label positioned below timeline */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: '60%',
                      left: 0,
                      background: 'white',
                      padding: '4px 8px',
                      borderRadius: '0',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {index.toString().padStart(2, '0')}:00
                  </div>
                </div>
                
                {/* Quarter-hour and half-hour markers with refined heights */}
                {[15, 30, 45].map(minutes => (
                  <div
                    key={`quarter-${index}-${minutes}`}
                    style={{
                      position: 'absolute',
                      left: index * 120 + (minutes / 60) * 120,
                      top: minutes === 30 ? '42.5%' : '45%', // Half-hour at 42.5%, quarter-hour at 45%
                      width: '1px',
                      height: minutes === 30 ? '7.5%' : '5%', // Half-hour 7.5%, quarter-hour 5%
                      background: minutes === 30 ? '#9ca3af' : '#d1d5db',
                      zIndex: 3
                    }}
                  />
                ))}
              </div>
            ))
          ) : (
            // Original rendering for other views
            Array.from({ length: config.totalUnits }, (_, index) => {
              const unitDate = config.getUnitDate(index);
              const leftPosition = index * config.unitWidth;
              return (
                <div
                  key={`marker-${index}`}
                  className="time-marker"
                  style={{
                    left: leftPosition,
                    width: config.unitWidth,
                    position: 'absolute',
                  }}
                >
                  <div className="marker-line" />
                  <div className="marker-label">
                    {config.formatLabel(unitDate)}
                  </div>
                </div>
              );
            })
          )}

          {/* Timeline Events */}
          {timelineEvents.map((event) => {
            if (!event.date) return null;
            const position = getEventPosition(new Date(event.date));
            if (position === null) return null;

            return (
              <TimelineEvent
                key={event.id}
                event={event}
                position={position}
                zoomLevel={zoomLevel}
                config={config}
                onRemove={() => onRemoveEvent(event.id)}
                onReposition={onRepositionEvent}
              />
            );
          })}
        </div>
      </div>

      {/* Hover time tooltip */}
      {hoverTime && (
        <div 
          className="hover-time-tooltip"
          style={{
            position: 'fixed',
            left: mousePosition.x + 15,
            top: mousePosition.y - 80,
            background: '#1f2937',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          {zoomLevel === 'hour' 
            ? format(hoverTime, 'MMM dd, yyyy HH:mm')
            : zoomLevel === 'day'
            ? format(hoverTime, 'MMM dd, yyyy')
            : zoomLevel === 'month'
            ? format(hoverTime, 'MMM yyyy')
            : format(hoverTime, 'yyyy')
          }
        </div>
      )}
    </div>
  );
};

export default Timeline;
