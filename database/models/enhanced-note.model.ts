import { TableDefinition } from './types';

/**
 * @table notes
 * @description Enhanced notes table for Obsidian-like functionality
 */
export const EnhancedNote: TableDefinition = {
  name: 'notes',
  description: 'Enhanced notes table for Obsidian-like functionality',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    title: {
      type: 'text',
      notNull: true
    },
    content: {
      type: 'text',
      notNull: true
    },
    user_id: {
      type: 'uuid',
      references: 'auth.users(id)',
      notNull: true
    },
    folder_id: {
      type: 'uuid',
      references: 'note_folders(id)',
      notNull: false
    },
    tags: {
      type: 'text[]',
      notNull: false,
      defaultValue: "'{}'::text[]"
    },
    is_favorite: {
      type: 'boolean',
      notNull: false,
      defaultValue: 'false'
    },
    is_template: {
      type: 'boolean',
      notNull: false,
      defaultValue: 'false'
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
    },
    last_accessed_at: {
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
      type: 'belongsTo',
      table: 'note_folders',
      foreignKey: 'folder_id'
    },
    {
      type: 'hasMany',
      table: 'note_links',
      foreignKey: 'source_note_id'
    },
    {
      type: 'hasMany',
      table: 'note_links',
      foreignKey: 'target_note_id'
    },
    {
      type: 'hasMany',
      table: 'note_media',
      foreignKey: 'note_id'
    },
    {
      type: 'hasMany',
      table: 'note_versions',
      foreignKey: 'note_id'
    }
  ],
  indexes: [
    {
      name: 'notes_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'notes_folder_id_idx',
      columns: ['folder_id']
    },
    {
      name: 'notes_tags_idx',
      columns: ['tags'],
      unique: false
    },
    {
      name: 'notes_is_favorite_idx',
      columns: ['is_favorite']
    },
    {
      name: 'notes_last_accessed_at_idx',
      columns: ['last_accessed_at']
    }
  ],
  policies: [
    {
      name: 'Users can create their own notes',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can view their own notes',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update their own notes',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete their own notes',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 