import { TableDefinition } from './types';

/**
 * @table projects
 * @description Projects for organizing tasks and tracking larger initiatives
 */
export const Project: TableDefinition = {
  name: 'projects',
  description: 'Projects for organizing tasks and tracking larger initiatives',
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
      notNull: true
    },
    description: {
      type: 'text',
      notNull: false
    },
    priority: {
      type: 'smallint',
      notNull: true,
      defaultValue: '1'
    },
    archived: {
      type: 'boolean',
      notNull: false,
      defaultValue: 'false'
    },
    archived_at: {
      type: 'timestamptz',
      notNull: false
    },
    display_order: {
      type: 'integer',
      notNull: false,
      defaultValue: '0'
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
      type: 'manyToMany',
      table: 'tasks',
      foreignKey: 'project_id',
      through: 'task_projects'
    },
    {
      type: 'hasMany',
      table: 'goals',
      foreignKey: 'project_id'
    },
    {
      type: 'manyToMany',
      table: 'notes',
      foreignKey: 'project_id',
      through: 'project_note_links'
    },
    {
      type: 'manyToMany',
      table: 'process_flows',
      foreignKey: 'project_id',
      through: 'project_node_links'
    }
  ],
  indexes: [
    {
      name: 'projects_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'projects_display_order_idx',
      columns: ['display_order']
    }
  ],
  policies: [
    {
      name: 'Users can view their own projects',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can insert their own projects',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update their own projects',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete their own projects',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 