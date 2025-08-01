'use client';

import { useState, useEffect } from 'react';
import { Note, NoteFolder, QuickSwitcherResult } from '../types';
import { Search, FileText, Folder, Star, Clock } from 'lucide-react';

interface QuickSwitcherProps {
  notes: Note[];
  folders: NoteFolder[];
  onNoteSelect: (note: Note) => void;
  onClose: () => void;
}

export default function QuickSwitcher({
  notes,
  folders,
  onNoteSelect,
  onClose
}: QuickSwitcherProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<QuickSwitcherResult[]>([]);

  useEffect(() => {
    if (query.trim() === '') {
      // Show recent notes when no query
      const recentNotes = notes
        .sort((a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime())
        .slice(0, 10)
        .map(note => ({
          type: 'note' as const,
          id: note.id,
          title: note.title,
          tags: note.tags,
          is_favorite: note.is_favorite,
          last_accessed: note.last_accessed_at
        }));
      setResults(recentNotes);
    } else {
      // Search through notes and folders
      const searchResults: QuickSwitcherResult[] = [];
      
      // Search notes
      notes.forEach(note => {
        const titleMatch = note.title.toLowerCase().includes(query.toLowerCase());
        const contentMatch = note.content.toLowerCase().includes(query.toLowerCase());
        const tagMatch = note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
        
        if (titleMatch || contentMatch || tagMatch) {
          searchResults.push({
            type: 'note',
            id: note.id,
            title: note.title,
            tags: note.tags,
            is_favorite: note.is_favorite,
            last_accessed: note.last_accessed_at
          });
        }
      });

      // Search folders
      folders.forEach(folder => {
        if (folder.name.toLowerCase().includes(query.toLowerCase())) {
          searchResults.push({
            type: 'folder',
            id: folder.id,
            title: folder.name
          });
        }
      });

      setResults(searchResults);
    }
    setSelectedIndex(0);
  }, [query, notes, folders]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            const selected = results[selectedIndex];
            if (selected.type === 'note') {
              const note = notes.find(n => n.id === selected.id);
              if (note) {
                onNoteSelect(note);
              }
            }
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, notes, onNoteSelect, onClose]);

  const handleResultClick = (result: QuickSwitcherResult) => {
    if (result.type === 'note') {
      const note = notes.find(n => n.id === result.id);
      if (note) {
        onNoteSelect(note);
      }
    }
    onClose();
  };

  const getIcon = (result: QuickSwitcherResult) => {
    switch (result.type) {
      case 'note':
        return <FileText className="h-4 w-4" />;
      case 'folder':
        return <Folder className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSubtitle = (result: QuickSwitcherResult) => {
    if (result.type === 'note') {
      if (result.tags && result.tags.length > 0) {
        return result.tags.join(', ');
      }
      if (result.last_accessed) {
        return `Last accessed ${new Date(result.last_accessed).toLocaleDateString()}`;
      }
    }
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes and folders..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-lg outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2" />
              <p>No results found</p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}`}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                    index === selectedIndex ? 'bg-purple-50 border-r-2 border-purple-500' : ''
                  }`}
                  onClick={() => handleResultClick(result)}
                >
                  <div className="text-gray-400">
                    {getIcon(result)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{result.title}</span>
                      {result.is_favorite && (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    {getSubtitle(result) && (
                      <div className="text-sm text-gray-500 truncate">
                        {getSubtitle(result)}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {result.type === 'note' ? 'Note' : 'Folder'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
            <span>{results.length} results</span>
          </div>
        </div>
      </div>
    </div>
  );
} 