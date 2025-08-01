# Obsidian Clone - Notes App Specification

## Overview
A comprehensive notes application inspired by Obsidian, featuring a full markdown editor with bidirectional linking, media embedding, and advanced organization capabilities. This will replace the current basic notes functionality with a powerful knowledge management system.

## Core Features

### 1. Markdown Editor
- **Rich Markdown Support**: Full markdown syntax with live preview
- **Syntax Highlighting**: Code blocks with language-specific highlighting
- **Auto-completion**: Smart suggestions for markdown syntax, links, and tags
- **Split View**: Edit and preview side-by-side or toggle between modes
- **Full-screen Mode**: Distraction-free writing experience
- **Auto-save**: Real-time saving with version history

### 2. Bidirectional Linking
- **Internal Links**: `[[Note Title]]` syntax for linking between notes
- **Backlinks Panel**: Show all notes that link to the current note
- **Graph View**: Visual representation of note connections
- **Unlinked References**: Find mentions of note titles that aren't linked
- **Link Suggestions**: Auto-suggest existing notes when typing `[[`

### 3. Media Embedding
- **Image Support**: Drag & drop, paste, or upload images
- **PDF Embedding**: View PDFs inline within notes
- **Video Support**: Embed video files (MP4, WebM)
- **Audio Files**: Embed and play audio files
- **File Attachments**: Attach any file type with preview
- **Storage Management**: Organize media files in folders

### 4. Organization & Navigation
- **Folder Structure**: Hierarchical organization with nested folders
- **Tags System**: Multi-tag support with tag autocomplete
- **Search**: Full-text search across all notes with filters
- **Quick Switcher**: Fast navigation between notes (Cmd/Ctrl + P)
- **Recent Notes**: Quick access to recently edited notes
- **Favorites**: Pin important notes for quick access

### 5. Advanced Features
- **Templates**: Pre-built note templates for different use cases
- **Snippets**: Reusable text blocks and code snippets
- **Export Options**: Export to PDF, HTML, or plain text
- **Import**: Import from markdown files, Evernote, or other formats
- **Collaboration**: Share notes with others (future feature)
- **Mobile Sync**: Access notes on mobile devices

## Technical Architecture

### Database Schema

#### Enhanced Notes Table
```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    folder_id UUID REFERENCES note_folders(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Note Folders Table
```sql
CREATE TABLE note_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES note_folders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Note Links Table (for bidirectional linking)
```sql
CREATE TABLE note_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
    target_note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
    link_text TEXT, -- The text used in the link
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(source_note_id, target_note_id)
);
```

#### Media Files Table
```sql
CREATE TABLE note_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Note Versions Table (for history)
```sql
CREATE TABLE note_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Frontend Components

#### Main Editor Component
- **MarkdownEditor**: Rich text editor with markdown support
- **PreviewPanel**: Live markdown preview
- **Toolbar**: Formatting buttons and tools
- **StatusBar**: Word count, save status, cursor position

#### Navigation Components
- **Sidebar**: Folder tree and note list
- **QuickSwitcher**: Modal for fast note navigation
- **Breadcrumbs**: Current location in folder structure
- **SearchBar**: Global search with filters

#### Organization Components
- **FolderTree**: Hierarchical folder navigation
- **TagManager**: Tag creation, editing, and filtering
- **FavoritesPanel**: Quick access to favorite notes
- **RecentNotes**: Recently accessed notes

#### Advanced Components
- **GraphView**: Visual note relationship graph
- **BacklinksPanel**: Notes that link to current note
- **TemplatesPanel**: Template selection and management
- **MediaLibrary**: File upload and management

### Key Libraries & Dependencies

#### Editor
- **@uiw/react-md-editor**: Rich markdown editor
- **react-markdown**: Markdown rendering
- **prismjs**: Syntax highlighting
- **remark-gfm**: GitHub Flavored Markdown support

#### Navigation & Search
- **fuse.js**: Fuzzy search implementation
- **react-virtualized**: Efficient large list rendering
- **react-beautiful-dnd**: Drag and drop functionality

#### Graph Visualization
- **d3.js**: Graph visualization
- **react-force-graph**: Interactive graph component

#### File Handling
- **@supabase/storage-js**: File upload and storage
- **file-saver**: File download functionality

## User Interface Design

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Search, Quick Switcher, User Menu                   │
├─────────────┬─────────────────────────────┬─────────────────┤
│             │                             │                 │
│ Sidebar     │ Editor/Preview              │ Right Panel     │
│ - Folders   │ - Split View                │ - Backlinks     │
│ - Tags      │ - Full Screen               │ - Properties    │
│ - Favorites │ - Distraction Free          │ - Graph View    │
│ - Recent    │                             │                 │
│             │                             │                 │
└─────────────┴─────────────────────────────┴─────────────────┘
```

### Key Interactions
- **Cmd/Ctrl + N**: Create new note
- **Cmd/Ctrl + P**: Quick switcher
- **Cmd/Ctrl + Shift + F**: Global search
- **Cmd/Ctrl + K**: Insert link
- **Cmd/Ctrl + B**: Bold
- **Cmd/Ctrl + I**: Italic
- **Cmd/Ctrl + Shift + V**: Paste as plain text
- **Cmd/Ctrl + S**: Save (auto-save enabled)

## Implementation Phases

### Phase 1: Core Editor (MVP)
1. Enhanced markdown editor with live preview
2. Basic folder structure
3. Improved note creation and editing
4. Auto-save functionality
5. Basic search and filtering

### Phase 2: Linking System
1. Internal linking with `[[Note Title]]` syntax
2. Backlinks panel
3. Link suggestions and auto-completion
4. Unlinked references detection

### Phase 3: Media & Files
1. Image upload and embedding
2. PDF embedding
3. File attachment system
4. Media library management

### Phase 4: Advanced Features
1. Graph view visualization
2. Templates system
3. Export/import functionality
4. Version history
5. Advanced search with filters

### Phase 5: Polish & Performance
1. Mobile responsiveness
2. Performance optimizations
3. Keyboard shortcuts
4. Customization options
5. Collaboration features (future)

## Success Metrics
- **User Engagement**: Time spent in notes app
- **Note Creation**: Number of notes created per user
- **Linking Usage**: Percentage of notes with internal links
- **Media Usage**: Number of media files uploaded
- **Search Usage**: Frequency of search usage
- **User Retention**: Return usage after first week

## Future Enhancements
- **Plugins System**: Extensible plugin architecture
- **Themes**: Customizable appearance
- **Mobile App**: Native mobile application
- **Offline Support**: Work without internet connection
- **AI Integration**: Smart suggestions and content generation
- **Collaboration**: Real-time collaborative editing
- **Publishing**: Public note sharing and publishing

## Technical Considerations
- **Performance**: Efficient rendering of large note collections
- **Storage**: Optimized file storage and retrieval
- **Search**: Fast full-text search across all content
- **Security**: Proper file access controls and user isolation
- **Scalability**: Handle growing note collections efficiently
- **Accessibility**: Full keyboard navigation and screen reader support 