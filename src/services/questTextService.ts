// Quest Text & Motivation Service
// Generates dynamic, engaging text to celebrate user actions and provide ADHD-friendly immediate reinforcement

export interface QuestTextContext {
  traitName: string;
  actionType: 'session_start' | 'session_complete' | 'task_complete' | 'streak_milestone' | 'trait_level_up';
  sessionData?: {
    durationMinutes: number;
    taskTitle: string;
    taskType: string;
    highFriction: boolean;
    highStakes: boolean;
    discomfort: string;
  };
  traitProgress?: {
    currentLevel: number;
    currentXP: number;
    requiredXP: number;
    streakDays: number;
  };
  userContext?: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    previousSessionsToday: number;
  };
}

export interface QuestTextResult {
  title: string;
  message: string;
  emoji: string;
  tokenBonus?: number;
  motivationalLevel: 'encouraging' | 'celebratory' | 'inspiring';
}

// Trait-specific quest text generators
const traitQuestTexts = {
  Initiative: {
    session_start: {
      encouraging: [
        { title: "Quick Start!", message: "You're jumping right in - that's initiative in action!", emoji: "⚡" },
        { title: "No Delay!", message: "Starting immediately shows real initiative!", emoji: "🚀" },
        { title: "Action Taker!", message: "You're not waiting around - that's the spirit!", emoji: "💪" }
      ],
      celebratory: [
        { title: "Initiative Master!", message: "You're starting faster than ever - your initiative is growing!", emoji: "🌟" },
        { title: "Lightning Start!", message: "From zero to action in seconds - that's initiative!", emoji: "⚡" }
      ]
    },
    session_complete: {
      encouraging: [
        { title: "Initiative Rewarded!", message: "Your quick start paid off with a solid session!", emoji: "🎯" },
        { title: "Action Completed!", message: "You took initiative and followed through - well done!", emoji: "✅" }
      ]
    }
  },

  Courage: {
    session_start: {
      encouraging: [
        { title: "Facing the Challenge!", message: "Starting something difficult takes real courage!", emoji: "🦁" },
        { title: "Brave Start!", message: "You're tackling this despite the discomfort - that's courage!", emoji: "💪" }
      ],
      celebratory: [
        { title: "Courageous Action!", message: "You're getting braver with every difficult task!", emoji: "🦁" },
        { title: "Fearless!", message: "Your courage is growing stronger every day!", emoji: "⚔️" }
      ]
    },
    session_complete: {
      encouraging: [
        { title: "Courage Rewarded!", message: "You faced the challenge and came through stronger!", emoji: "🏆" },
        { title: "Bravery Pays Off!", message: "Your courage led to real progress!", emoji: "🎖️" }
      ]
    }
  },

  Discipline: {
    session_start: {
      encouraging: [
        { title: "Staying on Track!", message: "Following through on your plan shows discipline!", emoji: "📋" },
        { title: "Discipline in Action!", message: "You're sticking to your schedule - that's discipline!", emoji: "⏰" }
      ],
      celebratory: [
        { title: "Discipline Master!", message: "Your discipline is becoming rock solid!", emoji: "🏛️" },
        { title: "Consistency King!", message: "You're building real discipline habits!", emoji: "👑" }
      ]
    },
    session_complete: {
      encouraging: [
        { title: "Discipline Rewarded!", message: "Your consistent effort is paying off!", emoji: "💎" },
        { title: "Staying Strong!", message: "You maintained discipline throughout - excellent!", emoji: "🛡️" }
      ]
    }
  },

  Adaptability: {
    session_start: {
      encouraging: [
        { title: "Adapting to Succeed!", message: "You're finding ways to make this work!", emoji: "🔄" },
        { title: "Flexible Approach!", message: "You're adapting your strategy - smart thinking!", emoji: "🧠" }
      ],
      celebratory: [
        { title: "Adaptability Expert!", message: "You're getting better at finding solutions!", emoji: "🎯" },
        { title: "Problem Solver!", message: "Your adaptability is becoming a superpower!", emoji: "🦸" }
      ]
    },
    session_complete: {
      encouraging: [
        { title: "Adaptation Success!", message: "Your flexible approach led to completion!", emoji: "🎉" },
        { title: "Solution Found!", message: "You adapted and overcame - well done!", emoji: "✅" }
      ]
    }
  },

  Endurance: {
    session_start: {
      encouraging: [
        { title: "Building Endurance!", message: "You're developing the stamina to see things through!", emoji: "🏃" },
        { title: "Staying Power!", message: "You're building the endurance to complete this!", emoji: "💪" }
      ],
      celebratory: [
        { title: "Endurance Champion!", message: "Your staying power is impressive!", emoji: "🏆" },
        { title: "Marathon Runner!", message: "You're developing real endurance!", emoji: "🏃‍♂️" }
      ]
    },
    session_complete: {
      encouraging: [
        { title: "Endurance Rewarded!", message: "Your sustained effort led to success!", emoji: "🎯" },
        { title: "Stamina Pays Off!", message: "Your endurance carried you through!", emoji: "💎" }
      ]
    }
  },

  Proactiveness: {
    session_start: {
      encouraging: [
        { title: "Proactive Action!", message: "You're taking charge before being asked!", emoji: "🎯" },
        { title: "Ahead of the Game!", message: "You're being proactive - that's leadership!", emoji: "🚀" }
      ],
      celebratory: [
        { title: "Proactivity Master!", message: "You're becoming a proactive powerhouse!", emoji: "🌟" },
        { title: "Natural Leader!", message: "Your proactiveness is inspiring!", emoji: "👑" }
      ]
    },
    session_complete: {
      encouraging: [
        { title: "Proactivity Pays!", message: "Your proactive approach led to success!", emoji: "🎉" },
        { title: "Leadership in Action!", message: "You took charge and delivered results!", emoji: "🏆" }
      ]
    }
  },

  Determination: {
    session_start: {
      encouraging: [
        { title: "Determined to Succeed!", message: "You're showing real determination to complete this!", emoji: "🔥" },
        { title: "Unstoppable!", message: "Your determination is your superpower!", emoji: "💪" }
      ],
      celebratory: [
        { title: "Determination Master!", message: "Your determination is becoming legendary!", emoji: "🏆" },
        { title: "Iron Will!", message: "Your determination is unbreakable!", emoji: "⚡" }
      ]
    },
    session_complete: {
      encouraging: [
        { title: "Determination Rewarded!", message: "Your determination carried you to completion!", emoji: "🎯" },
        { title: "Unstoppable Force!", message: "Your determination overcame every obstacle!", emoji: "💎" }
      ]
    }
  },

  Resilience: {
    session_start: {
      encouraging: [
        { title: "Bouncing Back!", message: "You're showing real resilience by returning to this!", emoji: "🔄" },
        { title: "Resilient Return!", message: "You're back and ready to tackle this again!", emoji: "💪" }
      ],
      celebratory: [
        { title: "Resilience Master!", message: "Your ability to bounce back is incredible!", emoji: "🌟" },
        { title: "Unbreakable!", message: "Your resilience is becoming your strength!", emoji: "🛡️" }
      ]
    },
    session_complete: {
      encouraging: [
        { title: "Resilience Rewarded!", message: "Your comeback led to success!", emoji: "🎉" },
        { title: "Stronger Than Ever!", message: "Your resilience made you stronger!", emoji: "🏆" }
      ]
    }
  },

  Perseverance: {
    session_start: {
      encouraging: [
        { title: "Persevering!", message: "You're showing perseverance by continuing this journey!", emoji: "🏃" },
        { title: "Staying the Course!", message: "Your perseverance is keeping you on track!", emoji: "🎯" }
      ],
      celebratory: [
        { title: "Perseverance Master!", message: "Your long-term commitment is inspiring!", emoji: "🌟" },
        { title: "Long-Distance Runner!", message: "Your perseverance is building something lasting!", emoji: "🏃‍♂️" }
      ]
    },
    session_complete: {
      encouraging: [
        { title: "Perseverance Pays!", message: "Your continued effort led to this success!", emoji: "🎯" },
        { title: "Journey Continues!", message: "Your perseverance is building real progress!", emoji: "💎" }
      ]
    }
  }
};

