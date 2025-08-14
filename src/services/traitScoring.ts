import { createClient } from '@/lib/supabase/client';
import { generateQuestText, generateStreakMilestoneText, generateLevelUpText, QuestTextContext } from './questTextService';
import { showQuestToast } from '@/components/QuestToast';

export type TraitName =
  | 'Initiative'
  | 'Courage'
  | 'Discipline'
  | 'Adaptability'
  | 'Endurance'
  | 'Proactiveness'
  | 'Determination'
  | 'Resilience'
  | 'Perseverance';

export interface TaskClassificationMetadata {
  task_type?: string;
  friction_level?: 'low' | 'medium' | 'high';
  stakes?: 'low' | 'medium' | 'high';
  discomfort_level?: 'none' | 'mild' | 'moderate' | 'high';
}

export interface SessionSummary {
  durationMinutes: number;
  events: Array<{
    type: 'distraction' | 'method_switch' | 'urge_overcome' | 'approach_change';
    timestamp: string | Date;
    description?: string;
  }>;
  selfReport?: {
    urgeLevel?: 'none' | 'medium' | 'high';
    switchUnblocked?: boolean;
    returnGapDays?: number; // days between attempts
    plannedDayMatch?: boolean;
    startTiming?: 'early' | 'on_time' | 'delayed';
    prompted?: boolean;
  };
}

interface XpResult {
  trait: TraitName;
  baseXp: number;
  multipliers: Record<string, number | string>;
  finalXp: number;
  questText: string;
}

function getMultiplierFromClassification(meta: TaskClassificationMetadata): number {
  const friction = meta.friction_level || 'low';
  const stakes = meta.stakes || 'low';
  const discomfort = meta.discomfort_level || 'none';

  const frictionMult = friction === 'high' ? 1.5 : friction === 'medium' ? 1.2 : 1.0;
  const stakesMult = stakes === 'high' ? 1.2 : stakes === 'medium' ? 1.1 : 1.0;
  const discomfortMult = discomfort === 'high' ? 1.3 : discomfort === 'moderate' ? 1.2 : discomfort === 'mild' ? 1.1 : 1.0;

  return +(frictionMult * stakesMult * discomfortMult).toFixed(2);
}

