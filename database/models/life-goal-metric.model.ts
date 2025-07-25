import { TableDefinition } from './types';

/**
 * @table life_goal_metrics
 * @description Metrics to track progress on life goals
 */
export const LifeGoalMetric: TableDefinition = {
  name: 'life_goal_metrics',
  description: 'Metrics to track progress on life goals',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    goal_id: {
      type: 'uuid',
      references: 'life_goals(id)',
      notNull: true
    },
    name: {
      type: 'text',
      notNull: true
    },
    type: {
      type: 'text',
      notNull: true,
      check: "type in ('time', 'count', 'streak', 'custom')"
    },
    current_value: {
      type: 'numeric',
      notNull: true,
      defaultValue: '0'
    },
    unit: {
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
      table: 'life_goals',
      foreignKey: 'goal_id'
    },
    {
      type: 'hasMany',
      table: 'life_goal_metric_thresholds',
      foreignKey: 'metric_id'
    },
    {
      type: 'hasMany',
      table: 'life_goal_sequence_contributions',
      foreignKey: 'metric_id'
    }
  ],
  indexes: [
    {
      name: 'life_goal_metrics_goal_id_idx',
      columns: ['goal_id']
    }
  ],
  policies: [
    {
      name: 'Users can view their own metrics',
      operation: 'select',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id where life_goals.id = life_goal_metrics.goal_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can insert metrics for their goals',
      operation: 'insert',
      check: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id where life_goals.id = goal_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can update their own metrics',
      operation: 'update',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id where life_goals.id = life_goal_metrics.goal_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can delete their own metrics',
      operation: 'delete',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id where life_goals.id = life_goal_metrics.goal_id and life_goal_areas.user_id = auth.uid())'
    }
  ]
}; 