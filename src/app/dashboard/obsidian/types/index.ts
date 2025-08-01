export interface Note {
  id: string;
  title: string;
  content: string;
  user_id: string;
  folder_id?: string;
  tags: string[];
  is_favorite: boolean;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  parent_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  children?: NoteFolder[];
  note_count?: number;
}

export interface NoteLink {
  id: string;
  source_note_id: string;
  target_note_id: string;
  link_text?: string;
  created_at: string;
  target_note?: Note;
  source_note?: Note;
}

export interface NoteMedia {
  id: string;
  note_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface NoteVersion {
  id: string;
  note_id: string;
  content: string;
  version_number: number;
  created_at: string;
}

export interface EditorState {
  mode: 'edit' | 'preview';
  isFullScreen: boolean;
  autoSave: boolean;
  wordCount: number;
  lastSaved: string | null;
}

export interface SearchFilters {
  query: string;
  tags: string[];
  folder_id?: string;
  is_favorite?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface Backlink {
  source_note: Note;
  link_text?: string;
  context: string; // Surrounding text for context
}

export interface UnlinkedReference {
  note_title: string;
  mentions: Array<{
    note_id: string;
    note_title: string;
    context: string;
  }>;
}

export interface GraphNode {
  id: string;
  title: string;
  type: 'note' | 'folder';
  level: number;
  connections: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  link_text?: string;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  tags: string[];
  user_id: string;
  created_at: string;
}

export interface QuickSwitcherResult {
  type: 'note' | 'folder' | 'template';
  id: string;
  title: string;
  path?: string;
  tags?: string[];
  is_favorite?: boolean;
  last_accessed?: string;
} 