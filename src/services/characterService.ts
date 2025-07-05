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

async function calculateTotalPoints(userId: string): Promise<number> {
  // First get all goal IDs for this user through the hierarchy
  const { data: areas, error: areasError } = await supabase
    .from('life_goal_areas')
    .select(`
      life_goal_subareas (
        life_goals (
          id,
          current_points
        )
      )
    `)
    .eq('user_id', userId);

  if (areasError) {
    console.error('Error fetching areas:', areasError);
    throw areasError;
  }
  if (!areas) return 0;

  // Extract all goal IDs
  const goalIds = areas.flatMap(a => 
    a.life_goal_subareas?.flatMap(s => s.life_goals?.map(g => g.id) || []) || []
  );

  if (goalIds.length === 0) return 0;

  // Get historical points only from goals
  const { data: goalHistory } = await supabase
    .from('goal_points_history')
    .select('points')
    .in('goal_id', goalIds);

  // Sum up historical goal points
  const historicalPoints = goalHistory?.reduce((sum, record) => sum + (record.points || 0), 0) || 0;

  // Sum up current goal points
  const currentPoints = areas.reduce((total, area) => {
    const subareaPoints = area.life_goal_subareas?.reduce((subTotal, subarea) => {
      const goalPoints = subarea.life_goals?.reduce((goalTotal, goal) => 
        goalTotal + (goal.current_points || 0), 0) || 0;
      return subTotal + goalPoints;
    }, 0) || 0;
    return total + subareaPoints;
  }, 0);

  console.log('[XP] Points calculation:', {
    historicalPoints,
    currentPoints,
    total: historicalPoints + currentPoints,
    totalXP: (historicalPoints + currentPoints) * XP_PER_POINT
  });

  return historicalPoints + currentPoints;
}

export async function updateXPFromPoints(userId: string, pointDelta: number) {
  // Get total points including history
  const totalPoints = await calculateTotalPoints(userId);
  const totalXP = totalPoints * XP_PER_POINT;
  
  // Calculate level based on total XP
  let level = 1;
  let remainingXP = totalXP;
  
  while (remainingXP >= calculateRequiredXP(level)) {
    remainingXP -= calculateRequiredXP(level);
    level++;
  }
  
  // Update character
  const { error: updateError } = await supabase
    .from('characters')
    .update({ 
      level,
      xp: remainingXP
    })
    .eq('user_id', userId);

  if (updateError) {
    throw updateError;
  }

  const requiredXP = calculateRequiredXP(level);
  
  return { 
    level, 
    xp: remainingXP,
    requiredXP,
    progress: Math.round((remainingXP / requiredXP) * 100)
  };
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