import { TableDefinition } from './types';

/**
 * @table life_goal_sequence_contributions
 * @description Records how timer sequences contribute to goal metrics
 */
export const LifeGoalSequenceContribution: TableDefinition = {
  name: 'life_goal_sequence_contributions',
  description: 'Records how timer sequences contribute to goal metrics',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    sequence_id: {
      type: 'uuid',
      references: 'timer_sequences(id)',
      notNull: true
    },
    metric_id: {
      type: 'uuid',
      references: 'life_goal_metrics(id)',
      notNull: true
    },
    contribution_value: {
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
      table: 'timer_sequences',
      foreignKey: 'sequence_id'
    },
    {
      type: 'belongsTo',
      table: 'life_goal_metrics',
      foreignKey: 'metric_id'
    }
  ],
  indexes: [
    {
      name: 'life_goal_sequence_contributions_sequence_id_idx',
      columns: ['sequence_id']
    },
    {
      name: 'life_goal_sequence_contributions_metric_id_idx',
      columns: ['metric_id']
    }
  ],
  policies: [
    {
      name: 'Users can view their own sequence contributions',
      operation: 'select',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id where life_goal_metrics.id = life_goal_sequence_contributions.metric_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can insert contributions for their metrics',
      operation: 'insert',
      check: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id where life_goal_metrics.id = metric_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can update their own sequence contributions',
      operation: 'update',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id where life_goal_metrics.id = life_goal_sequence_contributions.metric_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can delete their own sequence contributions',
      operation: 'delete',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id where life_goal_metrics.id = life_goal_sequence_contributions.metric_id and life_goal_areas.user_id = auth.uid())'
    }
  ]
}; 