// Context-aware quest text modifiers
const contextModifiers = {
  timeOfDay: {
    morning: {
      encouraging: "Starting your day strong!",
      celebratory: "What a way to start your day!"
    },
    afternoon: {
      encouraging: "Keeping the momentum going!",
      celebratory: "Afternoon energy is flowing!"
    },
    evening: {
      encouraging: "Finishing strong!",
      celebratory: "Ending your day with purpose!"
    },
    night: {
      encouraging: "Late night dedication!",
      celebratory: "Night owl power!"
    }
  },
  
  highFriction: {
    encouraging: "Especially impressive since this was challenging!",
    celebratory: "You conquered a difficult task!"
  },
  
  highStakes: {
    encouraging: "This matters - your effort shows!",
    celebratory: "High stakes, high rewards!"
  },
  
  streakDays: {
    3: "You're building a streak!",
    7: "A full week of consistency!",
    14: "Two weeks strong!",
    30: "A month of dedication!"
  }
};

// Token bonus calculations based on context
const calculateTokenBonus = (context: QuestTextContext): number => {
  let bonus = 0;
  
  if (context.sessionData) {
    // Base bonus for completing session
    bonus += 1;
    
    // High friction bonus
    if (context.sessionData.highFriction) {
      bonus += 2;
    }
    
    // High stakes bonus
    if (context.sessionData.highStakes) {
      bonus += 1;
    }
    
    // Discomfort bonus
    if (context.sessionData.discomfort === 'high') {
      bonus += 2;
    } else if (context.sessionData.discomfort === 'medium') {
      bonus += 1;
    }
    
    // Duration bonus (longer sessions get more tokens)
    if (context.sessionData.durationMinutes >= 60) {
      bonus += 2;
    } else if (context.sessionData.durationMinutes >= 30) {
      bonus += 1;
    }
  }
  
  // Streak bonus
  if (context.traitProgress?.streakDays) {
    if (context.traitProgress.streakDays >= 7) {
      bonus += 1;
    }
    if (context.traitProgress.streakDays >= 14) {
      bonus += 1;
    }
  }
  
  return Math.min(bonus, 5); // Cap at 5 bonus tokens
};

