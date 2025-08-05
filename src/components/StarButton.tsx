'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface StarButtonProps {
  taskId: string
  isStarred: boolean
  onToggle?: (isStarred: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function StarButton({ 
  taskId, 
  isStarred, 
  onToggle, 
  size = 'md',
  className 
}: StarButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [localStarred, setLocalStarred] = useState(isStarred)
  const supabase = createClient()

  const handleToggle = async () => {
    if (isLoading) return

    console.log('[StarButton] Starting toggle for task:', taskId, 'current state:', localStarred)
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('[StarButton] User not authenticated')
        return
      }

      const newStarredState = !localStarred
      console.log('[StarButton] New starred state:', newStarredState)
      
      // Call the database function to toggle star
      console.log('[StarButton] Calling toggle_task_star function...')
      const { data, error } = await supabase.rpc('toggle_task_star', {
        task_uuid: taskId,
        user_uuid: user.id,
        star_it: newStarredState
      })

      console.log('[StarButton] Function response:', { data, error })

      if (error) {
        console.error('[StarButton] Error toggling star:', error)
        return
      }

      console.log('[StarButton] Success! Updating local state')
      setLocalStarred(newStarredState)
      onToggle?.(newStarredState)
      
      // Force a small delay to ensure the database update is complete
      setTimeout(() => {
        // Trigger a page refresh or data refetch if needed
        window.dispatchEvent(new CustomEvent('task-starred', { 
          detail: { taskId, isStarred: newStarredState } 
        }))
      }, 100)
      
    } catch (error) {
      console.error('[StarButton] Unexpected error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'p-0 hover:bg-transparent',
        sizeClasses[size],
        className
      )}
    >
      <Star
        size={iconSizes[size]}
        className={cn(
          'transition-all duration-200',
          localStarred 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-400 hover:text-yellow-400'
        )}
      />
    </Button>
  )
} 