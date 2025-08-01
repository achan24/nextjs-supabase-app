'use client';

import { useState, useEffect } from 'react';
import { Note, Backlink } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Link, Tag, Calendar, Clock } from 'lucide-react';

interface RightPanelProps {
  currentNote: Note | null;
  notes: Note[];
  onNoteSelect: (note: Note) => void;
}

export default function RightPanel({
  currentNote,
  notes,
  onNoteSelect
}: RightPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [activeTab, setActiveTab] = useState<'backlinks' | 'properties'>('backlinks');

  useEffect(() => {
    if (currentNote) {
      findBacklinks(currentNote);
    }
  }, [currentNote, notes]);

  const findBacklinks = (note: Note) => {
    const links: Backlink[] = [];
    const noteTitle = note.title.toLowerCase();

    notes.forEach(sourceNote => {
      if (sourceNote.id === note.id) return;

      const content = sourceNote.content.toLowerCase();
      const titleInContent = content.includes(`[[${note.title}]]`) || 
                            content.includes(`[[${note.title.toLowerCase()}]]`);

      if (titleInContent) {
        // Extract context around the link
        const context = extractContext(sourceNote.content, note.title);
        
        links.push({
          source_note: sourceNote,
          context,
          link_text: note.title
        });
      }
    });

    setBacklinks(links);
  };

  const extractContext = (content: string, noteTitle: string, contextLength: number = 100): string => {
    const index = content.toLowerCase().indexOf(noteTitle.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(content.length, index + contextLength / 2);
    let context = content.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < content.length) context = context + '...';

    return context;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentNote) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 p-4">
        <div className="text-center text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Select a note to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'backlinks' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('backlinks')}
        >
          Backlinks ({backlinks.length})
        </button>
        <button
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'properties' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('properties')}
        >
          Properties
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'backlinks' ? (
          <div className="space-y-3">
            {backlinks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Link className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No backlinks found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Other notes will appear here when they link to this note
                </p>
              </div>
            ) : (
              backlinks.map((backlink) => (
                <Card key={backlink.source_note.id} className="cursor-pointer hover:shadow-sm">
                  <CardContent className="p-3">
                    <div
                      className="text-sm font-medium text-purple-600 hover:text-purple-800 mb-1"
                      onClick={() => onNoteSelect(backlink.source_note)}
                    >
                      {backlink.source_note.title}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {backlink.context}
                    </div>
                    <div className="flex items-center gap-1">
                      <Link className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {backlink.link_text}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Created:</span>
                  <span>{formatDate(currentNote.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Modified:</span>
                  <span>{formatDate(currentNote.updated_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Last accessed:</span>
                  <span>{formatDate(currentNote.last_accessed_at)}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {currentNote.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {currentNote.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Word count:</span>
                  <span>{currentNote.content.split(/\s+/).filter(word => word.length > 0).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Character count:</span>
                  <span>{currentNote.content.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Backlinks:</span>
                  <span>{backlinks.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 