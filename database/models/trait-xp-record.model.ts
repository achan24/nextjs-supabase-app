import { TableDefinition } from './types';

/**
 * @table trait_xp_records
 * @description Store the calculated XP for each trait per session
 */
export const TraitXpRecord: TableDefinition = {
  name: 'trait_xp_records',
  description: 'Store the calculated XP for each trait per session',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    session_id: {
      type: 'uuid',
      references: 'trait_sessions(id)',
      notNull: true
    },

    trait_name: {
      type: 'text',
      notNull: true
    },
    base_xp: {
      type: 'integer',
      notNull: true,
      check: 'base_xp >= 0'
    },
    multipliers: {
      type: 'jsonb',
      notNull: true,
      defaultValue: "'{}'::jsonb"
    },
    final_xp: {
      type: 'integer',
      notNull: true,
      check: 'final_xp >= 0'
    },
    quest_text: {
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
      table: 'trait_sessions',
      foreignKey: 'session_id'
    }
  ],
  indexes: [
    {
      name: 'trait_xp_records_session_id_idx',
      columns: ['session_id']
    },
    {
      name: 'trait_xp_records_trait_name_idx',
      columns: ['trait_name']
    },
    {
      name: 'trait_xp_records_created_at_idx',
      columns: ['created_at']
    }
  ],
  policies: [
    {
      name: 'Users can view own trait XP records',
      operation: 'select',
      using: 'exists (select 1 from characters join trait_sessions on characters.id = trait_sessions.character_id where trait_sessions.id = trait_xp_records.session_id and characters.user_id = auth.uid())'
    },
    {
      name: 'Users can insert own trait XP records',
      operation: 'insert',
      check: 'exists (select 1 from characters join trait_sessions on characters.id = trait_sessions.character_id where trait_sessions.id = session_id and characters.user_id = auth.uid())'
    },
    {
      name: 'Users can update own trait XP records',
      operation: 'update',
      using: 'exists (select 1 from characters join trait_sessions on characters.id = trait_sessions.character_id where trait_sessions.id = trait_xp_records.session_id and characters.user_id = auth.uid())'
    },
    {
      name: 'Users can delete own trait XP records',
      operation: 'delete',
      using: 'exists (select 1 from characters join trait_sessions on characters.id = trait_sessions.character_id where trait_sessions.id = trait_xp_records.session_id and characters.user_id = auth.uid())'
    }
  ]
};
