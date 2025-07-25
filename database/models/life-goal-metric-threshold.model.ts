import { TableDefinition } from './types';

/**
 * @table life_goal_metric_thresholds
 * @description Target values for metrics that trigger milestone completion
 */
export const LifeGoalMetricThreshold: TableDefinition = {
  name: 'life_goal_metric_thresholds',
  description: 'Target values for metrics that trigger milestone completion',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    metric_id: {
      type: 'uuid',
      references: 'life_goal_metrics(id)',
      notNull: true
    },
    milestone_id: {
      type: 'uuid',
      references: 'life_goal_milestones(id)',
      notNull: true
    },
    target_value: {
      type: 'numeric',
      notNull: true
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
      table: 'life_goal_metrics',
      foreignKey: 'metric_id'
    },
    {
      type: 'belongsTo',
      table: 'life_goal_milestones',
      foreignKey: 'milestone_id'
    }
  ],
  indexes: [
    {
      name: 'life_goal_metric_thresholds_metric_id_idx',
      columns: ['metric_id']
    },
    {
      name: 'life_goal_metric_thresholds_milestone_id_idx',
      columns: ['milestone_id']
    }
  ],
  policies: [
    {
      name: 'Users can view their own metric thresholds',
      operation: 'select',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id where life_goal_metrics.id = life_goal_metric_thresholds.metric_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can insert thresholds for their metrics',
      operation: 'insert',
      check: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id where life_goal_metrics.id = metric_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can update their own metric thresholds',
      operation: 'update',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id where life_goal_metrics.id = life_goal_metric_thresholds.metric_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can delete their own metric thresholds',
      operation: 'delete',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id where life_goal_metrics.id = life_goal_metric_thresholds.metric_id and life_goal_areas.user_id = auth.uid())'
    }
  ]
}; 