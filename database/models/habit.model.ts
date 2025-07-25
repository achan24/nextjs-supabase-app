import { TableDefinition } from './types';

/**
 * @table habits
 * @description Habits that users want to track and build
 */
export const Habit: TableDefinition = {
  name: 'habits',
  description: 'Habits that users want to track and build',
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
    icon: {
      type: 'text',
      notNull: false
    },
    linked_flow_id: {
      type: 'uuid',
      references: 'process_flows(id)',
      notNull: false
    },
    linked_node_id: {
      type: 'text',
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
      foreignKey: 'linked_flow_id'
    },
    {
      type: 'hasMany',
      table: 'habit_completions',
      foreignKey: 'habit_id'
    }
  ],
  indexes: [
    {
      name: 'habits_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'habits_linked_flow_id_idx',
      columns: ['linked_flow_id']
    }
  ],
  policies: [
    {
      name: 'Users can view own habits',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can insert own habits',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update own habits',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete own habits',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 