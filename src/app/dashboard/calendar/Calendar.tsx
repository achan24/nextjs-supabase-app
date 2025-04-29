'use client'

import { useState, useEffect, useRef } from 'react'
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable'
import { Resizable } from 're-resizable'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfDay,
  endOfDay,
  parseISO,
  setHours,
  setMinutes,
  addMinutes,
  isToday as isCurrentDay,
  setSeconds
} from 'date-fns'
import { createClient } from '@/lib/supabase'
import { Task } from '@/types/task'
import Link from 'next/link'

interface CalendarProps {
  tasks: Task[]
  onTaskUpdate?: () => void
}

type ViewType = 'day' | 'week' | 'month'

interface ContextMenuProps {
  x: number
  y: number
  task: Task
  onClose: () => void
  onUnschedule: () => void
  onMarkComplete: () => void
  onMarkInProgress: () => void
}

const ContextMenu = ({ x, y, task, onClose, onUnschedule, onMarkComplete, onMarkInProgress }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
      style={{ 
        left: x,
        top: y,
        minWidth: '180px'
      }}
    >
      <button
        onClick={onUnschedule}
        className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
      >
        Unschedule Task
      </button>
      <div className="border-t border-gray-200 my-1"></div>
      {task.status !== 'completed' && (
        <button
          onClick={onMarkComplete}
          className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-green-600"
        >
          Mark as Complete
        </button>
      )}
      {task.status !== 'in_progress' && (
        <button
          onClick={onMarkInProgress}
          className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-yellow-600"
        >
          Mark as In Progress
        </button>
      )}
    </div>
  )
}

