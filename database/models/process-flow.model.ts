import { TableDefinition } from './types';

/**
 * @table process_flows
 * @description Visual process flows that contain nodes and edges for tracking workflows and practices
 */
export const ProcessFlow: TableDefinition = {
  name: 'process_flows',
  description: 'Visual process flows that contain nodes and edges for tracking workflows and practices',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    title: {
      type: 'text',
      notNull: true
    },
    description: {
      type: 'text',
      notNull: false
    },
    nodes: {
      type: 'jsonb',
      notNull: true,
      defaultValue: "'[]'::jsonb"
    },
    edges: {
      type: 'jsonb',
      notNull: true,
      defaultValue: "'[]'::jsonb"
    },
    user_id: {
      type: 'uuid',
      references: 'auth.users(id)',
      notNull: true
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
      type: 'hasMany',
      table: 'process_flow_node_refs',
      foreignKey: 'flow_id'
    },
    {
      type: 'hasMany',
      table: 'project_node_links',
      foreignKey: 'flow_id'
    }
  ],
  indexes: [
    {
      name: 'process_flows_user_id_idx',
      columns: ['user_id']
    }
  ],
  policies: [
    {
      name: 'Users can create their own process flows',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can view their own process flows',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update their own process flows',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete their own process flows',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 