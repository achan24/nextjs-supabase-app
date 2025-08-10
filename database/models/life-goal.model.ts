import { TableDefinition } from './types';

/**
 * @table life_goals
 * @description Goals within subareas that represent specific objectives
 */
export const LifeGoal: TableDefinition = {
  name: 'life_goals',
  description: 'Goals within subareas that represent specific objectives',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    subarea_id: {
      type: 'uuid',
      references: 'life_goal_subareas(id)',
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
    status: {
      type: 'text',
      notNull: true,
      defaultValue: "'active'"
    },
    daily_points: {
      type: 'numeric',
      notNull: true,
      defaultValue: '0'
    },
    target_points: {
      type: 'numeric',
      notNull: true,
      defaultValue: '0'
    },
    daily_target: {
      type: 'numeric',
      notNull: true,
      defaultValue: '0'
    },
    priority: {
      type: 'integer',
      notNull: true,
      defaultValue: '5',
      check: 'priority between 1 and 5'
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
      table: 'life_goal_subareas',
      foreignKey: 'subarea_id'
    },
    {
      type: 'hasMany',
      table: 'life_goal_milestones',
      foreignKey: 'goal_id'
    },
    {
      type: 'hasMany',
      table: 'life_goal_metrics',
      foreignKey: 'goal_id'
    }
  ],
  indexes: [
    {
      name: 'life_goals_subarea_id_idx',
      columns: ['subarea_id']
    }
  ],
  policies: [
    {
      name: 'Users can view their own life goals',
      operation: 'select',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id where life_goal_subareas.id = life_goals.subarea_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can insert goals in their subareas',
      operation: 'insert',
      check: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id where life_goal_subareas.id = subarea_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can update their own life goals',
      operation: 'update',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id where life_goal_subareas.id = life_goals.subarea_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can delete their own life goals',
      operation: 'delete',
      using: 'exists (select 1 from life_goal_areas join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id where life_goal_subareas.id = life_goals.subarea_id and life_goal_areas.user_id = auth.uid())'
    }
  ]
}; 