'use client';

import { useState } from 'react';
import { Note, NoteFolder } from '../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Star, 
  ChevronRight, 
  ChevronDown,
  Plus,
  MoreVertical
} from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  folders: NoteFolder[];
  currentNote: Note | null;
  selectedFolder: string | null;
  onNoteSelect: (note: Note) => void;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder: () => void;
}

export default function Sidebar({
  notes,
  folders,
  currentNote,
  selectedFolder,
  onNoteSelect,
  onFolderSelect,
  onCreateFolder
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'recent'>('all');

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getNotesInFolder = (folderId: string | null) => {
    return notes.filter(note => note.folder_id === folderId);
  };

  const getFolderTree = (parentId: string | null = null): NoteFolder[] => {
    return folders
      .filter(folder => folder.parent_id === parentId)
      .map(folder => ({
        ...folder,
        children: getFolderTree(folder.id)
      }));
  };

  const renderFolder = (folder: NoteFolder & { children?: NoteFolder[] }, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const notesInFolder = getNotesInFolder(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${
            selectedFolder === folder.id ? 'bg-purple-100 text-purple-700' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onFolderSelect(folder.id)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folder.id);
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
            ) : (
              <div className="w-3 h-3" />
            )}
          </button>
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-500" />
          ) : (
            <Folder className="h-4 w-4 text-blue-500" />
          )}
          <span className="flex-1 text-sm truncate">{folder.name}</span>
          <span className="text-xs text-gray-500">{notesInFolder.length}</span>
        </div>
        
        {isExpanded && (
          <div>
            {notesInFolder.map(note => (
              <div
                key={note.id}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${
                  currentNote?.id === note.id ? 'bg-purple-100 text-purple-700' : ''
                }`}
                style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
                onClick={() => onNoteSelect(note)}
              >
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="flex-1 text-sm truncate">{note.title}</span>
                {note.is_favorite && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
              </div>
            ))}
            {folder.children?.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderNotesList = (notesToShow: Note[]) => (
    <div className="space-y-1">
      {notesToShow.map(note => (
        <div
          key={note.id}
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${
            currentNote?.id === note.id ? 'bg-purple-100 text-purple-700' : ''
          }`}
          onClick={() => onNoteSelect(note)}
        >
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="flex-1 text-sm truncate">{note.title}</span>
          {note.is_favorite && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
        </div>
      ))}
    </div>
  );

  const getFilteredNotes = () => {
    switch (activeTab) {
      case 'favorites':
        return notes.filter(note => note.is_favorite);
      case 'recent':
        return notes
          .sort((a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime())
          .slice(0, 10);
      default:
        return selectedFolder ? getNotesInFolder(selectedFolder) : notes;
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'all' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'favorites' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('favorites')}
        >
          Favorites
        </button>
        <button
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'recent' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('recent')}
        >
          Recent
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'all' ? (
          <div>
            {/* Root level notes */}
            {getNotesInFolder(null).length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Root Notes
                </div>
                {renderNotesList(getNotesInFolder(null))}
              </div>
            )}

            {/* Folder tree */}
            {getFolderTree().map(folder => renderFolder(folder))}
          </div>
        ) : (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {activeTab === 'favorites' ? 'Favorite Notes' : 'Recently Accessed'}
            </div>
            {renderNotesList(getFilteredNotes())}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200">
        <Button
          onClick={onCreateFolder}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      </div>
    </div>
  );
} 