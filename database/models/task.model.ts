import { TableDefinition } from './types';

/**
 * @table tasks
 * @description Core task table for tracking individual tasks and their status
 */
export const Task: TableDefinition = {
  name: 'tasks',
  description: 'Core task table for tracking individual tasks and their status',
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
    status: {
      type: 'text',
      notNull: true,
      defaultValue: "'pending'",
      check: "status in ('pending', 'in_progress', 'completed')"
    },
    priority: {
      type: 'integer',
      notNull: false,
      check: 'priority between 1 and 5'
    },
    due_date: {
      type: 'timestamptz',
      notNull: false
    },
    time_spent: {
      type: 'integer',
      notNull: false,
      defaultValue: '0'
    },
    last_started_at: {
      type: 'timestamptz',
      notNull: false
    },
    is_starred: {
      type: 'boolean',
      notNull: true,
      defaultValue: 'false'
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
      table: 'projects',
      foreignKey: 'task_id',
      through: 'task_projects'
    },
    {
      type: 'manyToMany',
      table: 'tags',
      foreignKey: 'task_id',
      through: 'task_tags'
    },
    {
      type: 'hasMany',
      table: 'reminders',
      foreignKey: 'task_id'
    },
    {
      type: 'hasMany',
      table: 'task_time_entries',
      foreignKey: 'task_id'
    }
  ],
  indexes: [
    {
      name: 'tasks_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'tasks_status_idx',
      columns: ['status']
    },
    {
      name: 'tasks_due_date_idx',
      columns: ['due_date']
    }
  ],
  policies: [
    {
      name: 'Users can view own tasks',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can insert own tasks',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update own tasks',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete own tasks',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 