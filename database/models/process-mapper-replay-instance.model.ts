import { TableDefinition } from './types';

/**
 * @table process_mapper_replay_instances
 * @description Replay instances for Process Mapper sessions
 */
export const ProcessMapperReplayInstance: TableDefinition = {
  name: 'process_mapper_replay_instances',
  description: 'Replay instances for Process Mapper sessions',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    session_id: {
      type: 'uuid',
      references: 'process_mapper_sessions(id)',
      notNull: true
    },
    instance_number: {
      type: 'integer',
      notNull: true
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
    notes: {
      type: 'jsonb',
      notNull: true,
      defaultValue: "'[]'::jsonb"
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      defaultValue: 'now()'
    }
  },
  relationships: [
    {
      type: 'belongsTo',
      table: 'process_mapper_sessions',
      foreignKey: 'session_id'
    },
    {
      type: 'hasMany',
      table: 'process_mapper_timeline_notes',
      foreignKey: 'replay_instance_id'
    }
  ],
  indexes: [
    {
      name: 'process_mapper_replay_instances_session_id_idx',
      columns: ['session_id']
    },
    {
      name: 'process_mapper_replay_instances_instance_number_idx',
      columns: ['instance_number']
    }
  ],
  policies: [
    {
      name: 'Users can create replay instances for their own sessions',
      operation: 'insert',
      check: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can view replay instances for their own sessions',
      operation: 'select',
      using: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can update replay instances for their own sessions',
      operation: 'update',
      using: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can delete replay instances for their own sessions',
      operation: 'delete',
      using: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    }
  ]
}; 