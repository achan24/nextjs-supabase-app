import { useDrag } from 'react-dnd'
import './DraggableEvent.css'

const DraggableEvent = ({ event }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'event',
    item: event,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={drag}
      className={`draggable-event ${isDragging ? 'dragging' : ''}`}
      style={{
        backgroundColor: event.color,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="event-title">{event.title}</div>
    </div>
  )
}

export default DraggableEvent