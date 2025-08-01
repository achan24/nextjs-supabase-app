import { TableDefinition } from './types';

/**
 * @table note_folders
 * @description Hierarchical folder structure for organizing notes
 */
export const NoteFolder: TableDefinition = {
  name: 'note_folders',
  description: 'Hierarchical folder structure for organizing notes',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    name: {
      type: 'text',
      notNull: true
    },
    parent_id: {
      type: 'uuid',
      references: 'note_folders(id)',
      notNull: false
    },
    user_id: {
      type: 'uuid',
      references: 'auth.users(id)',
      notNull: true
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
      type: 'belongsTo',
      table: 'note_folders',
      foreignKey: 'parent_id'
    },
    {
      type: 'hasMany',
      table: 'note_folders',
      foreignKey: 'parent_id'
    },
    {
      type: 'hasMany',
      table: 'notes',
      foreignKey: 'folder_id'
    }
  ],
  indexes: [
    {
      name: 'note_folders_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'note_folders_parent_id_idx',
      columns: ['parent_id']
    }
  ],
  policies: [
    {
      name: 'Users can create their own note folders',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can view their own note folders',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update their own note folders',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete their own note folders',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 