// Main quest text generator
export function generateQuestText(context: QuestTextContext): QuestTextResult {
  const trait = traitQuestTexts[context.traitName as keyof typeof traitQuestTexts];
  if (!trait) {
    return {
      title: "Great Work!",
      message: "You're making progress on your traits!",
      emoji: "🎉",
      motivationalLevel: "encouraging"
    };
  }

  const actionTexts = trait[context.actionType as keyof typeof trait];
  if (!actionTexts) {
    return {
      title: "Progress Made!",
      message: `Your ${context.traitName} is growing stronger!`,
      emoji: "💪",
      motivationalLevel: "encouraging"
    };
  }

  // Determine motivational level based on context
  let motivationalLevel: 'encouraging' | 'celebratory' | 'inspiring' = 'encouraging';
  
  if (context.traitProgress) {
    if (context.traitProgress.streakDays >= 7) {
      motivationalLevel = 'celebratory';
    }
    if (context.traitProgress.currentLevel >= 5) {
      motivationalLevel = 'inspiring';
    }
  }

  // Get base quest text - ensure we have a valid motivational level
  const baseTexts = (actionTexts as any)[motivationalLevel] || (actionTexts as any).encouraging;
  const baseText = baseTexts[Math.floor(Math.random() * baseTexts.length)];

  // Add context modifiers
  let enhancedMessage = baseText.message;
  
  if (context.userContext?.timeOfDay && contextModifiers.timeOfDay[context.userContext.timeOfDay]) {
    const timeModifier = (contextModifiers.timeOfDay[context.userContext.timeOfDay] as any)[motivationalLevel] || 
                        (contextModifiers.timeOfDay[context.userContext.timeOfDay] as any).encouraging;
    enhancedMessage += ` ${timeModifier}`;
  }

  if (context.sessionData?.highFriction && (contextModifiers.highFriction as any)[motivationalLevel]) {
    enhancedMessage += ` ${(contextModifiers.highFriction as any)[motivationalLevel]}`;
  }

  if (context.sessionData?.highStakes && (contextModifiers.highStakes as any)[motivationalLevel]) {
    enhancedMessage += ` ${(contextModifiers.highStakes as any)[motivationalLevel]}`;
  }

  // Calculate token bonus
  const tokenBonus = calculateTokenBonus(context);

  return {
    title: baseText.title,
    message: enhancedMessage,
    emoji: baseText.emoji,
    tokenBonus: tokenBonus > 0 ? tokenBonus : undefined,
    motivationalLevel
  };
}

// Generate streak milestone text
export function generateStreakMilestoneText(traitName: string, streakDays: number): QuestTextResult {
  const milestones = {
    3: { title: "Streak Building!", message: `You've maintained ${traitName} for 3 days straight!`, emoji: "🔥" },
    7: { title: "Week Warrior!", message: `A full week of ${traitName} - you're building real habits!`, emoji: "🏆" },
    14: { title: "Fortnight Fighter!", message: `Two weeks of consistent ${traitName} - impressive!`, emoji: "💎" },
    30: { title: "Monthly Master!", message: `A month of ${traitName} - you're becoming unstoppable!`, emoji: "👑" }
  };

  const milestone = milestones[streakDays as keyof typeof milestones];
  if (milestone) {
    return {
      ...milestone,
      tokenBonus: Math.min(Math.floor(streakDays / 7) + 1, 5),
      motivationalLevel: 'celebratory' as const
    };
  }

  return {
    title: "Streak Continues!",
    message: `${streakDays} days of ${traitName} - keep it going!`,
    emoji: "🎯",
    motivationalLevel: 'encouraging' as const
  };
}

// Generate trait level up text
export function generateLevelUpText(traitName: string, newLevel: number): QuestTextResult {
  const levelUpTexts = {
    title: `${traitName} Level Up!`,
    message: `Your ${traitName} has reached level ${newLevel}! You're growing stronger!`,
    emoji: "⭐",
    tokenBonus: Math.min(newLevel, 5),
    motivationalLevel: 'celebratory' as const
  };

  return levelUpTexts;
}
