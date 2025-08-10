import { TableDefinition } from './types';

/**
 * @table budget_transactions
 * @description Financial transactions for budget tracking (income and expenses)
 */
export const BudgetTransaction: TableDefinition = {
  name: 'budget_transactions',
  description: 'Financial transactions for budget tracking (income and expenses)',
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
    date: {
      type: 'timestamptz',
      notNull: true
    },
    amount: {
      type: 'numeric',
      notNull: true,
      check: 'amount != 0'
    },
    category: {
      type: 'text',
      notNull: true
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
      table: 'auth.users',
      foreignKey: 'user_id'
    }
  ],
  indexes: [
    {
      name: 'budget_transactions_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'budget_transactions_date_idx',
      columns: ['date']
    },
    {
      name: 'budget_transactions_category_idx',
      columns: ['category']
    },
    {
      name: 'budget_transactions_user_date_idx',
      columns: ['user_id', 'date']
    }
  ],
  policies: [
    {
      name: 'Users can view own budget transactions',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can insert own budget transactions',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update own budget transactions',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete own budget transactions',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
};

