import { createClient } from '@/lib/supabase/client';

/**
 * Check if this is the first task being created today for the user
 */
export async function isFirstTaskOfDay(userId: string, excludeTaskId?: string): Promise<boolean> {
  const supabase = createClient();
  
  // Get start of today in user's timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();
  
  console.log('[TaskUtils] Checking first task of day for user:', userId);
  console.log('[TaskUtils] Today start:', todayStart);
  console.log('[TaskUtils] Excluding task ID:', excludeTaskId);
  
  // Build query to check if there are any tasks created today
  let query = supabase
    .from('tasks')
    .select('id, created_at')
    .eq('user_id', userId)
    .gte('created_at', todayStart);
  
  // Exclude the current task if provided
  if (excludeTaskId) {
    query = query.neq('id', excludeTaskId);
  }
  
  const { data: tasks, error } = await query.limit(1);
  
  if (error) {
    console.error('[TaskUtils] Error checking first task of day:', error);
    return false;
  }
  
  console.log('[TaskUtils] Tasks found today (excluding current):', tasks?.length || 0);
  
  // If no tasks created today (excluding current), this is the first task
  const isFirst = !tasks || tasks.length === 0;
  console.log('[TaskUtils] Is first task:', isFirst);
  
  return isFirst;
}

/**
 * Calculate multipliers for first task of the day
 */
export function calculateFirstTaskMultipliers(
  isFirstTaskOfDay: boolean, 
  isWorkRelated?: boolean, 
  isOnTime?: boolean
): { [key: string]: number } {
  const multipliers: { [key: string]: number } = {};
  
  if (!isFirstTaskOfDay) {
    return multipliers;
  }
  
  if (isWorkRelated) {
    multipliers.work_related = 3;
  }
  
  if (isOnTime) {
    multipliers.on_time = 2;
  }
  
  return multipliers;
}