function countEvents(session: SessionSummary['events']) {
  return session.reduce(
    (acc, e) => {
      acc[e.type] = (acc[e.type] || 0) as number;
      acc[e.type] = (acc[e.type] as number) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

function computeXp(
  session: SessionSummary,
  classification: TaskClassificationMetadata
): XpResult[] {
  const minutes = Math.max(0, session.durationMinutes);
  const baseXp = Math.floor(minutes / 5); // 1 XP per 5 minutes of focused work
  const multiplier = getMultiplierFromClassification(classification);
  const eventsCount = countEvents(session.events);

  const urge = eventsCount['urge_overcome'] || 0;
  const approach = eventsCount['approach_change'] || 0;
  const distractions = eventsCount['distraction'] || 0;

  // Discipline
  const disciplineBase = baseXp;
  const disciplineBonus = urge * 3;
  const disciplinePenalty = Math.min(disciplineBase, distractions); // light penalty, never below zero due to clamp
  const disciplineFinal = Math.max(0, Math.round((disciplineBase * multiplier + disciplineBonus - disciplinePenalty)));

  // Adaptability
  const adaptabilityBase = Math.round(baseXp * 0.6);
  const adaptabilityBonus = approach * 4;
  const adaptabilityFinal = Math.max(0, Math.round(adaptabilityBase * multiplier + adaptabilityBonus));

  // Perseverance
  const perseveranceBase = Math.round(baseXp * 0.8);
  const longRunBonus = minutes >= 25 ? 5 : 0; // small reward for crossing focus threshold
  const perseveranceFinal = Math.max(0, Math.round(perseveranceBase * multiplier + longRunBonus));

  // Endurance (time-in-seat)
  const enduranceFinal = Math.min(20, Math.floor(minutes / 10) * 5);

  // Determination (from self-report urge level)
  const urgeLevel = session.selfReport?.urgeLevel || 'none';
  const determinationBase = urgeLevel === 'high' ? 16 : urgeLevel === 'medium' ? 8 : 0;
  const determinationFinal = determinationBase > 0 ? Math.round(determinationBase * multiplier) : 0;

  // Adaptability bonus if switch unblocked (self-report)
  const switchUnblocked = !!session.selfReport?.switchUnblocked;
  const adaptabilityExtra = switchUnblocked ? 6 : 0;
  const adaptabilityCombined = Math.max(0, adaptabilityFinal + adaptabilityExtra);

  // Resilience (returned after gap)
  const gapDays = session.selfReport?.returnGapDays || 0;
  const resilienceFinal = gapDays >= 7 ? 25 : gapDays >= 3 ? 20 : gapDays >= 1 ? 15 : 0;

  // Initiative (from post self-report start timing)
  const startTiming = session.selfReport?.startTiming || 'on_time';
  const initiativeFinal = startTiming === 'early' ? 20 : startTiming === 'on_time' ? 12 : 6;

  // Proactiveness (prompted or not)
  const proactivenessFinal = session.selfReport?.prompted ? 2 : 6;

  // Courage from pre-classifier (discomfort/stakes/friction)
  const discomfort = classification.discomfort_level || 'none';
  const stakes = classification.stakes || 'low';
  const friction = classification.friction_level || 'low';
  const courageBase = 12;
  const discomfortAdd = discomfort === 'high' ? 12 : discomfort === 'moderate' ? 6 : 0;
  const stakesAdd = stakes === 'high' ? 12 : stakes === 'medium' ? 6 : stakes === 'low' ? 3 : 0;
  const frictionBonus = friction === 'high' ? 6 : 0;
  const courageFinal = Math.max(0, Math.round((courageBase + discomfortAdd + stakesAdd + frictionBonus) * multiplier));

  const multipliers: Record<string, number | string> = {
    multiplier,
    friction_level: classification.friction_level || 'low',
    stakes: classification.stakes || 'low',
    discomfort_level: classification.discomfort_level || 'none',
    events: JSON.stringify({ urge_overcome: urge, approach_change: approach, distraction: distractions })
  };

  const results: XpResult[] = [
    { trait: 'Initiative', baseXp: 0, multipliers, finalXp: initiativeFinal, questText: '' },
    { trait: 'Courage', baseXp: courageBase, multipliers, finalXp: courageFinal, questText: '' },
    {
      trait: 'Discipline',
      baseXp: disciplineBase,
      multipliers,
      finalXp: disciplineFinal,
      questText: `Pushed through ${urge} urge${urge === 1 ? '' : 's'} and stayed on task.`
    },
    {
      trait: 'Adaptability',
      baseXp: adaptabilityBase,
      multipliers,
      finalXp: adaptabilityCombined,
      questText: approach > 0 ? `Adapted approach ${approach} time${approach === 1 ? '' : 's'}.` : 'Stayed flexible.'
    },
    { trait: 'Endurance', baseXp: Math.floor(minutes / 10) * 5, multipliers, finalXp: enduranceFinal, questText: '' },
    { trait: 'Proactiveness', baseXp: 0, multipliers, finalXp: proactivenessFinal, questText: '' },
    { trait: 'Determination', baseXp: determinationBase, multipliers, finalXp: determinationFinal, questText: '' },
    { trait: 'Resilience', baseXp: 0, multipliers, finalXp: resilienceFinal, questText: '' },
    {
      trait: 'Perseverance',
      baseXp: perseveranceBase,
      multipliers,
      finalXp: perseveranceFinal,
      questText: minutes >= 25 ? 'Crossed a focus block.' : 'Chipped away steadily.'
    }
  ];

  // prune zero-xp placeholder traits
  return results.filter(r => r.finalXp > 0);
}

export async function calculateAndAwardXpAndTokens(
  sessionId: string,
  taskId: string,
  userId: string,
  session: SessionSummary
) {
  const supabase = createClient();

  // 1) Fetch classification from task_trait_tags
  const { data: tagRows, error: tagErr } = await supabase
    .from('task_trait_tags')
    .select('task_metadata')
    .eq('task_id', taskId)
    .limit(1);

  if (tagErr) {
    // Log and bail softly
    console.error('[TraitXP] Error loading task classification:', tagErr);
    return;
  }

  const classification: TaskClassificationMetadata = (tagRows && tagRows[0]?.task_metadata) || {};

  // 2) Compute XP
  const results = computeXp(session, classification);

  // 3) Write trait_xp_records
  const xpRecords = results
    .filter(r => r.finalXp > 0)
    .map(r => ({
      session_id: sessionId,
      trait_name: r.trait,
      base_xp: r.baseXp,
      multipliers: r.multipliers,
      final_xp: r.finalXp,
      quest_text: r.questText
    }));

  if (xpRecords.length > 0) {
    const { error: xpErr } = await supabase.from('trait_xp_records').insert(xpRecords);
    if (xpErr) {
      console.error('[TraitXP] Error inserting xp records:', xpErr);
    }
  }

  // 4) Mint tokens based on total XP
  const totalXp = results.reduce((sum, r) => sum + r.finalXp, 0);
  const tokens = Math.floor(totalXp / 10); // simple conversion for v1
  if (tokens > 0) {
    // upsert wallet balance and insert mint event
    const { error: mintErr } = await supabase.rpc('mint_tokens_v1', {
      p_user_id: userId,
      p_amount: tokens,
      p_meta: { session_id: sessionId, task_id: taskId, total_xp: totalXp }
    });
    if (mintErr) {
      console.error('[TraitXP] Error minting tokens:', mintErr);
    }
  }

  // Generate and show quest text for the most significant trait improvement
  if (results.length > 0) {
    const bestResult = results.reduce((best, current) => 
      current.finalXp > best.finalXp ? current : best
    );
    
    const questContext: QuestTextContext = {
      traitName: bestResult.trait,
      actionType: 'session_complete',
      sessionData: {
        durationMinutes: session.durationMinutes,
        taskTitle: 'Task Session',
        taskType: classification.task_type || 'general',
        highFriction: classification.friction_level === 'high',
        highStakes: classification.stakes === 'high',
        discomfort: classification.discomfort_level || 'none'
      },
      userContext: {
        timeOfDay: getTimeOfDay(),
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        previousSessionsToday: 0 // Could be calculated from DB
      }
    };

    const questText = generateQuestText(questContext);
    if (questText.tokenBonus) {
      questText.tokenBonus += tokens; // Add base tokens to bonus display
    }
    
    showQuestToast(questText);
  }

  return { results, totalXp, tokens };
}

// Helper function to get time of day
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

// Award XP/tokens for all completed sessions of a task that have NOT yet been scored
export async function awardUnscoredSessionsForTask(
  taskId: string,
  userId: string
) {
  const supabase = createClient();

  // 1) Fetch classification
  const { data: tagRows } = await supabase
    .from('task_trait_tags')
    .select('task_metadata')
    .eq('task_id', taskId)
    .limit(1);
  const classification: TaskClassificationMetadata = (tagRows && tagRows[0]?.task_metadata) || {};

  // 2) Load all completed sessions for this task
  const { data: sessions } = await supabase
    .from('trait_sessions')
    .select('id, t_start, t_end, duration_min, events')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .not('t_end', 'is', null);

  if (!sessions || sessions.length === 0) return { totalXp: 0, tokens: 0 };

  const sessionIds = sessions.map(s => s.id);
  // 3) Find already-scored sessions
  const { data: scored } = await supabase
    .from('trait_xp_records')
    .select('session_id')
    .in('session_id', sessionIds);
  const scoredSet = new Set((scored || []).map(r => r.session_id as string));

  let totalXp = 0;
  const perTraitTotals: Record<string, number> = { Discipline: 0, Adaptability: 0, Perseverance: 0 };
  const xpRecordsToInsert: any[] = [];
  const unscoredSessionIds: string[] = [];

  for (const s of sessions) {
    if (scoredSet.has(s.id)) continue;
    unscoredSessionIds.push(s.id);
    const summary: SessionSummary = {
      durationMinutes: s.duration_min || 0,
      events: (s.events || []).map((e: any) => ({ type: e.type, timestamp: e.timestamp, description: e.description })),
    };

    const results = computeXp(summary, classification);
    totalXp += results.reduce((sum, r) => sum + r.finalXp, 0);
    results.forEach(r => { perTraitTotals[r.trait] = (perTraitTotals[r.trait] || 0) + r.finalXp; });

    for (const r of results) {
      if (r.finalXp <= 0) continue;
      xpRecordsToInsert.push({
        session_id: s.id,
        trait_name: r.trait,
        base_xp: r.baseXp,
        multipliers: r.multipliers,
        final_xp: r.finalXp,
        quest_text: r.questText,
      });
    }
  }

  if (xpRecordsToInsert.length > 0) {
    const { error: xpErr } = await supabase.from('trait_xp_records').insert(xpRecordsToInsert);
    if (xpErr) console.error('[TraitXP] Error inserting xp (completion):', xpErr);
  }

  const tokens = Math.floor(totalXp / 10);
  if (tokens > 0 && unscoredSessionIds.length > 0) {
    const { error: mintErr } = await supabase.rpc('mint_tokens_v1', {
      p_user_id: userId,
      p_amount: tokens,
      p_meta: { task_id: taskId, session_ids: unscoredSessionIds, total_xp: totalXp, per_trait: perTraitTotals, source: 'task_complete' },
    });
    if (mintErr) console.error('[TraitXP] Error minting tokens (completion):', mintErr);
  }

  return { totalXp, tokens, perTraitTotals };
}


