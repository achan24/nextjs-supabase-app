import { z } from 'zod'
import { TableDefinition } from './types'

/**
 * @table problems
 * @description Problem tree system for tracking and organizing problems and experiments
 */
export const Problem: TableDefinition = {
  name: 'problems',
  description: 'Problem tree system for tracking and organizing problems and experiments',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    user_id: {
      type: 'uuid',
      references: 'auth.users(id)',
      notNull: true
    },
    title: {
      type: 'text',
      notNull: true,
      check: 'char_length(title) >= 1 AND char_length(title) <= 255'
    },
    description: {
      type: 'text',
      notNull: false
    },
    parent_id: {
      type: 'uuid',
      references: 'problems(id)',
      notNull: false
    },
    type: {
      type: 'text',
      notNull: true,
      defaultValue: "'problem'",
      check: "type in ('problem', 'experiment')"
    },
    status: {
      type: 'text',
      notNull: true,
      defaultValue: "'open'",
      check: "status in ('open', 'solved', 'blocked')"
    },
    priority: {
      type: 'text',
      notNull: true,
      defaultValue: "'medium'",
      check: "priority in ('low', 'medium', 'high')"
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      defaultValue: 'now()'
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      defaultValue: 'now()'
    },
    solved_at: {
      type: 'timestamptz',
      notNull: false
    },
    order_index: {
      type: 'integer',
      notNull: true,
      defaultValue: '0'
    }
  },
  relationships: [
    {
      type: 'belongsTo',
      table: 'auth.users',
      foreignKey: 'user_id'
    },
    {
      type: 'belongsTo',
      table: 'problems',
      foreignKey: 'parent_id'
    },
    {
      type: 'hasMany',
      table: 'problems',
      foreignKey: 'parent_id'
    }
  ],
  indexes: [
    {
      name: 'idx_problems_user_id',
      columns: ['user_id']
    },
    {
      name: 'idx_problems_parent_id',
      columns: ['parent_id']
    },
    {
      name: 'idx_problems_status',
      columns: ['status']
    },
    {
      name: 'idx_problems_updated_at',
      columns: ['updated_at']
    },
    {
      name: 'idx_problems_user_status',
      columns: ['user_id', 'status']
    },
    {
      name: 'idx_problems_user_parent',
      columns: ['user_id', 'parent_id']
    },
    {
      name: 'idx_problems_user_updated',
      columns: ['user_id', 'updated_at']
    }
  ],
  policies: [
    {
      name: 'Users can view their own problems',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can insert their own problems',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update their own problems',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete their own problems',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}

export const problemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  parent_id: z.string().uuid().nullable(),
  type: z.enum(['problem', 'experiment']),
  status: z.enum(['open', 'solved', 'blocked']).default('open'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  solved_at: z.string().datetime().nullable(),
  order_index: z.number().default(0),
})

export const createProblemSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  type: z.enum(['problem', 'experiment']).default('problem'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
})

export const updateProblemSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  type: z.enum(['problem', 'experiment']).optional(),
  status: z.enum(['open', 'solved', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  order_index: z.number().optional(),
})

export type Problem = z.infer<typeof problemSchema>
export type CreateProblem = z.infer<typeof createProblemSchema>
export type UpdateProblem = z.infer<typeof updateProblemSchema>

// Widget-specific types
export const problemWidgetSchema = z.object({
  problemId: z.string().uuid(),
  title: z.string(),
  openCount: z.number(),
  totalCount: z.number(),
  isBlocked: z.boolean(),
  progressPercentage: z.number(),
  type: z.enum(['problem', 'experiment']),
  priority: z.enum(['low', 'medium', 'high']),
})

export type ProblemWidget = z.infer<typeof problemWidgetSchema> 