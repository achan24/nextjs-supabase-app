'use client';

import { useDrag } from 'react-dnd';
import './DraggableEvent.css';

interface TimelineEventData {
  id: string;
  title: string;
  color: string;
  duration: number;
  date?: Date;
}

interface DraggableEventProps {
  event: TimelineEventData;
}

const DraggableEvent = ({ event }: DraggableEventProps) => {
  const [{ isDragging }, dragRef] = useDrag<TimelineEventData, void, { isDragging: boolean }>({
    type: 'event',
    item: event,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={(node) => {
        dragRef(node);
      }}
      className={`draggable-event ${isDragging ? 'dragging' : ''}`}
      style={{
        backgroundColor: event.color,
        opacity: isDragging ? 0.6 : 1,
        cursor: 'move',
      }}
    >
      <div className="event-title">{event.title}</div>
      <div className="event-duration">{event.duration}min</div>
    </div>
  );
};

export default DraggableEvent;
