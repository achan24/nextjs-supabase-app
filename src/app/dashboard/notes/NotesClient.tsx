'use client';

import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link';
import { format } from 'date-fns';

interface Note {
  id: string
  title: string
  content: string
  created_at: string
  user_id: string
  tags: string[]
}

export default function NotesClient({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()
  const [notes, setNotes] = useState<Note[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newNote, setNewNote] = useState({ title: '', content: '', tags: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
      setError('Failed to fetch notes')
    }
  }

  const handleCreateNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      const tags = newNote.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const { data, error } = await supabase
        .from('notes')
        .insert([
          {
            title: newNote.title,
            content: newNote.content,
            user_id: user.id,
            tags
          }
        ])
        .select()

      if (error) throw error

      setNewNote({ title: '', content: '', tags: '' })
      setIsModalOpen(false)
      fetchNotes()
    } catch (error) {
      console.error('Error creating note:', error)
      setError('Failed to create note')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditNote = async (note: Note, updatedTitle: string, updatedContent: string, updatedTags?: string) => {
    if (!updatedTitle || !updatedContent) {
      setError('Title and content are required');
      return;
    }

    try {
      setIsLoading(true);
      const tags = updatedTags
        ? updatedTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : note.tags;

      const { data, error } = await supabase
        .from('notes')
        .update({ 
          title: updatedTitle, 
          content: updatedContent,
          tags
        })
        .eq('id', note.id);

      if (error) throw error;

      setNotes(prev =>
        prev.map(n => n.id === note.id 
          ? { ...n, title: updatedTitle, content: updatedContent, tags } 
          : n
        )
      );

      setEditingNoteId(null);
    } catch (error) {
      console.error('Error updating note:', error);
      setError('Failed to update note');
    } finally {
      setIsLoading(false);
    }
  };

  const getAllTags = () => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const handleKeyDown = (e: React.KeyboardEvent, note: Note, field: 'title' | 'content', value: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const updatedNote = { ...note };
      updatedNote[field] = value;
      handleEditNote(note, updatedNote.title, updatedNote.content);
    }
    if (e.key === 'Escape') {
      setEditingNoteId(null);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotes(prev => prev.filter(n => n.id !== id));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Failed to delete note');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTag = !tagFilter || note.tags?.includes(tagFilter);
    
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded-lg ${view === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded-lg ${view === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Note</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTagFilter(null)}
              className={`px-3 py-1 rounded-full text-sm ${
                !tagFilter ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            {getAllTags().map(tag => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag)}
                className={`px-3 py-1 rounded-full text-sm ${
                  tagFilter === tag ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {view === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  {editingNoteId === note.id ? (
                    <>
                      <input
                        type="text"
                        defaultValue={note.title}
                        className="w-full text-xl font-semibold mb-2 p-1 border-b border-blue-500 focus:outline-none focus:border-blue-700"
                        onKeyDown={(e) => handleKeyDown(e, note, 'title', e.currentTarget.value)}
                        onBlur={(e) => {
                          if (e.target.value !== note.title) {
                            handleEditNote(note, e.target.value, note.content);
                          }
                        }}
                        autoFocus
                      />
                      <textarea
                        defaultValue={note.content}
                        className="w-full min-h-[100px] p-1 border-b border-blue-500 focus:outline-none focus:border-blue-700 resize-none"
                        onKeyDown={(e) => handleKeyDown(e, note, 'content', e.currentTarget.value)}
                        onBlur={(e) => {
                          if (e.target.value !== note.content) {
                            handleEditNote(note, note.title, e.target.value);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <input
                        type="text"
                        defaultValue={note.tags?.join(', ')}
                        placeholder="Tags (comma-separated)"
                        className="w-full mt-2 p-1 border-b border-blue-500 focus:outline-none focus:border-blue-700"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditNote(note, note.title, note.content, e.currentTarget.value);
                          }
                        }}
                        onBlur={(e) => handleEditNote(note, note.title, note.content, e.currentTarget.value)}
                      />
                    </>
                  ) : (
                    <>
                      <div 
                        className="cursor-pointer"
                        onClick={() => setEditingNoteId(note.id)}
                      >
                        <h3 className="text-xl font-semibold mb-2 text-gray-900 hover:text-blue-600">
                          {note.title}
                        </h3>
                        <p className="text-gray-600 mb-4 hover:text-blue-600 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {note.tags?.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-500">
                          {format(new Date(note.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => setEditingNoteId(note.id)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(note.id)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col">
                    {editingNoteId === note.id ? (
                      <>
                        <input
                          type="text"
                          defaultValue={note.title}
                          className="w-full text-xl font-semibold mb-2 p-1 border-b border-blue-500 focus:outline-none focus:border-blue-700"
                          onKeyDown={(e) => handleKeyDown(e, note, 'title', e.currentTarget.value)}
                          onBlur={(e) => {
                            if (e.target.value !== note.title) {
                              handleEditNote(note, e.target.value, note.content);
                            }
                          }}
                          autoFocus
                        />
                        <textarea
                          defaultValue={note.content}
                          className="w-full min-h-[100px] p-1 border-b border-blue-500 focus:outline-none focus:border-blue-700 resize-none"
                          onKeyDown={(e) => handleKeyDown(e, note, 'content', e.currentTarget.value)}
                          onBlur={(e) => {
                            if (e.target.value !== note.content) {
                              handleEditNote(note, note.title, e.target.value);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <input
                          type="text"
                          defaultValue={note.tags?.join(', ')}
                          placeholder="Tags (comma-separated)"
                          className="w-full mt-2 p-1 border-b border-blue-500 focus:outline-none focus:border-blue-700"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEditNote(note, note.title, note.content, e.currentTarget.value);
                            }
                          }}
                          onBlur={(e) => handleEditNote(note, note.title, note.content, e.currentTarget.value)}
                        />
                      </>
                    ) : (
                      <>
                        <div 
                          className="cursor-pointer"
                          onClick={() => setEditingNoteId(note.id)}
                        >
                          <h3 className="text-xl font-semibold mb-2 text-gray-900 hover:text-blue-600">
                            {note.title}
                          </h3>
                          <p className="text-gray-600 mb-4 hover:text-blue-600 whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {note.tags?.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-gray-500">
                            {format(new Date(note.created_at), 'MMM d, yyyy')}
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => setEditingNoteId(note.id)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(note.id)}
                              className="text-red-600 hover:text-red-700 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? 'Try adjusting your search query' : 'Get started by creating a new note'}
            </p>
          </div>
        )}
      </div>

      {/* Create Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Note</h2>
            </div>
            <div className="p-6">
              <input
                type="text"
                placeholder="Note Title"
                className="w-full mb-4 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              />
              <textarea
                placeholder="Note Content"
                className="w-full mb-4 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              />
              <input
                type="text"
                placeholder="Tags (comma-separated)"
                className="w-full mb-4 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newNote.tags}
                onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNote}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Delete Note</h2>
            </div>
            <div className="p-6">
              <p className="mb-4 text-gray-600">Are you sure you want to delete this note? This action cannot be undone.</p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteNote(deleteConfirmId)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? 'Deleting...' : 'Delete Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 