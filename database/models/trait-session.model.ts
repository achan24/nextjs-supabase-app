import { TableDefinition } from './types';

/**
 * @table trait_sessions
 * @description Track individual work sessions and their details for trait scoring
 */
export const TraitSession: TableDefinition = {
  name: 'trait_sessions',
  description: 'Track individual work sessions and their details for trait scoring',
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
    task_id: {
      type: 'uuid',
      references: 'tasks(id)',
      notNull: false
    },
    t_start: {
      type: 'timestamptz',
      notNull: true
    },
    t_end: {
      type: 'timestamptz',
      notNull: false
    },
    duration_min: {
      type: 'integer',
      notNull: false,
      check: 'duration_min >= 0'
    },
    events: {
      type: 'jsonb',
      notNull: true,
      defaultValue: "'[]'::jsonb"
    },
    self_report: {
      type: 'jsonb',
      notNull: true,
      defaultValue: "'{}'::jsonb"
    },
    task_classification: {
      type: 'jsonb',
      notNull: true,
      defaultValue: "'{}'::jsonb"
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
      table: 'tasks',
      foreignKey: 'task_id'
    },
    {
      type: 'hasMany',
      table: 'trait_xp_records',
      foreignKey: 'session_id'
    }
  ],
  indexes: [
    {
      name: 'trait_sessions_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'trait_sessions_task_id_idx',
      columns: ['task_id']
    },
    {
      name: 'trait_sessions_t_start_idx',
      columns: ['t_start']
    }
  ],
  policies: [
    {
      name: 'Users can view own trait sessions',
      operation: 'select',
      using: 'user_id = auth.uid()'
    },
    {
      name: 'Users can insert own trait sessions',
      operation: 'insert',
      check: 'user_id = auth.uid()'
    },
    {
      name: 'Users can update own trait sessions',
      operation: 'update',
      using: 'user_id = auth.uid()'
    },
    {
      name: 'Users can delete own trait sessions',
      operation: 'delete',
      using: 'user_id = auth.uid()'
    }
  ]
};
