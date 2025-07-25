import { TableDefinition } from './types';

/**
 * @table trait_history
 * @description Historical record of trait value changes
 */
export const TraitHistory: TableDefinition = {
  name: 'trait_history',
  description: 'Historical record of trait value changes',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    trait_id: {
      type: 'uuid',
      references: 'character_traits(id)',
      notNull: true
    },
    old_value: {
      type: 'integer',
      notNull: true,
      check: 'old_value between 0 and 100'
    },
    new_value: {
      type: 'integer',
      notNull: true,
      check: 'new_value between 0 and 100'
    },
    change_reason: {
      type: 'text',
      notNull: false
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      defaultValue: 'now()'
    }
  },
  relationships: [
    {
      type: 'belongsTo',
      table: 'character_traits',
      foreignKey: 'trait_id'
    }
  ],
  indexes: [
    {
      name: 'trait_history_trait_id_idx',
      columns: ['trait_id']
    }
  ],
  policies: [
    {
      name: 'Users can view own trait history',
      operation: 'select',
      using: 'exists (select 1 from characters join character_traits on characters.id = character_traits.character_id where character_traits.id = trait_history.trait_id and characters.user_id = auth.uid())'
    },
    {
      name: 'Users can insert own trait history',
      operation: 'insert',
      check: 'exists (select 1 from characters join character_traits on characters.id = character_traits.character_id where character_traits.id = trait_id and characters.user_id = auth.uid())'
    }
  ]
}; 