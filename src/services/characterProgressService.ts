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

export async function savePointsToDate(date?: string) {
  console.log('[SAVE POINTS] Starting save operation...');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[SAVE POINTS] No user found');
      throw new Error('No user found');
    }

    // Use provided date or today's date
    const dateStr = date || format(new Date(), 'yyyy-MM-dd');
    console.log(`[SAVE POINTS] Saving points for date: ${dateStr}`);

    // Get all areas with daily points
    const { data: areas, error: areaError } = await supabase
      .from('life_goal_areas')
      .select('id, daily_points, target_points')
      .eq('user_id', user.id);

    if (areaError) {
      console.error('[SAVE POINTS] Error fetching areas:', areaError);
      throw areaError;
    }

    console.log(`[SAVE POINTS] Found ${areas?.length || 0} areas`);

    // Save area points to history and reset daily points
    for (const area of areas || []) {
      if (area.daily_points > 0) {
        console.log(`[SAVE POINTS] Saving area ${area.id}: ${area.daily_points} points`);
        
        // Save to history - try insert first, then update if it fails
        let { error: historyError } = await supabase
          .from('area_points_history')
          .insert({
            area_id: area.id,
            date: dateStr,
            points: area.daily_points,
            target: area.target_points
          });

        // If insert fails due to duplicate, try update instead
        if (historyError && historyError.code === '23505') { // unique_violation
          const { error: updateError } = await supabase
            .from('area_points_history')
            .update({
              points: area.daily_points,
              target: area.target_points
            })
            .eq('area_id', area.id)
            .eq('date', dateStr);
          
          historyError = updateError;
        }

        if (historyError) {
          console.error(`[SAVE POINTS] Error saving area history for ${area.id}:`, historyError);
          throw historyError;
        }

        // Reset daily points
        const { error: resetError } = await supabase
          .from('life_goal_areas')
          .update({
            daily_points: 0
          })
          .eq('id', area.id);

        if (resetError) {
          console.error(`[SAVE POINTS] Error resetting area ${area.id}:`, resetError);
          throw resetError;
        }
      }
    }

    // Get all subareas with daily points
    const { data: subareas, error: subareaError } = await supabase
      .from('life_goal_subareas')
      .select('id, area_id, daily_points, target_points')
      .in('area_id', (areas || []).map(a => a.id));

    if (subareaError) {
      console.error('[SAVE POINTS] Error fetching subareas:', subareaError);
      throw subareaError;
    }

    console.log(`[SAVE POINTS] Found ${subareas?.length || 0} subareas`);

    // Save subarea points to history and reset daily points
    for (const subarea of subareas || []) {
      if (subarea.daily_points > 0) {
        console.log(`[SAVE POINTS] Saving subarea ${subarea.id}: ${subarea.daily_points} points`);
        
        // Save to history - try insert first, then update if it fails
        let { error: historyError } = await supabase
          .from('subarea_points_history')
          .insert({
            subarea_id: subarea.id,
            date: dateStr,
            points: subarea.daily_points,
            target: subarea.target_points
          });

        // If insert fails due to duplicate, try update instead
        if (historyError && historyError.code === '23505') { // unique_violation
          const { error: updateError } = await supabase
            .from('subarea_points_history')
            .update({
              points: subarea.daily_points,
              target: subarea.target_points
            })
            .eq('subarea_id', subarea.id)
            .eq('date', dateStr);
          
          historyError = updateError;
        }

        if (historyError) {
          console.error(`[SAVE POINTS] Error saving subarea history for ${subarea.id}:`, historyError);
          throw historyError;
        }

        // Reset daily points
        const { error: resetError } = await supabase
          .from('life_goal_subareas')
          .update({
            daily_points: 0
          })
          .eq('id', subarea.id);

        if (resetError) {
          console.error(`[SAVE POINTS] Error resetting subarea ${subarea.id}:`, resetError);
          throw resetError;
        }
      }
    }

    // Get all goals with daily points
    const { data: goals, error: goalError } = await supabase
      .from('life_goals')
      .select<string, {
        id: string;
        subarea_id: string;
        daily_points: number;
        target_points: number;
        life_goal_subareas: {
          area_id: string;
        };
      }>('id, subarea_id, daily_points, target_points, life_goal_subareas!inner(area_id)')
      .in('subarea_id', (subareas || []).map(s => s.id));

    if (goalError) {
      console.error('[SAVE POINTS] Error fetching goals:', goalError);
      throw goalError;
    }

    console.log(`[SAVE POINTS] Found ${goals?.length || 0} goals`);

    // Save goal points to history and reset daily points
    for (const goal of goals || []) {
      if (goal.daily_points > 0) {
        console.log(`[SAVE POINTS] Saving goal ${goal.id}: ${goal.daily_points} points`);
        
        // Save to history - try insert first, then update if it fails
        let { error: historyError } = await supabase
          .from('goal_points_history')
          .insert({
            goal_id: goal.id,
            date: dateStr,
            points: goal.daily_points,
            target: goal.target_points
          });

        // If insert fails due to duplicate, try update instead
        if (historyError && historyError.code === '23505') { // unique_violation
          const { error: updateError } = await supabase
            .from('goal_points_history')
            .update({
              points: goal.daily_points,
              target: goal.target_points
            })
            .eq('goal_id', goal.id)
            .eq('date', dateStr);
          
          historyError = updateError;
        }

        if (historyError) {
          console.error(`[SAVE POINTS] Error saving goal history for ${goal.id}:`, historyError);
          throw historyError;
        }

        // Reset daily points
        const { error: resetError } = await supabase
          .from('life_goals')
          .update({
            daily_points: 0
          })
          .eq('id', goal.id);

        if (resetError) {
          console.error(`[SAVE POINTS] Error resetting goal ${goal.id}:`, resetError);
          throw resetError;
        }
      }
    }

    console.log('[SAVE POINTS] Successfully saved all points to history');
    return true;
  } catch (error) {
    console.error('[SAVE POINTS] Error saving points:', error);
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
  console.log('[AUTO-SAVE] Initializing auto-save for user:', userId);
  
  // Calculate time until next midnight
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const timeUntilMidnight = tomorrow.getTime() - now.getTime();
  
  console.log(`[AUTO-SAVE] Next reset at midnight (${tomorrow.toISOString()}) in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);
  
  // Set timeout for midnight reset
  const midnightTimeout = setTimeout(async () => {
    console.log('[AUTO-SAVE] Midnight reached, saving points and resetting...');
    try {
      await savePointsToDate();
      console.log('[AUTO-SAVE] Successfully saved points at midnight');
    } catch (error) {
      console.error('[AUTO-SAVE] Error saving points at midnight:', error);
    }
    
    // Schedule next midnight reset
    const nextMidnightTimeout = setTimeout(() => {
      initializeAutoSave(userId);
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    // Store the timeout ID for cleanup
    (globalThis as any).nextMidnightTimeout = nextMidnightTimeout;
  }, timeUntilMidnight);
  
  // Store the timeout ID for cleanup
  (globalThis as any).midnightTimeout = midnightTimeout;
  
  // Return cleanup function
  return () => {
    console.log('[AUTO-SAVE] Cleaning up auto-save timers');
    if ((globalThis as any).midnightTimeout) {
      clearTimeout((globalThis as any).midnightTimeout);
    }
    if ((globalThis as any).nextMidnightTimeout) {
      clearTimeout((globalThis as any).nextMidnightTimeout);
    }
  };
} 