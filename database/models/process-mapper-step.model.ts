import { TableDefinition } from './types';

/**
 * @table process_mapper_steps
 * @description Individual steps within a Process Mapper session
 */
export const ProcessMapperStep: TableDefinition = {
  name: 'process_mapper_steps',
  description: 'Individual steps within a Process Mapper session',
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
    title: {
      type: 'text',
      notNull: true
    },
    description: {
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
    duration: {
      type: 'integer',
      notNull: false
    },
    order_index: {
      type: 'integer',
      notNull: true
    },
    confidence: {
      type: 'integer',
      notNull: false,
      check: 'confidence >= 1 AND confidence <= 10'
    },
    energy: {
      type: 'integer',
      notNull: false,
      check: 'energy >= 1 AND energy <= 10'
    },
    response: {
      type: 'text',
      notNull: false,
      check: "response IN ('positive', 'neutral', 'negative', 'none')"
    },
    notes: {
      type: 'text',
      notNull: false
    },
    task_node_id: {
      type: 'uuid',
      references: 'nodes(id)',
      notNull: false
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
      type: 'belongsTo',
      table: 'nodes',
      foreignKey: 'task_node_id'
    },
    {
      type: 'hasMany',
      table: 'process_mapper_timeline_notes',
      foreignKey: 'step_id'
    }
  ],
  indexes: [
    {
      name: 'process_mapper_steps_session_id_idx',
      columns: ['session_id']
    },
    {
      name: 'process_mapper_steps_order_index_idx',
      columns: ['order_index']
    },
    {
      name: 'process_mapper_steps_start_time_idx',
      columns: ['start_time']
    }
  ],
  policies: [
    {
      name: 'Users can create steps for their own sessions',
      operation: 'insert',
      check: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can view steps for their own sessions',
      operation: 'select',
      using: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can update steps for their own sessions',
      operation: 'update',
      using: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can delete steps for their own sessions',
      operation: 'delete',
      using: 'EXISTS (SELECT 1 FROM process_mapper_sessions WHERE id = session_id AND user_id = auth.uid())'
    }
  ]
}; 