import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function updateAreaProgress(areaId: string, points: number) {
  const { error } = await supabase
    .from('life_goal_areas')
    .update({ daily_points: points })
    .eq('id', areaId)

  if (error) {
    console.error('Error updating area progress:', error)
    throw error
  }
}

export async function updateSubareaProgress(subareaId: string, points: number) {
  const { error } = await supabase
    .from('life_goal_subareas')
    .update({ daily_points: points })
    .eq('id', subareaId)

  if (error) {
    console.error('Error updating subarea progress:', error)
    throw error
  }
}

export async function updateAreaTarget(areaId: string, target: number) {
  const { error } = await supabase
    .from('life_goal_areas')
    .update({ daily_target: target })
    .eq('id', areaId)

  if (error) {
    console.error('Error updating area target:', error)
    throw error
  }
}

export async function updateSubareaTarget(subareaId: string, target: number) {
  const { error } = await supabase
    .from('life_goal_subareas')
    .update({ daily_target: target })
    .eq('id', subareaId)

  if (error) {
    console.error('Error updating subarea target:', error)
    throw error
  }
}

export async function resetDailyProgress() {
  const { error: areaError } = await supabase
    .from('life_goal_areas')
    .update({ daily_points: 0 })

  if (areaError) {
    console.error('Error resetting area progress:', areaError)
    throw areaError
  }

  const { error: subareaError } = await supabase
    .from('life_goal_subareas')
    .update({ daily_points: 0 })

  if (subareaError) {
    console.error('Error resetting subarea progress:', subareaError)
    throw subareaError
  }
}

export function initializeAutoSave(userId: string) {
  // Reset progress at midnight
  const now = new Date()
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // next day
    0, // midnight
    0,
    0
  )
  const msToMidnight = night.getTime() - now.getTime()

  // Set up the midnight reset
  setTimeout(async () => {
    await resetDailyProgress()
    // Reschedule for next midnight
    initializeAutoSave(userId)
  }, msToMidnight)

  // Set up auto-save interval (every minute)
  const interval = setInterval(async () => {
    try {
      // Check if user is still logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== userId) {
        clearInterval(interval)
        return
      }
    } catch (error) {
      console.error('Error in auto-save:', error)
    }
  }, 60000) // every minute

  // Return cleanup function
  return () => {
    clearInterval(interval)
  }
} 