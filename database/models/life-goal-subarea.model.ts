import { TableDefinition } from './types';

/**
 * @table life_goal_subareas
 * @description Subareas within life areas that contain specific goals
 */
export const LifeGoalSubarea: TableDefinition = {
  name: 'life_goal_subareas',
  description: 'Subareas within life areas that contain specific goals',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    area_id: {
      type: 'uuid',
      references: 'life_goal_areas(id)',
      notNull: true
    },
    name: {
      type: 'text',
      notNull: true
    },
    description: {
      type: 'text',
      notNull: false
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
      table: 'life_goal_areas',
      foreignKey: 'area_id'
    },
    {
      type: 'hasMany',
      table: 'life_goals',
      foreignKey: 'subarea_id'
    }
  ],
  indexes: [
    {
      name: 'life_goal_subareas_area_id_idx',
      columns: ['area_id']
    }
  ],
  policies: [
    {
      name: 'Users can view their own subareas',
      operation: 'select',
      using: 'exists (select 1 from life_goal_areas where life_goal_areas.id = life_goal_subareas.area_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can insert subareas in their areas',
      operation: 'insert',
      check: 'exists (select 1 from life_goal_areas where life_goal_areas.id = area_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can update their own subareas',
      operation: 'update',
      using: 'exists (select 1 from life_goal_areas where life_goal_areas.id = life_goal_subareas.area_id and life_goal_areas.user_id = auth.uid())'
    },
    {
      name: 'Users can delete their own subareas',
      operation: 'delete',
      using: 'exists (select 1 from life_goal_areas where life_goal_areas.id = life_goal_subareas.area_id and life_goal_areas.user_id = auth.uid())'
    }
  ]
}; 