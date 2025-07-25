import { TableDefinition } from './types';

/**
 * @table character_traits
 * @description Character traits/stats with values and calculation data
 */
export const CharacterTrait: TableDefinition = {
  name: 'character_traits',
  description: 'Character traits/stats with values and calculation data',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    character_id: {
      type: 'uuid',
      references: 'characters(id)',
      notNull: true
    },
    name: {
      type: 'text',
      notNull: true
    },
    value: {
      type: 'integer',
      notNull: true,
      check: 'value between 0 and 100'
    },
    last_updated: {
      type: 'timestamptz',
      notNull: true,
      defaultValue: 'now()'
    },
    calculation_data: {
      type: 'jsonb',
      notNull: true,
      defaultValue: "'{}'::jsonb"
    }
  },
  relationships: [
    {
      type: 'belongsTo',
      table: 'characters',
      foreignKey: 'character_id'
    },
    {
      type: 'hasMany',
      table: 'trait_history',
      foreignKey: 'trait_id'
    }
  ],
  indexes: [
    {
      name: 'character_traits_character_id_idx',
      columns: ['character_id']
    }
  ],
  policies: [
    {
      name: 'Users can view own character traits',
      operation: 'select',
      using: 'exists (select 1 from characters where id = character_traits.character_id and user_id = auth.uid())'
    },
    {
      name: 'Users can insert own character traits',
      operation: 'insert',
      check: 'exists (select 1 from characters where id = character_id and user_id = auth.uid())'
    },
    {
      name: 'Users can update own character traits',
      operation: 'update',
      using: 'exists (select 1 from characters where id = character_traits.character_id and user_id = auth.uid())'
    },
    {
      name: 'Users can delete own character traits',
      operation: 'delete',
      using: 'exists (select 1 from characters where id = character_traits.character_id and user_id = auth.uid())'
    }
  ]
}; 