import { useDrag } from 'react-dnd'
import { useState } from 'react'
import { format } from 'date-fns'
import './TimelineEvent.css'

const TimelineEvent = ({ event, position, onRemove, onReposition, zoomLevel = 'day', config }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  
  const [{ isDragging }, drag] = useDrag({
    type: 'timeline-event',
    item: { ...event, isRepositioning: true },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  // Calculate width based on duration and zoom level
  const getEventWidth = () => {
    const duration = event.duration || 15 // Default 15 minutes
    
    switch (zoomLevel) {
      case 'hour':
        // In hour view, each minute is 2px, minimum 20px for visibility
        // When hovered, expand to full hour width (120px)
        if (isHovered) {
          return 120 // Full hour width
        }
        return Math.max(duration * 2, 20) // Proportional to duration with minimum
      case 'day':
        // In day view, show as minimal fixed width since duration isn't visible
        return 80
      case 'month':
      case 'year':
        // In month/year view, show as minimal fixed width
        return 60
      default:
        return 80
    }
  }

  const handleMouseEnter = (e) => {
    setIsHovered(true)
    setMousePosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e) => {
    if (isHovered) {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  const getDateFormat = () => {
    switch (zoomLevel) {
      case 'hour':
        return 'MMM dd, HH:mm'
      case 'day':
        return 'MMM dd, yyyy'
      case 'month':
        return 'MMM yyyy'
      case 'year':
        return 'yyyy'
      default:
        return 'MMM dd, yyyy'
    }
  }
  return (
    <>
      <div
        ref={drag}
        className={`timeline-event ${isDragging ? 'dragging' : ''}`}
        style={{
          left: position,
          backgroundColor: event.color,
          opacity: isDragging ? 0.6 : 1,
          cursor: 'move',
          width: getEventWidth(),
          transition: 'width 0.2s ease',
          zIndex: isHovered ? 1000 : 10
        }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="event-marker" />
        <div className="event-card" style={{ '--event-color': event.color }}>
          {/* Show full content when hovered (expanded), compressed when not */}
          <div className="event-title" title={event.title}>
            {event.title}
          </div>
          
          {/* Always show time in hour view, show full date when hovered or expanded */}
          {zoomLevel === 'hour' && (
            <>
              <div className="event-date">
                {isHovered || getEventWidth() >= 60 ?
                  format(new Date(event.date), getDateFormat()) :
                  format(new Date(event.date), 'HH:mm')
                }
              </div>
              <div className="event-duration">{event.duration || 15}min</div>
            </>
          )}
          
          {/* Show full date for non-hour views when there's space */}
          {zoomLevel !== 'hour' && (isHovered || getEventWidth() >= 60) && (
            <div className="event-date">
              {format(new Date(event.date), getDateFormat())}
            </div>
          )}
          
        </div>
      </div>
      
      {/* Hover Tooltip with full event details */}
      {isHovered && !isDragging && (
        <div 
          className="event-hover-tooltip"
          style={{
            position: 'fixed',
            left: mousePosition.x + 15,
            top: mousePosition.y - 100,
            zIndex: 10000,
            pointerEvents: 'none'
          }}
        >
          <div className="tooltip-header">
            <div className="tooltip-title">{event.title}</div>
            <div 
              className="tooltip-color-indicator" 
              style={{ backgroundColor: event.color }}
            />
          </div>
          <div className="tooltip-details">
            <div className="tooltip-time">
              📅 {format(new Date(event.date), 'MMM dd, yyyy HH:mm')}
            </div>
            <div className="tooltip-duration">
              ⏱️ Duration: {event.duration || 15} minutes
            </div>
            {event.date && (
              <div className="tooltip-end-time">
                🏁 Ends: {format(new Date(new Date(event.date).getTime() + (event.duration || 15) * 60000), 'HH:mm')}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default TimelineEvent