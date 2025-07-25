import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns';

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

export async function savePointsToDate() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get all areas with daily points
  const { data: areas, error: areaError } = await supabase
    .from('life_goal_areas')
    .select('id, daily_points, daily_target')
    .eq('user_id', user.id);

  if (areaError) {
    console.error('Error fetching areas:', areaError);
    return;
  }

  // Get today's date
  const today = new Date();
  const dateStr = format(today, 'yyyy-MM-dd');

  // Save area points to history and reset daily points
  for (const area of areas || []) {
    if (area.daily_points > 0) {
      // Save to history
      await supabase
        .from('area_points_history')
        .upsert({
          area_id: area.id,
          date: dateStr,
          points: area.daily_points,
          target: area.daily_target
        });

      // Reset daily points
      await supabase
        .from('life_goal_areas')
        .update({
          daily_points: 0
        })
        .eq('id', area.id);
    }
  }

  // Get all subareas with daily points
  const { data: subareas, error: subareaError } = await supabase
    .from('life_goal_subareas')
    .select('id, area_id, daily_points, daily_target')
    .in('area_id', (areas || []).map(a => a.id));

  if (subareaError) {
    console.error('Error fetching subareas:', subareaError);
    return;
  }

  // Save subarea points to history and reset daily points
  for (const subarea of subareas || []) {
    if (subarea.daily_points > 0) {
      // Save to history
      await supabase
        .from('subarea_points_history')
        .upsert({
          subarea_id: subarea.id,
          date: dateStr,
          points: subarea.daily_points,
          target: subarea.daily_target
        });

      // Reset daily points
      await supabase
        .from('life_goal_subareas')
        .update({
          daily_points: 0
        })
        .eq('id', subarea.id);
    }
  }

  // Get all goals with daily points
  const { data: goals, error: goalError } = await supabase
    .from('life_goals')
    .select('id, subarea_id, daily_points, daily_target')
    .in('subarea_id', (subareas || []).map(s => s.id));

  if (goalError) {
    console.error('Error fetching goals:', goalError);
    return;
  }

  // Save goal points to history and reset daily points
  for (const goal of goals || []) {
    if (goal.daily_points > 0) {
      // Save to history
      await supabase
        .from('goal_points_history')
        .upsert({
          goal_id: goal.id,
          date: dateStr,
          points: goal.daily_points,
          target: goal.daily_target
        });

      // Reset daily points
      await supabase
        .from('life_goals')
        .update({
          daily_points: 0
        })
        .eq('id', goal.id);
    }
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