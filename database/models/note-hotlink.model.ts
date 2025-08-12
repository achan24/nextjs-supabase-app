import { TableDefinition } from './types';

/**
 * @table note_hotlinks
 * @description User-managed hotlinks for Obsidian notes (distinct from favorites)
 */
export const NoteHotlink: TableDefinition = {
  name: 'note_hotlinks',
  description: 'User-managed hotlinks for Obsidian notes',
  columns: {
    id: { type: 'uuid', primaryKey: true, defaultValue: 'gen_random_uuid()' },
    user_id: { type: 'uuid', references: 'auth.users(id)', notNull: true },
    note_id: { type: 'uuid', references: 'notes(id)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, defaultValue: 'now()' },
  },
  relationships: [
    { type: 'belongsTo', table: 'auth.users', foreignKey: 'user_id' },
    { type: 'belongsTo', table: 'notes', foreignKey: 'note_id' },
  ],
  indexes: [
    { name: 'note_hotlinks_user_id_idx', columns: ['user_id'] },
    { name: 'note_hotlinks_note_id_idx', columns: ['note_id'] },
    { name: 'note_hotlinks_unique', columns: ['user_id', 'note_id'], unique: true },
  ],
  policies: [
    { name: 'Users can manage their own note hotlinks', operation: 'select', using: 'auth.uid() = user_id' },
    { name: 'Users can manage their own note hotlinks', operation: 'insert', check: 'auth.uid() = user_id' },
    { name: 'Users can manage their own note hotlinks', operation: 'update', using: 'auth.uid() = user_id' },
    { name: 'Users can manage their own note hotlinks', operation: 'delete', using: 'auth.uid() = user_id' },
  ],
};


