import { useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import Timeline from './components/Timeline'
import EventPanel from './components/EventPanel'
import './App.css'

function App() {
  const [events, setEvents] = useState([
    { id: 1, title: 'Project Start', color: '#3b82f6', duration: 15 },
    { id: 2, title: 'First Milestone', color: '#10b981', duration: 30 },
    { id: 3, title: 'Second Milestone', color: '#f59e0b', duration: 45 },
    { id: 4, title: 'Project End', color: '#ef4444', duration: 15 },
  ])
  
  const [timelineEvents, setTimelineEvents] = useState([])

  const addEventToTimeline = (event, date) => {
    const newTimelineEvent = {
      ...event,
      date,
      id: `timeline-${event.id}-${Date.now()}`
    }
    setTimelineEvents(prev => [...prev, newTimelineEvent])
  }

  const removeEventFromTimeline = (eventId) => {
    setTimelineEvents(prev => prev.filter(e => e.id !== eventId))
  }

  const repositionEvent = (eventId, newDate) => {
    setTimelineEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, date: newDate }
        : event
    ))
  }

  const addEvent = (newEvent) => {
    setEvents(prev => [...prev, newEvent])
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app">
        <header className="app-header">
          <h1>Interactive Timeline</h1>
          <p>Drag events onto the timeline and zoom from hours to years to explore different time scales</p>
        </header>
        
        <div className="app-content">
          <EventPanel events={events} onAddEvent={addEvent} />
          <Timeline 
            timelineEvents={timelineEvents}
            onAddEvent={addEventToTimeline}
            onRemoveEvent={removeEventFromTimeline}
            onRepositionEvent={repositionEvent}
          />
        </div>
      </div>
    </DndProvider>
  )
}

export default App
