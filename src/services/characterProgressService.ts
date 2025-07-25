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

export async function resetAllDailyPoints(userId: string) {
  console.log('[RESET DAILY POINTS] ====== START ======');
  try {
    // Reset areas
    const { error: areaError } = await supabase
      .from('life_goal_areas')
      .update({ daily_points: 0 })
      .eq('user_id', userId);
    
    if (areaError) throw areaError;

    // Get area IDs
    const { data: areas } = await supabase
      .from('life_goal_areas')
      .select('id')
      .eq('user_id', userId);

    if (!areas?.length) return;

    // Reset subareas
    const { error: subareaError } = await supabase
      .from('life_goal_subareas')
      .update({ daily_points: 0 })
      .in('area_id', areas.map(a => a.id));
    
    if (subareaError) throw subareaError;

    // Get subarea IDs
    const { data: subareas } = await supabase
      .from('life_goal_subareas')
      .select('id')
      .in('area_id', areas.map(a => a.id));

    if (!subareas?.length) return;

    // Reset goals
    const { error: goalError } = await supabase
      .from('life_goals')
      .update({ daily_points: 0 })
      .in('subarea_id', subareas.map(s => s.id));
    
    if (goalError) throw goalError;

    console.log('[RESET DAILY POINTS] ====== SUCCESS ======');
  } catch (error) {
    console.error('[RESET DAILY POINTS] Error:', error);
    throw error;
  }
}

export async function savePointsToDate(date: string) {
  try {
    // Get all areas with their current points
    const { data: areas, error: areaError } = await supabase
      .from('life_goal_areas')
      .select('id, current_points');
    
    if (areaError) throw areaError;

    // Save points to history for each area
    for (const area of areas || []) {
      await supabase
        .from('area_points_history')
        .upsert({
          area_id: area.id,
          points: area.current_points,
          date: date
        }, {
          onConflict: 'area_id,date'
        });
    }

    // Get all subareas with their current points
    const { data: subareas, error: subareaError } = await supabase
      .from('life_goal_subareas')
      .select('id, current_points');
    
    if (subareaError) throw subareaError;

    // Save points to history for each subarea
    for (const subarea of subareas || []) {
      await supabase
        .from('subarea_points_history')
        .upsert({
          subarea_id: subarea.id,
          points: subarea.current_points,
          date: date
        }, {
          onConflict: 'subarea_id,date'
        });
    }

    // Get all goals with their current points
    const { data: goals, error: goalError } = await supabase
      .from('life_goals')
      .select('id, current_points');
    
    if (goalError) throw goalError;

    // Save points to history for each goal
    for (const goal of goals || []) {
      await supabase
        .from('goal_points_history')
        .upsert({
          goal_id: goal.id,
          points: goal.current_points,
          date: date
        }, {
          onConflict: 'goal_id,date'
        });
    }
  } catch (error) {
    console.error('Error saving points to date:', error);
    throw error;
  }
}

// Deprecated - use resetAllDailyPoints instead
export async function resetDailyProgress() {
  console.warn('resetDailyProgress is deprecated. Please use resetAllDailyPoints instead.');
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('No user found');
  return resetAllDailyPoints(user.user.id);
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