export default function Calendar({ tasks: initialTasks, onTaskUpdate }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<ViewType>('week')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    task: Task
  } | null>(null)
  const dayViewContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Update tasks when initialTasks changes
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Scroll to current time in day view
  useEffect(() => {
    if (viewType === 'day' && isCurrentDay(currentDate) && dayViewContainerRef.current) {
      const currentHour = currentTime.getHours()
      const currentMinute = currentTime.getMinutes()
      const currentPosition = currentHour * 60 + currentMinute
      const scrollPosition = Math.max(0, currentPosition - 200) // Scroll to current time minus 200px offset
      dayViewContainerRef.current.scrollTop = scrollPosition
    }
  }, [viewType, currentDate, currentTime])

  const goToPrevious = () => {
    if (viewType === 'day') {
      setCurrentDate(subDays(currentDate, 1))
    } else if (viewType === 'week') {
      setCurrentDate(subDays(currentDate, 7))
    } else {
      const firstDayOfPrevMonth = startOfMonth(subDays(startOfMonth(currentDate), 1))
      setCurrentDate(firstDayOfPrevMonth)
    }
  }

  const goToNext = () => {
    if (viewType === 'day') {
      setCurrentDate(addDays(currentDate, 1))
    } else if (viewType === 'week') {
      setCurrentDate(addDays(currentDate, 7))
    } else {
      const firstDayOfNextMonth = startOfMonth(addDays(endOfMonth(currentDate), 1))
      setCurrentDate(firstDayOfNextMonth)
    }
  }

  const getDaysToShow = () => {
    if (viewType === 'day') {
      return [currentDate]
    } else if (viewType === 'week') {
      const start = startOfWeek(currentDate)
      const end = endOfWeek(currentDate)
      return eachDayOfInterval({ start, end })
    } else {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)
      return eachDayOfInterval({ start, end })
    }
  }

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false // Skip tasks without a due date
      const taskDate = new Date(task.due_date)
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      )
    })
  }

  const days = getDaysToShow()

  const handleTaskDrag = (e: DraggableEvent, dragData: DraggableData) => {
    // Don't block the drag event
    const updateTask = async () => {
      setIsUpdating(true)
      setError(null)
      
      try {
        const pixelsPerMinute = 2
        const minutesFromTop = Math.round(dragData.y / pixelsPerMinute)
        const hours = Math.floor(minutesFromTop / 60)
        const minutes = minutesFromTop % 60
        
        const task = tasks.find(t => t.id === dragData.node.id)
        if (!task) return

        const currentDate = task.due_date ? new Date(task.due_date) : new Date()
        const newDate = setSeconds(setMinutes(setHours(currentDate, hours), minutes), 0)

        const { error: updateError } = await supabase
          .from('tasks')
          .update({ 
            due_date: newDate.toISOString(),
          })
          .eq('id', dragData.node.id)

        if (updateError) throw updateError

        // Optimistically update the local state
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === dragData.node.id 
              ? { ...t, due_date: newDate.toISOString() }
              : t
          )
        )

        // Notify parent of update
        onTaskUpdate?.()
      } catch (err) {
        console.error('Error updating task:', err)
        setError('Failed to update task. Please try again.')
      } finally {
        setIsUpdating(false)
      }
    }

    // Start the update process without blocking the drag
    updateTask()
  }

  const handleTaskResize = (e: MouseEvent | TouchEvent, direction: string, ref: HTMLElement, delta: { height: number }) => {
    // Don't block the resize event
    const updateTask = async () => {
      setIsUpdating(true)
      setError(null)
      
      try {
        const taskId = ref.getAttribute('data-task-id')
        if (!taskId) return

        const task = tasks.find(t => t.id === taskId)
        if (!task) return

        const pixelsPerMinute = 2
        const durationInMinutes = Math.round(ref.clientHeight / pixelsPerMinute)
        
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ 
            estimated_time: durationInMinutes,
          })
          .eq('id', taskId)

        if (updateError) throw updateError

        // Optimistically update the local state
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === taskId 
              ? { ...t, estimated_time: durationInMinutes }
              : t
          )
        )

        // Notify parent of update
        onTaskUpdate?.()
      } catch (err) {
        console.error('Error updating task:', err)
        setError('Failed to update task duration. Please try again.')
      } finally {
        setIsUpdating(false)
      }
    }

    // Start the update process without blocking the resize
    updateTask()
  }

  const handleContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      task
    })
  }

  const handleUnscheduleTask = async () => {
    if (!contextMenu) return

    const { error } = await supabase
      .from('tasks')
      .update({ due_date: null })
      .eq('id', contextMenu.task.id)

    if (!error) {
      onTaskUpdate?.()
    }
    setContextMenu(null)
  }

  const handleUpdateTaskStatus = async (status: 'completed' | 'in_progress' | 'todo') => {
    if (!contextMenu) return

    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', contextMenu.task.id)

    if (!error) {
      onTaskUpdate?.()
    }
    setContextMenu(null)
  }

  const renderDayView = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd')
    const dayTasks = getTasksForDate(day)
    const isToday = isCurrentDay(day)

    // Calculate current time position
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const currentPosition = (currentHour * 60 + currentMinute) * 2 // Multiply by 2 for the new scale

    // Create array of hour markers (0-23)
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="text-xl font-semibold p-4 border-b">
          {format(day, 'EEEE, MMMM d')}
        </div>
        <div ref={dayViewContainerRef} className="day-view-container relative overflow-y-auto" style={{ height: '700px' }}>
          <div className="relative" style={{ height: '2880px' }}> {/* 24 hours * 120px per hour */}
            {/* Hour markers */}
            {hours.map(hour => (
              <div
                key={hour}
                className="absolute w-full border-t border-gray-200 flex items-center"
                style={{ top: `${hour * 120}px`, height: '120px' }}
              >
                <div className="w-16 pr-2 text-right text-sm text-gray-500">
                  {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
                </div>
                <div className="flex-1 border-l border-gray-200">
                  {/* 30-minute marker */}
                  <div className="border-t border-gray-100 relative" style={{ top: '60px' }}></div>
                </div>
              </div>
            ))}

            {/* Current time indicator */}
            {isToday && (
              <div 
                className="absolute left-0 right-0 flex items-center z-20"
                style={{ top: `${currentPosition}px` }}
              >
                <div className="w-16 pr-2 text-right">
                  <div className="w-3 h-3 rounded-full bg-red-500 ml-auto" />
                </div>
                <div className="flex-1 border-t-2 border-red-500" />
              </div>
            )}

            {/* Tasks */}
            {dayTasks.map(task => {
              const taskDate = new Date(task.due_date!)
              const taskHour = taskDate.getHours()
              const taskMinute = taskDate.getMinutes()
              const topPosition = (taskHour * 60 + taskMinute) * 2
              const initialHeight = task.time_spent ? Math.max(60, task.time_spent / 30) : 60

              return (
                <Draggable
                  key={task.id}
                  axis="y"
                  grid={[2, 2]}
                  bounds="parent"
                  defaultPosition={{ x: 0, y: topPosition }}
                  onStop={(e, data) => handleTaskDrag(e, data)}
                >
                  <div
                    className="absolute left-16 right-4"
                    style={{ zIndex: 10 }}
                  >
                    <Resizable
                      size={{ width: '100%', height: initialHeight }}
                      minHeight={30}
                      maxHeight={720}
                      enable={{ bottom: true }}
                      grid={[1, 2]}
                      onResize={(e, direction, ref, d) => {
                        handleTaskResize(e, direction, ref, d)
                      }}
                    >
                      <div
                        className={`w-full p-2 rounded-lg shadow cursor-move ${
                          task.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : task.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                        onContextMenu={(e) => handleContextMenu(e, task)}
                      >
                        <div className="font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-sm mt-1 line-clamp-2">{task.description}</div>
                        )}
                        {task.time_spent && (
                          <div className="text-sm mt-1">
                            Time spent: {Math.floor(task.time_spent / 3600)}h {Math.floor((task.time_spent % 3600) / 60)}m
                          </div>
                        )}
                        <div className="text-xs mt-1">
                          {format(taskDate, 'h:mm a')}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize bg-gray-300 rounded-b-lg opacity-50 hover:opacity-100" />
                      </div>
                    </Resizable>
                  </div>
                </Draggable>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderWeekView = () => (
    <div className="grid grid-cols-7 gap-4">
      {days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayTasks = getTasksForDate(day)
        const isToday = isCurrentDay(day)

        return (
          <div
            key={dateKey}
            className={`min-h-[200px] rounded-lg border ${
              isToday ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
            }`}
          >
            <div className="p-2 border-b text-center">
              <div className="font-medium">{format(day, 'EEE')}</div>
              <div className="text-sm text-gray-500">{format(day, 'MMM d')}</div>
            </div>
            <div className="p-2 space-y-2">
              {dayTasks.map(task => (
                <div
                  key={task.id}
                  className={`p-2 rounded text-sm ${
                    task.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : task.status === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                  title={`${task.title}${task.time_spent ? ` (${Math.floor(task.time_spent / 3600)}h ${Math.floor((task.time_spent % 3600) / 60)}m)` : ''}`}
                >
                  <div className="font-medium truncate">{task.title}</div>
                  {task.time_spent && (
                    <div className="text-xs mt-1">
                      {Math.floor(task.time_spent / 3600)}h {Math.floor((task.time_spent % 3600) / 60)}m
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-1">
      {/* Day headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
          {day}
        </div>
      ))}

      {/* Calendar days */}
      {days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayTasks = getTasksForDate(day)
        const isToday = isCurrentDay(day)
        const isCurrentMonth = day.getMonth() === currentDate.getMonth()

        return (
          <div
            key={dateKey}
            className={`min-h-[100px] p-2 border rounded ${
              isToday ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
            } ${!isCurrentMonth ? 'opacity-40' : ''}`}
          >
            <div className="text-right text-sm text-gray-500 mb-1">
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
              {dayTasks.map(task => (
                <div
                  key={task.id}
                  className={`text-xs p-1 rounded truncate ${
                    task.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : task.status === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                  title={`${task.title}${task.time_spent ? ` (${Math.floor(task.time_spent / 3600)}h ${Math.floor((task.time_spent % 3600) / 60)}m)` : ''}`}
                >
                  {task.title}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Guardian Angel
          </Link>
        </div>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mb-4">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPrevious}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={isUpdating}
          >
            ←
          </button>
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={goToNext}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={isUpdating}
          >
            →
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewType('day')}
            className={`px-4 py-2 rounded-md ${
              viewType === 'day' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            disabled={isUpdating}
          >
            Day
          </button>
          <button
            onClick={() => setViewType('week')}
            className={`px-4 py-2 rounded-md ${
              viewType === 'week' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            disabled={isUpdating}
          >
            Week
          </button>
          <button
            onClick={() => setViewType('month')}
            className={`px-4 py-2 rounded-md ${
              viewType === 'month' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            disabled={isUpdating}
          >
            Month
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {/* Calendar Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {viewType === 'day' && renderDayView(currentDate)}
          {viewType === 'week' && renderWeekView()}
          {viewType === 'month' && renderMonthView()}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            task={contextMenu.task}
            onClose={() => setContextMenu(null)}
            onUnschedule={handleUnscheduleTask}
            onMarkComplete={() => handleUpdateTaskStatus('completed')}
            onMarkInProgress={() => handleUpdateTaskStatus('in_progress')}
          />
        )}
      </div>
    </div>
  )
} 