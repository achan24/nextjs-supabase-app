import { TableDefinition } from './types';

/**
 * @table character_subareas
 * @description Subareas within character development areas
 */
export const CharacterSubarea: TableDefinition = {
  name: 'character_subareas',
  description: 'Subareas within character development areas',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    area_id: {
      type: 'uuid',
      references: 'character_areas(id)',
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
      table: 'character_areas',
      foreignKey: 'area_id'
    },
    {
      type: 'hasMany',
      table: 'character_goals',
      foreignKey: 'subarea_id'
    }
  ],
  indexes: [
    {
      name: 'character_subareas_area_id_idx',
      columns: ['area_id']
    }
  ],
  policies: [
    {
      name: 'Users can view own character subareas',
      operation: 'select',
      using: 'exists (select 1 from character_areas where id = character_subareas.area_id and user_id = auth.uid())'
    },
    {
      name: 'Users can insert own character subareas',
      operation: 'insert',
      check: 'exists (select 1 from character_areas where id = area_id and user_id = auth.uid())'
    },
    {
      name: 'Users can update own character subareas',
      operation: 'update',
      using: 'exists (select 1 from character_areas where id = character_subareas.area_id and user_id = auth.uid())'
    },
    {
      name: 'Users can delete own character subareas',
      operation: 'delete',
      using: 'exists (select 1 from character_areas where id = character_subareas.area_id and user_id = auth.uid())'
    }
  ]
}; 