import { TableDefinition } from './types';

/**
 * @table budget_targets
 * @description Monthly budget targets for different spending categories
 */
export const BudgetTarget: TableDefinition = {
  name: 'budget_targets',
  description: 'Monthly budget targets for different spending categories',
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
    category: {
      type: 'text',
      notNull: true
    },
    monthly_limit: {
      type: 'numeric',
      notNull: true,
      check: 'monthly_limit > 0'
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
    }
  ],
  indexes: [
    {
      name: 'budget_targets_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'budget_targets_category_idx',
      columns: ['category']
    },
    {
      name: 'budget_targets_user_category_idx',
      columns: ['user_id', 'category'],
      unique: true
    }
  ],
  policies: [
    {
      name: 'Users can view own budget targets',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can insert own budget targets',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update own budget targets',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete own budget targets',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
};

