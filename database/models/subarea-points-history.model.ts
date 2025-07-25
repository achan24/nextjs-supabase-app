import { TableDefinition } from './types';

/**
 * @table subarea_points_history
 * @description Historical record of daily points for life goal subareas
 */
export const SubareaPointsHistory: TableDefinition = {
  name: 'subarea_points_history',
  description: 'Historical record of daily points for life goal subareas',
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
    subarea_id: {
      type: 'uuid',
      references: 'life_goal_subareas(id)',
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
    },
    {
      type: 'belongsTo',
      table: 'life_goal_subareas',
      foreignKey: 'subarea_id'
    }
  ],
  indexes: [
    {
      name: 'subarea_points_history_subarea_id_idx',
      columns: ['subarea_id']
    },
    {
      name: 'subarea_points_history_date_idx',
      columns: ['date']
    },
    {
      name: 'subarea_points_history_unique_day',
      columns: ['subarea_id', 'date'],
      unique: true
    }
  ],
  policies: [
    {
      name: 'Users can view own subarea points history',
      operation: 'select',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id where life_goal_subareas.id = subarea_points_history.subarea_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can insert own subarea points history',
      operation: 'insert',
      check: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id where life_goal_subareas.id = subarea_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can update own subarea points history',
      operation: 'update',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id where life_goal_subareas.id = subarea_points_history.subarea_id and life_goal_areas.user_id = auth.uid())'
    }
  ]
}; 