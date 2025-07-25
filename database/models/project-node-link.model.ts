import { TableDefinition } from './types';

/**
 * @table project_node_links
 * @description Links between projects and nodes in process flows
 */
export const ProjectNodeLink: TableDefinition = {
  name: 'project_node_links',
  description: 'Links between projects and nodes in process flows',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    project_id: {
      type: 'uuid',
      references: 'projects(id)',
      notNull: true
    },
    linked_flow_id: {
      type: 'uuid',
      references: 'process_flows(id)',
      notNull: true
    },
    linked_node_id: {
      type: 'text',
      notNull: true
    },
    user_id: {
      type: 'uuid',
      references: 'auth.users(id)',
      notNull: true
    },
    description: {
      type: 'text',
      notNull: false
    },
    display_order: {
      type: 'integer',
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
      table: 'projects',
      foreignKey: 'project_id'
    },
    {
      type: 'belongsTo',
      table: 'process_flows',
      foreignKey: 'linked_flow_id'
    },
    {
      type: 'belongsTo',
      table: 'auth.users',
      foreignKey: 'user_id'
    }
  ],
  indexes: [
    {
      name: 'project_node_links_project_id_idx',
      columns: ['project_id']
    },
    {
      name: 'project_node_links_linked_flow_id_idx',
      columns: ['linked_flow_id']
    },
    {
      name: 'project_node_links_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'project_node_links_unique_link',
      columns: ['project_id', 'linked_flow_id', 'linked_node_id'],
      unique: true
    }
  ],
  policies: [
    {
      name: 'Users can manage their own project node links',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can manage their own project node links',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can manage their own project node links',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can manage their own project node links',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 