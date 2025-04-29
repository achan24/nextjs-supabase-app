'use client'

import { useState } from 'react'
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
  parseISO
} from 'date-fns'

interface Task {
  id: string
  title: string
  description: string | null
  priority: number
  status: 'pending' | 'in_progress' | 'completed'
  due_date: string | null
  created_at: string
  user_id: string
  time_spent?: number
  last_started_at?: string | null
}

interface CalendarProps {
  tasks: Task[]
}

type ViewType = 'day' | 'week' | 'month'

export default function Calendar({ tasks }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>('month')

  // Get date range based on current view
  const getDateRange = () => {
    switch (view) {
      case 'day':
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate),
          days: [currentDate]
        }
      case 'week':
        const weekStart = startOfWeek(currentDate)
        const weekEnd = endOfWeek(currentDate)
        return {
          start: weekStart,
          end: weekEnd,
          days: eachDayOfInterval({ start: weekStart, end: weekEnd })
        }
      case 'month':
      default:
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        const calendarStart = startOfWeek(monthStart)
        const calendarEnd = endOfWeek(monthEnd)
        return {
          start: monthStart,
          end: monthEnd,
          days: eachDayOfInterval({ start: calendarStart, end: calendarEnd })
        }
    }
  }

  // Navigation handlers
  const handlePrevious = () => {
    switch (view) {
      case 'day':
        setCurrentDate(subDays(currentDate, 1))
        break
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1))
        break
      case 'month':
        setCurrentDate(subMonths(currentDate, 1))
        break
    }
  }

  const handleNext = () => {
    switch (view) {
      case 'day':
        setCurrentDate(addDays(currentDate, 1))
        break
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1))
        break
      case 'month':
        setCurrentDate(addMonths(currentDate, 1))
        break
    }
  }

  // Group tasks by date
  const tasksByDate = tasks.reduce((acc: { [key: string]: Task[] }, task) => {
    if (task.due_date) {
      const dateKey = task.due_date.split('T')[0] // Get just the date part
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(task)
    }
    return acc
  }, {})

  const { days } = getDateRange()

  const renderDayView = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd')
    const dayTasks = tasksByDate[dateKey] || []

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="text-xl font-semibold p-4 border-b">
          {format(day, 'EEEE, MMMM d')}
        </div>
        <div className="p-4 space-y-4">
          {dayTasks.length === 0 ? (
            <p className="text-gray-500">No tasks scheduled</p>
          ) : (
            dayTasks.map(task => (
              <div
                key={task.id}
                className={`p-4 rounded-lg ${
                  task.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : task.status === 'in_progress'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="font-medium">{task.title}</div>
                {task.description && (
                  <div className="text-sm mt-1">{task.description}</div>
                )}
                {task.time_spent && (
                  <div className="text-sm mt-1">
                    Time spent: {Math.floor(task.time_spent / 3600)}h {Math.floor((task.time_spent % 3600) / 60)}m
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const renderWeekView = () => (
    <div className="grid grid-cols-7 gap-4">
      {days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayTasks = tasksByDate[dateKey] || []
        const isToday = isSameDay(day, new Date())

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
        const dayTasks = tasksByDate[dateKey] || []
        const isToday = isSameDay(day, new Date())
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
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-gray-900">
          {view === 'day' && format(currentDate, 'MMMM d, yyyy')}
          {view === 'week' && `Week of ${format(days[0], 'MMM d')} - ${format(days[6], 'MMM d, yyyy')}`}
          {view === 'month' && format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* View Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1 text-sm rounded ${
                view === 'day' ? 'bg-white shadow' : 'hover:bg-gray-200'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1 text-sm rounded ${
                view === 'week' ? 'bg-white shadow' : 'hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 text-sm rounded ${
                view === 'month' ? 'bg-white shadow' : 'hover:bg-gray-200'
              }`}
            >
              Month
            </button>
          </div>
          {/* Navigation Controls */}
          <div className="flex space-x-2">
            <button
              onClick={handlePrevious}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-blue-100 rounded hover:bg-blue-200"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {view === 'day' && renderDayView(currentDate)}
        {view === 'week' && renderWeekView()}
        {view === 'month' && renderMonthView()}
      </div>
    </div>
  )
} 