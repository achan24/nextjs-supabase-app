import { TableDefinition } from './types';

/**
 * @table budget_plan_items
 * @description Individual planned expenses within a weekly budget plan
 */
export const BudgetPlanItem: TableDefinition = {
  name: 'budget_plan_items',
  description: 'Individual planned expenses within a weekly budget plan',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    plan_id: {
      type: 'uuid',
      references: 'budget_plans(id) on delete cascade',
      notNull: true
    },
    category: {
      type: 'text',
      notNull: true
    },
    planned_amount: {
      type: 'numeric',
      notNull: true,
      check: 'planned_amount > 0'
    },
    day_of_week: {
      type: 'integer',
      notNull: true,
      check: 'day_of_week >= 0 and day_of_week <= 6',
      description: '0=Monday, 1=Tuesday, ..., 6=Sunday'
    },
    note: {
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
      table: 'budget_plans',
      foreignKey: 'plan_id'
    }
  ],
  indexes: [
    {
      name: 'budget_plan_items_plan_id_idx',
      columns: ['plan_id']
    },
    {
      name: 'budget_plan_items_category_idx',
      columns: ['category']
    },
    {
      name: 'budget_plan_items_day_of_week_idx',
      columns: ['day_of_week']
    },
    {
      name: 'budget_plan_items_plan_day_idx',
      columns: ['plan_id', 'day_of_week']
    }
  ],
  policies: [
    {
      name: 'Users can view own budget plan items',
      operation: 'select',
      using: 'plan_id in (select id from budget_plans where user_id = auth.uid())'
    },
    {
      name: 'Users can insert own budget plan items',
      operation: 'insert',
      check: 'plan_id in (select id from budget_plans where user_id = auth.uid())'
    },
    {
      name: 'Users can update own budget plan items',
      operation: 'update',
      using: 'plan_id in (select id from budget_plans where user_id = auth.uid())'
    },
    {
      name: 'Users can delete own budget plan items',
      operation: 'delete',
      using: 'plan_id in (select id from budget_plans where user_id = auth.uid())'
    }
  ]
};
