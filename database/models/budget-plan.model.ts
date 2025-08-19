import { TableDefinition } from './types';

/**
 * @table budget_plans
 * @description Weekly budget plans for pre-planning spending
 */
export const BudgetPlan: TableDefinition = {
  name: 'budget_plans',
  description: 'Weekly budget plans for pre-planning spending',
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
    week_start: {
      type: 'date',
      notNull: true
    },
    total_budget: {
      type: 'numeric',
      notNull: true,
      check: 'total_budget > 0'
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
      table: 'budget_plan_items',
      foreignKey: 'plan_id'
    }
  ],
  indexes: [
    {
      name: 'budget_plans_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'budget_plans_week_start_idx',
      columns: ['week_start']
    },
    {
      name: 'budget_plans_user_week_idx',
      columns: ['user_id', 'week_start'],
      unique: true
    }
  ],
  policies: [
    {
      name: 'Users can view own budget plans',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can insert own budget plans',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update own budget plans',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete own budget plans',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
};
