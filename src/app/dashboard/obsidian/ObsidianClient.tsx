'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Note, NoteFolder, EditorState } from './types';
import Sidebar from './components/Sidebar';
import MarkdownEditor from './components/MarkdownEditor';
import RightPanel from './components/RightPanel';
import QuickSwitcher from './components/QuickSwitcher';
import { Button } from '@/components/ui/button';
import { Search, Plus, Settings } from 'lucide-react';
import { YouTubeProvider } from './components/useYouTube';

export default function ObsidianClient({ user }: { user: User }) {
  const supabase = createClient();
  
  // State management
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editorState, setEditorState] = useState<EditorState>({
    mode: 'edit' as const,
    isFullScreen: false,
    autoSave: true,
    wordCount: 0,
    lastSaved: null
  });

  // Fetch initial data
  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('[Obsidian Clone] Error fetching notes:', error);
    }
  };

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('note_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('[Obsidian Clone] Error fetching folders:', error);
    }
  };

  const createNewNote = async () => {
    try {
      const newNote: Partial<Note> = {
        title: 'Untitled Note',
        content: '',
        user_id: user.id,
        folder_id: selectedFolder || undefined,
        tags: [],
        is_favorite: false,
        is_template: false
      };

      const { data, error } = await supabase
        .from('notes')
        .insert([newNote])
        .select()
        .single();

      if (error) throw error;
      
      setNotes(prev => [data, ...prev]);
      setCurrentNote(data);
    } catch (error) {
      console.error('[Obsidian Clone] Error creating note:', error);
    }
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => prev.map(note => note.id === noteId ? data : note));
      if (currentNote?.id === noteId) {
        setCurrentNote(data);
      }
    } catch (error) {
      console.error('[Obsidian Clone] Error updating note:', error);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== noteId));
      if (currentNote?.id === noteId) {
        setCurrentNote(null);
      }
    } catch (error) {
      console.error('[Obsidian Clone] Error deleting note:', error);
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchQuery === '' || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFolder = !selectedFolder || note.folder_id === selectedFolder;
    
    return matchesSearch && matchesFolder;
  });

  return (
    <YouTubeProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">Obsidian Clone</h1>
          
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Mobile search bar */}
        <div className="relative md:hidden">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            onClick={() => setIsQuickSwitcherOpen(true)}
            variant="outline"
            size="sm"
            className="hidden md:flex"
          >
            Quick Switcher
          </Button>
          <Button onClick={createNewNote} size="sm">
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">New Note</span>
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          fixed md:relative
          left-0 top-0
          w-80 md:w-64
          h-full
          bg-white border-r border-gray-200
          z-50 md:z-auto
          transition-transform duration-300 ease-in-out
        `}>
          <Sidebar
            notes={filteredNotes}
            folders={folders}
            currentNote={currentNote}
            selectedFolder={selectedFolder}
            onNoteSelect={(note) => {
              setCurrentNote(note);
              setIsSidebarOpen(false); // Close sidebar on mobile when note is selected
            }}
            onFolderSelect={setSelectedFolder}
            onCreateFolder={() => {/* TODO */}}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {currentNote ? (
            <MarkdownEditor
              note={currentNote}
              onUpdate={updateNote}
              editorState={editorState}
              onEditorStateChange={setEditorState}
              allNotes={notes}
              onNoteSelect={setCurrentNote}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
              <div className="text-center">
                <div className="text-4xl md:text-6xl mb-4">📝</div>
                <h2 className="text-lg md:text-xl font-medium mb-2">No note selected</h2>
                <p className="text-sm">Select a note from the sidebar or create a new one</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Hidden on mobile */}
        <div className="hidden lg:block">
          <RightPanel
            currentNote={currentNote}
            notes={notes}
            onNoteSelect={setCurrentNote}
          />
        </div>
      </div>

      {/* Quick Switcher Modal */}
      {isQuickSwitcherOpen && (
        <QuickSwitcher
          notes={notes}
          folders={folders}
          onNoteSelect={(note: Note) => {
            setCurrentNote(note);
            setIsQuickSwitcherOpen(false);
          }}
          onClose={() => setIsQuickSwitcherOpen(false)}
        />
      )}
    </div>
    </YouTubeProvider>
  );
} 