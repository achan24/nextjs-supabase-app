import { TableDefinition } from './types';

/**
 * @table process_mapper_timeline_notes
 * @description Timeline notes added during Process Mapper sessions and replays
 */
export const ProcessMapperTimelineNote: TableDefinition = {
  name: 'process_mapper_timeline_notes',
  description: 'Timeline notes added during Process Mapper sessions and replays',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    step_id: {
      type: 'uuid',
      references: 'process_mapper_steps(id)',
      notNull: true
    },
    session_id: {
      type: 'uuid',
      references: 'process_mapper_sessions(id)',
      notNull: true
    },
    replay_instance_id: {
      type: 'uuid',
      references: 'process_mapper_replay_instances(id)',
      notNull: false
    },
    timestamp: {
      type: 'timestamptz',
      notNull: true,
      defaultValue: 'now()'
    },
    note: {
      type: 'text',
      notNull: true
    },
    instance_version: {
      type: 'integer',
      notNull: true,
      defaultValue: '0'
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
      table: 'process_mapper_steps',
      foreignKey: 'step_id'
    },
    {
      type: 'belongsTo',
      table: 'process_mapper_sessions',
      foreignKey: 'session_id'
    },
    {
      type: 'belongsTo',
      table: 'process_mapper_replay_instances',
      foreignKey: 'replay_instance_id'
    }
  ],
  indexes: [
    {
      name: 'process_mapper_timeline_notes_step_id_idx',
      columns: ['step_id']
    },
    {
      name: 'process_mapper_timeline_notes_session_id_idx',
      columns: ['session_id']
    },
    {
      name: 'process_mapper_timeline_notes_timestamp_idx',
      columns: ['timestamp']
    }
  ],
  policies: [
    {
      name: 'Users can create timeline notes for their own sessions',
      operation: 'insert',
      check: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can view timeline notes for their own sessions',
      operation: 'select',
      using: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can update timeline notes for their own sessions',
      operation: 'update',
      using: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can delete timeline notes for their own sessions',
      operation: 'delete',
      using: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    }
  ]
}; 