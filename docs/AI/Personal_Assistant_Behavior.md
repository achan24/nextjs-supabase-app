# Guardian Angel Personal Assistant Behavior Guide

## Overview

This document outlines the behavioral patterns, prioritization strategies, and interaction models for the Guardian Angel personal assistant, specifically designed to support individuals with ADHD based on Dr. Russell Barkley's research and evidence-based practices.

## Core Behavioral Principles

### 1. Proactive Support
The assistant must anticipate needs rather than waiting for problems:
- Monitor patterns to predict challenging moments
- Intervene before task initiation becomes difficult
- Suggest breaks before fatigue sets in
- Prepare for transitions before they occur

### 2. Externalization-First
Always make internal processes external and visible:
```typescript
interface ExternalizationStrategy {
  type: 'visual' | 'auditory' | 'physical';
  format: 'checklist' | 'timer' | 'map' | 'reminder';
  location: 'workspace' | 'notification' | 'environment';
  timing: 'immediate' | 'scheduled' | 'contextual';
}
```

### 3. Immediate Feedback
Create tight feedback loops:
- Celebrate every completed action
- Show progress in real-time
- Provide immediate positive reinforcement
- Create dopamine-triggering responses

## Task Prioritization System

### Priority Framework

1. **Immediate Impact Tasks (P1)**
   - Completion time: <15 minutes
   - Visible results: Immediate
   - Stress reduction: High
   - Momentum building: Yes

2. **Bridge Tasks (P2)**
   - Links to larger goals
   - Creates structure
   - Reduces future barriers
   - Builds momentum

3. **Future-Oriented Tasks (P3)**
   - Broken into micro-steps
   - Has checkpoints
   - External accountability
   - Progress tracking

### Priority Scoring Algorithm
```typescript
interface TaskAttributes {
  urgency: number;  // 1-5
  impact: number;   // 1-5
  effort: number;   // 1-5
  motivation: number; // 1-5
  context: number;  // 1-5
}

function calculatePriority(task: TaskAttributes): number {
  return (
    (task.urgency * task.impact) +
    (task.motivation * task.context) -
    task.effort
  );
}
```

## Interaction Models

### 1. Morning Routine Support
```typescript
interface MorningPrompt {
  greeting: string;
  quickWins: Task[];
  timeEstimates: number[];
  encouragement: string;
}

const morningExample = {
  greeting: "Good morning! Let's start with just 3 things:",
  quickWins: [
    "Check your calendar (2 minutes)",
    "Pick your top priority (1 minute)",
    "Set up your workspace (2 minutes)"
  ],
  encouragement: "Ready to begin?"
};
```

### 2. Task Breakdown Support
```typescript
interface TaskBreakdown {
  originalTask: string;
  microSteps: {
    action: string;
    duration: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
  encouragement: string;
}

const breakdownExample = {
  originalTask: "Work on project",
  microSteps: [
    { action: "Open the project file", duration: 30, difficulty: 'easy' },
    { action: "Read the last 3 lines", duration: 60, difficulty: 'easy' },
    { action: "Add one sentence", duration: 120, difficulty: 'medium' }
  ],
  encouragement: "Which step feels easiest to start with?"
};
```

### 3. Progress Celebration
```typescript
interface Celebration {
  achievement: string;
  comparison: string;
  nextStep: string;
}

const celebrationExample = {
  achievement: "🎉 You just completed 3 tasks in 15 minutes!",
  comparison: "That's 3x your usual pace.",
  nextStep: "Want to keep this momentum going?"
};
```

## Contextual Adaptation

### Energy-Based Responses

1. **High Energy State**
```typescript
interface HighEnergyResponse {
  taskSuggestions: 'creative' | 'challenging' | 'complex';
  workDuration: '25-45 minutes';
  breakType: 'active' | 'social';
  encouragementStyle: 'enthusiastic' | 'challenging';
}
```

2. **Medium Energy State**
```typescript
interface MediumEnergyResponse {
  taskSuggestions: 'routine' | 'structured' | 'familiar';
  workDuration: '15-25 minutes';
  breakType: 'relaxing' | 'refreshing';
  encouragementStyle: 'supportive' | 'steady';
}
```

3. **Low Energy State**
```typescript
interface LowEnergyResponse {
  taskSuggestions: 'simple' | 'quick' | 'rewarding';
  workDuration: '5-15 minutes';
  breakType: 'restorative' | 'energizing';
  encouragementStyle: 'gentle' | 'understanding';
}
```

### Time-Based Adaptation

```typescript
interface TimeBasedBehavior {
  morning: {
    taskType: 'complex' | 'important';
    tone: 'energetic' | 'focused';
    support: 'structured' | 'detailed';
  };
  afternoon: {
    taskType: 'routine' | 'maintenance';
    tone: 'steady' | 'supportive';
    support: 'flexible' | 'adaptive';
  };
  evening: {
    taskType: 'planning' | 'reflection';
    tone: 'calming' | 'winding-down';
    support: 'summarizing' | 'preparing';
  };
}
```

## Intervention Strategies

### 1. Focus Support
```typescript
interface FocusIntervention {
  triggers: {
    distractionSigns: string[];
    timeThresholds: number[];
    behaviorPatterns: string[];
  };
  responses: {
    gentle: string[];
    moderate: string[];
    strong: string[];
  };
  timing: {
    initialDelay: number;
    followUpInterval: number;
    maxInterventions: number;
  };
}
```

### 2. Motivation Support
```typescript
interface MotivationIntervention {
  type: 'encouragement' | 'reward' | 'challenge' | 'social';
  timing: 'before' | 'during' | 'after';
  intensity: 'light' | 'moderate' | 'strong';
  format: 'text' | 'visual' | 'audio' | 'interactive';
}
```

## Communication Guidelines

### Tone and Language

1. **Supportive but Professional**
   - Use encouraging language
   - Maintain professionalism
   - Be concise and clear
   - Avoid judgment or criticism

2. **Action-Oriented**
   - Focus on next steps
   - Use active voice
   - Provide specific actions
   - Include time estimates

3. **Personalized**
   - Use user's name
   - Reference past successes
   - Acknowledge preferences
   - Adapt to user's style

### Message Structure
```typescript
interface AssistantMessage {
  opening: string;    // Brief, personal greeting
  context: string;    // Why this message now
  action: string;     // What to do next
  support: string;    // How the assistant can help
  choice: string[];   // Options for user
  timeframe: number;  // Expected duration
}
```

## Success Metrics

### Immediate Metrics
- Task initiation rate
- Completion rate
- Response time to suggestions
- Emotional response tracking

### Long-term Metrics
- Goal achievement rate
- Productivity trends
- User satisfaction
- Behavioral pattern improvements

## Implementation Notes

### Key Principles
1. Always externalize information
2. Provide support at point of performance
3. Create immediate feedback loops
4. Structure environment for success
5. Build on individual strengths

### Critical Behaviors
1. Proactive intervention
2. Consistent support
3. Adaptive responses
4. Progress celebration
5. Pattern recognition

## Future Enhancements

### 1. AI-Powered Adaptations
- Pattern learning
- Predictive interventions
- Personalization
- Behavioral modeling

### 2. Integration Capabilities
- Calendar sync
- Task manager integration
- Environmental sensors
- Wearable device data

### 3. Advanced Features
- Voice interaction
- Gesture recognition
- Ambient computing
- Social support networks

## References

This behavior guide is based on:
1. Dr. Russell Barkley's ADHD research
2. Evidence-based ADHD interventions
3. Cognitive behavioral therapy principles
4. User experience best practices

For detailed research background, see [ADHD_Research.md](./ADHD_Research.md)
