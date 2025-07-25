import { TableDefinition } from './types';

/**
 * @table area_points_history
 * @description Historical record of daily points for life goal areas
 */
export const AreaPointsHistory: TableDefinition = {
  name: 'area_points_history',
  description: 'Historical record of daily points for life goal areas',
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
    area_id: {
      type: 'uuid',
      references: 'life_goal_areas(id)',
      notNull: true
    },
    points: {
      type: 'numeric',
      notNull: true
    },
    target: {
      type: 'numeric',
      notNull: true,
      defaultValue: '0'
    },
    date: {
      type: 'date',
      notNull: true,
      defaultValue: 'current_date'
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
      table: 'life_goal_areas',
      foreignKey: 'area_id'
    }
  ],
  indexes: [
    {
      name: 'area_points_history_area_id_idx',
      columns: ['area_id']
    },
    {
      name: 'area_points_history_date_idx',
      columns: ['date']
    },
    {
      name: 'area_points_history_unique_day',
      columns: ['area_id', 'date'],
      unique: true
    }
  ],
  policies: [
    {
      name: 'Users can view own area points history',
      operation: 'select',
      using: 'exists (select 1 from life_goal_areas where id = area_points_history.area_id and user_id = auth.uid())'
    },
    {
      name: 'Users can insert own area points history',
      operation: 'insert',
      check: 'exists (select 1 from life_goal_areas where id = area_id and user_id = auth.uid())'
    },
    {
      name: 'Users can update own area points history',
      operation: 'update',
      using: 'exists (select 1 from life_goal_areas where id = area_points_history.area_id and user_id = auth.uid())'
    }
  ]
}; 