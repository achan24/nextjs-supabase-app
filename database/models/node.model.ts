import { TableDefinition } from './types';

/**
 * @table nodes
 * @description Individual nodes in process flows that represent tasks, notes, skills, etc.
 */
export const Node: TableDefinition = {
  name: 'nodes',
  description: 'Individual nodes in process flows that represent tasks, notes, skills, etc.',
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
    type: {
      type: 'text',
      notNull: true
    },
    position: {
      type: 'jsonb',
      notNull: false
    },
    data: {
      type: 'jsonb',
      notNull: false
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
      foreignKey: 'node_id'
    },
    {
      type: 'hasMany',
      table: 'project_node_links',
      foreignKey: 'node_id'
    }
  ],
  indexes: [
    {
      name: 'nodes_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'nodes_type_idx',
      columns: ['type']
    }
  ],
  policies: [
    {
      name: 'Users can manage their own nodes',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can manage their own nodes',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can manage their own nodes',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can manage their own nodes',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 