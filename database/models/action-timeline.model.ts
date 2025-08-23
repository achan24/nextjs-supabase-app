import { z } from 'zod';

// Schema for action timeline data
export const ActionTimelineSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  data: z.object({
    actions: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      duration: z.number(),
      x: z.number(),
      y: z.number(),
      connections: z.array(z.string()),
      type: z.literal('action'),
      status: z.enum(['pending', 'running', 'completed', 'paused']),
      startTime: z.number().nullable(),
      endTime: z.number().nullable(),
      progress: z.number()
    })),
    decisionPoints: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      x: z.number(),
      y: z.number(),
      options: z.array(z.object({
        actionId: z.string(),
        label: z.string()
      })),
      type: z.literal('decision'),
      status: z.enum(['pending', 'active', 'completed']),
      selectedOption: z.string().nullable()
    })),
    currentNodeId: z.string().nullable(),
    executionHistory: z.array(z.string()),
    isRunning: z.boolean()
  }),
  is_public: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_executed_at: z.string().datetime().optional(),
  execution_count: z.number().default(0),
  total_execution_time: z.number().default(0), // in milliseconds
  favorite: z.boolean().default(false)
});

export type ActionTimeline = z.infer<typeof ActionTimelineSchema>;

// Schema for creating a new action timeline
export const CreateActionTimelineSchema = ActionTimelineSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  last_executed_at: true,
  execution_count: true,
  total_execution_time: true
});

// Schema for updating an action timeline
export const UpdateActionTimelineSchema = ActionTimelineSchema.partial().omit({
  id: true,
  user_id: true,
  created_at: true
});

// Schema for action timeline execution history
export const ActionTimelineExecutionSchema = z.object({
  id: z.string().uuid(),
  timeline_id: z.string().uuid(),
  user_id: z.string().uuid(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  duration: z.number().optional(), // in milliseconds
  status: z.enum(['running', 'completed', 'paused', 'stopped']),
  execution_path: z.array(z.object({
    nodeId: z.string(),
    nodeType: z.enum(['action', 'decision']),
    status: z.string(),
    duration: z.number().optional(),
    selectedOption: z.string().optional()
  })),
  notes: z.string().optional()
});

export type ActionTimelineExecution = z.infer<typeof ActionTimelineExecutionSchema>;

// Database table definitions
export const action_timelines_table = {
  name: 'action_timelines',
  columns: {
    id: 'uuid primary key default gen_random_uuid()',
    user_id: 'uuid references auth.users(id) on delete cascade not null',
    name: 'text not null',
    description: 'text',
    data: 'jsonb not null',
    is_public: 'boolean default false',
    tags: 'text[] default array[]::text[]',
    created_at: 'timestamp with time zone default now()',
    updated_at: 'timestamp with time zone default now()',
    last_executed_at: 'timestamp with time zone',
    execution_count: 'integer default 0',
    total_execution_time: 'bigint default 0',
    favorite: 'boolean default false'
  },
  indexes: [
    'create index idx_action_timelines_user_id on action_timelines(user_id)',
    'create index idx_action_timelines_public on action_timelines(is_public) where is_public = true',
    'create index idx_action_timelines_tags on action_timelines using gin(tags)',
    'create index idx_action_timelines_favorite on action_timelines(user_id, favorite) where favorite = true',
    'create index idx_action_timelines_updated_at on action_timelines(updated_at desc)'
  ]
};

export const action_timeline_executions_table = {
  name: 'action_timeline_executions',
  columns: {
    id: 'uuid primary key default gen_random_uuid()',
    timeline_id: 'uuid references action_timelines(id) on delete cascade not null',
    user_id: 'uuid references auth.users(id) on delete cascade not null',
    started_at: 'timestamp with time zone default now()',
    completed_at: 'timestamp with time zone',
    duration: 'bigint', // in milliseconds
    status: 'text not null check (status in (\'running\', \'completed\', \'paused\', \'stopped\'))',
    execution_path: 'jsonb not null',
    notes: 'text'
  },
  indexes: [
    'create index idx_action_timeline_executions_timeline_id on action_timeline_executions(timeline_id)',
    'create index idx_action_timeline_executions_user_id on action_timeline_executions(user_id)',
    'create index idx_action_timeline_executions_started_at on action_timeline_executions(started_at desc)',
    'create index idx_action_timeline_executions_status on action_timeline_executions(status)'
  ]
};
