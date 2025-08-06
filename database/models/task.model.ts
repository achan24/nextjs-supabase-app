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
    is_starred_for_today: {
      type: 'boolean',
      notNull: true,
      defaultValue: 'false'
    },
    starred_at: {
      type: 'timestamptz',
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
    },
    area_id: {
      type: 'uuid',
      references: 'life_goal_areas(id)',
      notNull: false
    },
    subarea_id: {
      type: 'uuid',
      references: 'life_goal_subareas(id)',
      notNull: false
    },
    goal_id: {
      type: 'uuid',
      references: 'life_goals(id)',
      notNull: false
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
    },
    {
      type: 'belongsTo',
      table: 'life_goal_areas',
      foreignKey: 'area_id'
    },
    {
      type: 'belongsTo',
      table: 'life_goal_subareas',
      foreignKey: 'subarea_id'
    },
    {
      type: 'belongsTo',
      table: 'life_goals',
      foreignKey: 'goal_id'
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
    },
    {
      name: 'tasks_area_id_idx',
      columns: ['area_id']
    },
    {
      name: 'tasks_subarea_id_idx',
      columns: ['subarea_id']
    },
    {
      name: 'tasks_goal_id_idx',
      columns: ['goal_id']
    },
    {
      name: 'tasks_user_area_idx',
      columns: ['user_id', 'area_id']
    },
    {
      name: 'tasks_user_subarea_idx',
      columns: ['user_id', 'subarea_id']
    },
    {
      name: 'tasks_user_goal_idx',
      columns: ['user_id', 'goal_id']
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