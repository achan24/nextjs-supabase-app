import { TableDefinition } from './types';

/**
 * @table character_areas
 * @description High-level character development areas
 */
export const CharacterArea: TableDefinition = {
  name: 'character_areas',
  description: 'High-level character development areas',
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
      type: 'belongsTo',
      table: 'auth.users',
      foreignKey: 'user_id'
    },
    {
      type: 'hasMany',
      table: 'character_subareas',
      foreignKey: 'area_id'
    }
  ],
  indexes: [
    {
      name: 'character_areas_user_id_idx',
      columns: ['user_id']
    }
  ],
  policies: [
    {
      name: 'Users can view own character areas',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can insert own character areas',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update own character areas',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete own character areas',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 