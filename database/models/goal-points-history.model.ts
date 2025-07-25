import { TableDefinition } from './types';

/**
 * @table goal_points_history
 * @description Historical record of daily points for life goals
 */
export const GoalPointsHistory: TableDefinition = {
  name: 'goal_points_history',
  description: 'Historical record of daily points for life goals',
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
    goal_id: {
      type: 'uuid',
      references: 'life_goals(id)',
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
    },
    {
      type: 'belongsTo',
      table: 'life_goals',
      foreignKey: 'goal_id'
    }
  ],
  indexes: [
    {
      name: 'goal_points_history_goal_id_idx',
      columns: ['goal_id']
    },
    {
      name: 'goal_points_history_date_idx',
      columns: ['date']
    },
    {
      name: 'goal_points_history_unique_day',
      columns: ['goal_id', 'date'],
      unique: true
    }
  ],
  policies: [
    {
      name: 'Users can view own goal points history',
      operation: 'select',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id where life_goals.id = goal_points_history.goal_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can insert own goal points history',
      operation: 'insert',
      check: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id where life_goals.id = goal_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can update own goal points history',
      operation: 'update',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id where life_goals.id = goal_points_history.goal_id and life_goal_areas.user_id = auth.uid())'
    }
  ]
}; 