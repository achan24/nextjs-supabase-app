import { TableDefinition } from './types';

/**
 * @table process_flow_favorites
 * @description User's favorite process flows for quick access
 */
export const ProcessFlowFavorite: TableDefinition = {
  name: 'process_flow_favorites',
  description: 'User\'s favorite process flows for quick access',
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
    flow_id: {
      type: 'uuid',
      references: 'process_flows(id)',
      notNull: true
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
      table: 'auth.users',
      foreignKey: 'user_id'
    },
    {
      type: 'belongsTo',
      table: 'process_flows',
      foreignKey: 'flow_id'
    }
  ],
  indexes: [
    {
      name: 'process_flow_favorites_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'process_flow_favorites_flow_id_idx',
      columns: ['flow_id']
    },
    {
      name: 'process_flow_favorites_unique_favorite',
      columns: ['user_id', 'flow_id'],
      unique: true
    }
  ],
  policies: [
    {
      name: 'Users can manage their own process flow favorites',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can manage their own process flow favorites',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can manage their own process flow favorites',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can manage their own process flow favorites',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 