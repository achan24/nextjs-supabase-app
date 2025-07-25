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

export async function updateXPFromPoints(userId: string, points: number) {
  // Get current character
  const { data: characters } = await supabase
    .from('characters')
    .select('id, xp')
    .eq('user_id', userId)
    .limit(1);

  if (!characters?.length) return;

  const character = characters[0];
  const newXP = (character.xp || 0) + points;

  // Update character XP
  await supabase
    .from('characters')
    .update({ xp: newXP })
    .eq('id', character.id);
}

export async function calculateTotalPoints(userId: string) {
  const { data: totalPoints } = await supabase
    .rpc('get_user_total_points', { p_user_id: userId });

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
  
  // Calculate level and remaining XP
  let level = 1;
  let remainingXP = totalXP;
  
  while (remainingXP >= calculateRequiredXP(level)) {
    remainingXP -= calculateRequiredXP(level);
    level++;
  }
  
  const requiredXP = calculateRequiredXP(level);
  
  // Update character record to match calculated values
  await supabase
    .from('characters')
    .update({ 
      level,
      xp: remainingXP
    })
    .eq('user_id', userId);
  
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