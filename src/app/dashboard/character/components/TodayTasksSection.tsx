'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Star, CheckCircle, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface StarredTask {
  task_id: string
  title: string
  description: string | null
  points: number
  goal_title: string
  subarea_title: string
  area_title: string
  area_icon: string | null
  starred_at: string
}

export default function TodayTasksSection() {
  const [starredTasks, setStarredTasks] = useState<StarredTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Temporarily disable loading to prevent timeout issues
    setIsLoading(false)
    setError('Temporarily disabled due to database timeout issues')
    return
    
    // loadStarredTasks()
  }, [])

  const loadStarredTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      )

      const dataPromise = supabase.rpc('get_starred_tasks_for_today', {
        user_uuid: user.id
      })

      const { data, error } = await Promise.race([dataPromise, timeoutPromise]) as any

      if (error) {
        console.error('[TodayTasksSection] Error loading starred tasks:', error)
        // Don't throw error, just set empty array
        setStarredTasks([])
        return
      }

      setStarredTasks(data || [])
    } catch (error) {
      console.error('[TodayTasksSection] Unexpected error:', error)
      // Don't throw error, just set empty array
      setStarredTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskComplete = async (taskId: string) => {
    try {
      // Mark task as completed
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          is_starred_for_today: false,
          starred_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) {
        console.error('[TodayTasksSection] Error completing task:', error)
        return
      }

      // Add to completed set for visual feedback
      setCompletedTasks(prev => new Set(prev).add(taskId))
      
      // Remove from starred tasks list
      setStarredTasks(prev => prev.filter(task => task.task_id !== taskId))

      // Show notification to add points manually
      // You can integrate with your notification system here
      console.log('[TodayTasksSection] Task completed! Add points manually on Character screen')
      
    } catch (error) {
      console.error('[TodayTasksSection] Unexpected error completing task:', error)
    }
  }

  const handleUnstar = async (taskId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('toggle_task_star', {
        task_uuid: taskId,
        user_uuid: user.id,
        star_it: false
      })

      if (error) {
        console.error('[TodayTasksSection] Error unstarring task:', error)
        return
      }

      // Remove from starred tasks list
      setStarredTasks(prev => prev.filter(task => task.task_id !== taskId))
      
    } catch (error) {
      console.error('[TodayTasksSection] Unexpected error unstarring task:', error)
    }
  }

  const getAreaIcon = (icon: string | null, areaTitle: string) => {
    if (icon) return icon
    
    // Fallback icons based on area title
    const iconMap: Record<string, string> = {
      'Work & Learning': '💼',
      'Health & Fitness': '💪',
      'Relationships': '❤️',
      'Environment & Hygiene': '🏠',
      'Mind & Spirit': '🧘',
      'Finance': '💰',
      'Hobbies': '🎨'
    }
    
    return iconMap[areaTitle] || '📋'
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Today's Tasks</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Today's Tasks</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Star className="h-4 w-4" />
            <span>Coming Soon</span>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium mb-2">Feature in Development</p>
          <p className="text-sm">Today's Tasks feature is being optimized for better performance</p>
          <Button 
            onClick={() => {
              setError(null)
              setIsLoading(true)
              loadStarredTasks()
            }}
            className="mt-4"
          >
            Test Starring Functionality
          </Button>
        </div>
      </Card>
    )
  }

  // Fallback if there's an error - show a simple message instead of breaking
  if (starredTasks.length === 0 && !isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Today's Tasks</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Star className="h-4 w-4" />
            <span>0 starred</span>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium mb-2">No tasks starred for today</p>
          <p className="text-sm">Star tasks throughout the app to see them here</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Today's Tasks</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Star className="h-4 w-4" />
          <span>{starredTasks.length} starred</span>
        </div>
      </div>

      {starredTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium mb-2">No tasks starred for today</p>
          <p className="text-sm">Star tasks throughout the app to see them here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {starredTasks.map((task) => (
            <div
              key={task.task_id}
              className={cn(
                "p-4 border rounded-lg transition-all duration-200",
                completedTasks.has(task.task_id)
                  ? "bg-green-50 border-green-200 opacity-75"
                  : "bg-white border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={completedTasks.has(task.task_id)}
                  onCheckedChange={() => handleTaskComplete(task.task_id)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>{getAreaIcon(task.area_icon, task.area_title)} {task.area_title}</span>
                        <span>•</span>
                        <span>{task.subarea_title}</span>
                        <span>•</span>
                        <span>🎯 {task.goal_title}</span>
                        <span>•</span>
                        <span className="font-medium">{task.points} pts</span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnstar(task.task_id)}
                      className="ml-2 p-1 h-auto"
                    >
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
} 