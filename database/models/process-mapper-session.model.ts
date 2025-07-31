import { TableDefinition } from './types';

/**
 * @table process_mapper_sessions
 * @description Process Mapper sessions for real-time process capture and analysis
 */
export const ProcessMapperSession: TableDefinition = {
  name: 'process_mapper_sessions',
  description: 'Process Mapper sessions for real-time process capture and analysis',
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
    name: {
      type: 'text',
      notNull: true
    },
    description: {
      type: 'text',
      notNull: false
    },
    context: {
      type: 'text',
      notNull: false,
      check: "context IN ('academic', 'professional', 'social', 'personal', 'creative')"
    },
    location: {
      type: 'text',
      notNull: false
    },
    environment: {
      type: 'text',
      notNull: false
    },
    start_time: {
      type: 'timestamptz',
      notNull: true,
      defaultValue: 'now()'
    },
    end_time: {
      type: 'timestamptz',
      notNull: false
    },
    status: {
      type: 'text',
      notNull: true,
      defaultValue: "'active'",
      check: "status IN ('active', 'paused', 'completed')"
    },
    total_duration: {
      type: 'integer',
      notNull: false
    },
    complexity: {
      type: 'text',
      notNull: true,
      defaultValue: "'linear'",
      check: "complexity IN ('linear', 'branching', 'complex')"
    },
    outcome: {
      type: 'text',
      notNull: false,
      check: "outcome IN ('positive', 'neutral', 'negative', 'unclear')"
    },
    notes: {
      type: 'text',
      notNull: false
    },
    temp_map_id: {
      type: 'uuid',
      references: 'process_flows(id)',
      notNull: false
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
      table: 'process_flows',
      foreignKey: 'temp_map_id'
    },
    {
      type: 'hasMany',
      table: 'process_mapper_steps',
      foreignKey: 'session_id'
    },
    {
      type: 'hasMany',
      table: 'process_mapper_replay_instances',
      foreignKey: 'session_id'
    }
  ],
  indexes: [
    {
      name: 'process_mapper_sessions_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'process_mapper_sessions_status_idx',
      columns: ['status']
    },
    {
      name: 'process_mapper_sessions_start_time_idx',
      columns: ['start_time']
    }
  ],
  policies: [
    {
      name: 'Users can create their own process mapper sessions',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can view their own process mapper sessions',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update their own process mapper sessions',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete their own process mapper sessions',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 