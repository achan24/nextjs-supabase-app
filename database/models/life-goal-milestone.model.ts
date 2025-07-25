import { TableDefinition } from './types';

/**
 * @table life_goal_milestones
 * @description Milestones that mark significant progress points in life goals
 */
export const LifeGoalMilestone: TableDefinition = {
  name: 'life_goal_milestones',
  description: 'Milestones that mark significant progress points in life goals',
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
    title: {
      type: 'text',
      notNull: true
    },
    description: {
      type: 'text',
      notNull: false
    },
    completed: {
      type: 'boolean',
      notNull: true,
      defaultValue: 'false'
    },
    completed_at: {
      type: 'timestamptz',
      notNull: false
    },
    due_date: {
      type: 'timestamptz',
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
      foreignKey: 'milestone_id'
    }
  ],
  indexes: [
    {
      name: 'life_goal_milestones_goal_id_idx',
      columns: ['goal_id']
    }
  ],
  policies: [
    {
      name: 'Users can view their own milestones',
      operation: 'select',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id where life_goals.id = life_goal_milestones.goal_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can insert their own milestones',
      operation: 'insert',
      check: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id where life_goals.id = goal_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can update their own milestones',
      operation: 'update',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id where life_goals.id = life_goal_milestones.goal_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can delete their own milestones',
      operation: 'delete',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id join life_goals on life_goal_subareas.id = life_goals.subarea_id where life_goals.id = life_goal_milestones.goal_id and life_goal_areas.user_id = auth.uid())'
    }
  ]
}; 