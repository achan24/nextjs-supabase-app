import { TableDefinition } from './types';

/**
 * @table life_goal_areas
 * @description High-level life areas that contain subareas and goals
 */
export const LifeGoalArea: TableDefinition = {
  name: 'life_goal_areas',
  description: 'High-level life areas that contain subareas and goals',
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
    name: {
      type: 'text',
      notNull: true
    },
    description: {
      type: 'text',
      notNull: false
    },
    current_points: {
      type: 'numeric',
      notNull: true,
      defaultValue: '0'
    },
    target_points: {
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
      type: 'hasMany',
      table: 'life_goal_subareas',
      foreignKey: 'area_id'
    }
  ],
  indexes: [
    {
      name: 'life_goal_areas_user_id_idx',
      columns: ['user_id']
    }
  ],
  policies: [
    {
      name: 'Users can view own areas',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can insert own areas',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update own areas',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete own areas',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 