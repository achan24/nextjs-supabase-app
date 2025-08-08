import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// XP Progression for first 10 levels (rounded to nearest 10):
// Level 1→2: 200 XP
// Level 2→3: 270 XP  (268.0)
// Level 3→4: 350 XP  (348.4)
// Level 4→5: 440 XP  (441.7)
// Level 5→6: 550 XP  (548.2)
// Level 6→7: 670 XP  (668.4)
// Level 7→8: 800 XP  (802.7)
// Level 8→9: 950 XP  (951.5)
// Level 9→10: 1,120 XP (1,115.2)
// Level 10→11: 1,290 XP (1,294.2)

const BASE_XP = 200;
const XP_PER_POINT = 10; // Each daily progress point is worth 10 XP

export function calculateRequiredXP(level: number): number {
  const exact = BASE_XP * (1 + (level * 0.3) + (Math.pow(level, 1.4) * 0.1));
  return Math.round(exact / 10) * 10; // Round to nearest 10
}

// Character XP is calculated on-the-fly from points history
// No need to store or update character XP separately

export async function calculateTotalPoints(userId: string) {
  const { data: totalPoints } = await supabase
    .rpc('get_user_total_points', { p_user_id: userId });

  console.log('[Character XP] Total points from function:', totalPoints);

  // Also check what's actually in the goal_points_history table
  const { data: goalHistory } = await supabase
    .from('goal_points_history')
    .select('points, goal_id, date')
    .eq('user_id', userId);

  const manualSum = (goalHistory || []).reduce((sum, record) => sum + (record.points || 0), 0);
  console.log('[Character XP] Manual sum from goal_history:', manualSum);
  console.log('[Character XP] Goal history records:', goalHistory?.length || 0);

  return totalPoints || 0;
}

export async function getAreaPoints(areaId: string) {
  const { data: totalPoints } = await supabase
    .rpc('get_area_total_points', { p_area_id: areaId });

  return totalPoints || 0;
}

export async function getSubareaPoints(subareaId: string) {
  const { data: totalPoints } = await supabase
    .rpc('get_subarea_total_points', { p_subarea_id: subareaId });

  return totalPoints || 0;
}

export async function getGoalPoints(goalId: string) {
  const { data: totalPoints } = await supabase
    .rpc('get_goal_total_points', { p_goal_id: goalId });

  return totalPoints || 0;
}

export async function getCharacterProgress(userId: string) {
  // Calculate total XP from all points
  const totalPoints = await calculateTotalPoints(userId);
  const totalXP = totalPoints * XP_PER_POINT;
  
  console.log('[Character XP] Total points:', totalPoints);
  console.log('[Character XP] Total XP:', totalXP);
  
  // Calculate level and remaining XP
  let level = 1;
  let remainingXP = totalXP;
  
  while (remainingXP >= calculateRequiredXP(level)) {
    remainingXP -= calculateRequiredXP(level);
    level++;
  }
  
  const requiredXP = calculateRequiredXP(level);
  
  console.log('[Character XP] Calculated level:', level);
  console.log('[Character XP] Remaining XP:', remainingXP);
  console.log('[Character XP] Required XP for next level:', requiredXP);
  
  // No need to update characters table - just return calculated values
  return {
    level,
    xp: remainingXP,
    requiredXP,
    progress: Math.round((remainingXP / requiredXP) * 100)
  };
}

// XP values for different actions
export const XP_VALUES = {
  TASK: {
    SMALL: 10,
    MEDIUM: 20,
    LARGE: 50
  },
  MULTIPLIERS: {
    NEW: 2,      // x2 for new tasks
    DIFFICULT: 3  // x3 for difficult tasks
  }
} as const; 