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

export async function resetAllDailyPoints(userId: string) {
  console.log('[RESET DAILY POINTS] ====== START ======');
  console.log('[RESET DAILY POINTS] User ID:', userId);
  try {
    // Reset areas
    console.log('[RESET DAILY POINTS] Attempting to reset areas...');
    const { data: resetAreaData, error: areaError } = await supabase
      .from('life_goal_areas')
      .update({ current_points: 0 })
      .eq('user_id', userId)
      .select();
    
    if (areaError) {
      console.error('[RESET DAILY POINTS] Error resetting areas:', areaError);
      throw areaError;
    }
    console.log('[RESET DAILY POINTS] Areas reset result:', resetAreaData);

    // Get area IDs
    console.log('[RESET DAILY POINTS] Fetching area IDs...');
    const { data: areaRows, error: areaErr } = await supabase
      .from('life_goal_areas')
      .select('id')
      .eq('user_id', userId);
    
    if (areaErr) {
      console.error('[RESET DAILY POINTS] Error fetching areas:', areaErr);
      throw areaErr;
    }
    console.log('[RESET DAILY POINTS] Found areas:', areaRows);

    const areaIds = (areaRows || []).map(a => a.id);
    console.log('[RESET DAILY POINTS] Extracted area IDs:', areaIds);
    
    if (areaIds.length === 0) {
      console.log('[RESET DAILY POINTS] No areas found, skipping subareas and goals');
      return;
    }

    // Reset subareas
    console.log('[RESET DAILY POINTS] Attempting to reset subareas...');
    const { data: resetSubareaData, error: subareaError } = await supabase
      .from('life_goal_subareas')
      .update({ current_points: 0 })
      .filter('area_id', 'in', `(${areaIds.join(',')})`)
      .select();
    
    if (subareaError) {
      console.error('[RESET DAILY POINTS] Error resetting subareas:', subareaError);
      throw subareaError;
    }
    console.log('[RESET DAILY POINTS] Subareas reset result:', resetSubareaData);

    // Get subarea IDs
    console.log('[RESET DAILY POINTS] Fetching subarea IDs...');
    const { data: subareaRows, error: subareaErr } = await supabase
      .from('life_goal_subareas')
      .select('id')
      .filter('area_id', 'in', `(${areaIds.join(',')})`);
    
    if (subareaErr) {
      console.error('[RESET DAILY POINTS] Error fetching subareas:', subareaErr);
      throw subareaErr;
    }
    console.log('[RESET DAILY POINTS] Found subareas:', subareaRows);

    const subareaIds = (subareaRows || []).map(s => s.id);
    console.log('[RESET DAILY POINTS] Extracted subarea IDs:', subareaIds);
    
    if (subareaIds.length === 0) {
      console.log('[RESET DAILY POINTS] No subareas found, skipping goals');
      return;
    }

    // Reset goals
    console.log('[RESET DAILY POINTS] Attempting to reset goals...');
    const { data: resetGoalData, error: goalError } = await supabase
      .from('life_goals')
      .update({ current_points: 0 })
      .filter('subarea_id', 'in', `(${subareaIds.join(',')})`)
      .select();
    
    if (goalError) {
      console.error('[RESET DAILY POINTS] Error resetting goals:', goalError);
      throw goalError;
    }
    console.log('[RESET DAILY POINTS] Goals reset result:', resetGoalData);

    console.log('[RESET DAILY POINTS] ====== SUCCESS ======');
  } catch (error) {
    console.error('[RESET DAILY POINTS] ====== ERROR ======');
    console.error('[RESET DAILY POINTS] Error details:', error);
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
        });
    }
  } catch (error) {
    console.error('Error saving points to date:', error);
    throw error;
  }
} 