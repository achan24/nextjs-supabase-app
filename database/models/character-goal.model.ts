import { TableDefinition } from './types';

/**
 * @table character_goals
 * @description Goals within character development subareas
 */
export const CharacterGoal: TableDefinition = {
  name: 'character_goals',
  description: 'Goals within character development subareas',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    subarea_id: {
      type: 'uuid',
      references: 'character_subareas(id)',
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
      table: 'character_subareas',
      foreignKey: 'subarea_id'
    }
  ],
  indexes: [
    {
      name: 'character_goals_subarea_id_idx',
      columns: ['subarea_id']
    }
  ],
  policies: [
    {
      name: 'Users can view own character goals',
      operation: 'select',
      using: 'exists (select 1 from character_areas a join character_subareas s on s.area_id = a.id where s.id = character_goals.subarea_id and a.user_id = auth.uid())'
    },
    {
      name: 'Users can insert own character goals',
      operation: 'insert',
      check: 'exists (select 1 from character_areas a join character_subareas s on s.area_id = a.id where s.id = subarea_id and a.user_id = auth.uid())'
    },
    {
      name: 'Users can update own character goals',
      operation: 'update',
      using: 'exists (select 1 from character_areas a join character_subareas s on s.area_id = a.id where s.id = character_goals.subarea_id and a.user_id = auth.uid())'
    },
    {
      name: 'Users can delete own character goals',
      operation: 'delete',
      using: 'exists (select 1 from character_areas a join character_subareas s on s.area_id = a.id where s.id = character_goals.subarea_id and a.user_id = auth.uid())'
    }
  ]
}; 