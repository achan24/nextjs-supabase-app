import { TableDefinition } from './types';

/**
 * @table note_links
 * @description Bidirectional links between notes for Obsidian-like functionality
 */
export const NoteLink: TableDefinition = {
  name: 'note_links',
  description: 'Bidirectional links between notes for Obsidian-like functionality',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    source_note_id: {
      type: 'uuid',
      references: 'notes(id)',
      notNull: true
    },
    target_note_id: {
      type: 'uuid',
      references: 'notes(id)',
      notNull: true
    },
    link_text: {
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
      table: 'notes',
      foreignKey: 'source_note_id'
    },
    {
      type: 'belongsTo',
      table: 'notes',
      foreignKey: 'target_note_id'
    }
  ],
  indexes: [
    {
      name: 'note_links_source_note_id_idx',
      columns: ['source_note_id']
    },
    {
      name: 'note_links_target_note_id_idx',
      columns: ['target_note_id']
    },
    {
      name: 'note_links_unique_link_idx',
      columns: ['source_note_id', 'target_note_id'],
      unique: true
    }
  ],
  policies: [
    {
      name: 'Users can create links between their own notes',
      operation: 'insert',
      check: 'EXISTS (SELECT 1 FROM notes WHERE id = source_note_id AND user_id = auth.uid()) AND EXISTS (SELECT 1 FROM notes WHERE id = target_note_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can view links between their own notes',
      operation: 'select',
      using: 'EXISTS (SELECT 1 FROM notes WHERE id = source_note_id AND user_id = auth.uid()) AND EXISTS (SELECT 1 FROM notes WHERE id = target_note_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can update links between their own notes',
      operation: 'update',
      using: 'EXISTS (SELECT 1 FROM notes WHERE id = source_note_id AND user_id = auth.uid()) AND EXISTS (SELECT 1 FROM notes WHERE id = target_note_id AND user_id = auth.uid())'
    },
    {
      name: 'Users can delete links between their own notes',
      operation: 'delete',
      using: 'EXISTS (SELECT 1 FROM notes WHERE id = source_note_id AND user_id = auth.uid()) AND EXISTS (SELECT 1 FROM notes WHERE id = target_note_id AND user_id = auth.uid())'
    }
  ]
}; 