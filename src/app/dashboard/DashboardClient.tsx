'use client';

import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface Note {
  id: string
  title: string
  content: string
  created_at: string
  user_id: string
}

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()
  const [notes, setNotes] = useState<Note[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [newNote, setNewNote] = useState({ title: '', content: '' })
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [editForm, setEditForm] = useState({ title: '', content: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      console.log('Fetched notes:', data)
      setNotes(data || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
      setError('Failed to fetch notes')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleCreateNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([
          {
            title: newNote.title,
            content: newNote.content,
            user_id: user.id
          }
        ])
        .select()

      if (error) throw error
      console.log('Created note:', data)

      setNewNote({ title: '', content: '' })
      setIsModalOpen(false)
      fetchNotes()
    } catch (error) {
      console.error('Error creating note:', error)
      setError('Failed to create note')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditNote = async () => {
    if (!editingNote) return;
    
    if (!editForm.title || !editForm.content) {
      setError('Title and content are required');
      return;
    }

    try {
      setIsLoading(true);
      const { data, error, status } = await supabase
        .from('notes')
        .update({ title: editForm.title, content: editForm.content })
        .eq('id', editingNote.id);

      console.log({ status, error }); // Add logging

      if (error) throw error;

      // Update local state instead of refetching
      setNotes(prev =>
        prev.map(n => n.id === editingNote.id 
          ? { ...n, title: editForm.title, content: editForm.content } 
          : n
        )
      );

      setIsEditModalOpen(false);
      setEditingNote(null);
      setEditForm({ title: '', content: '' });
    } catch (error) {
      console.error('Error updating note:', error);
      setError('Failed to update note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      setIsLoading(true);
      const { data, error, status } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      console.log({ status, error }); // Add logging

      if (error) throw error;

      // Update local state instead of refetching
      setNotes(prev => prev.filter(n => n.id !== id));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Failed to delete note');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Notes</h1>
          <button
            onClick={handleSignOut}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Sign Out
          </button>
        </div>
        
        {/* Add Note Button */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="mb-8 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Add New Note
        </button>

        {/* Notes Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">{note.title}</h3>
              <p className="text-gray-600 mb-4">{note.content}</p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditingNote(note)
                    setEditForm({ title: note.title, content: note.content })
                    setIsEditModalOpen(true)
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirmId(note.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create New Note</h2>
            <input
              type="text"
              placeholder="Note Title"
              className="w-full mb-4 p-2 border rounded"
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            />
            <textarea
              placeholder="Note Content"
              className="w-full mb-4 p-2 border rounded h-32"
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {isEditModalOpen && editingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Edit Note</h2>
            <input
              type="text"
              placeholder="Note Title"
              className="w-full mb-4 p-2 border rounded"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
            <textarea
              placeholder="Note Content"
              className="w-full mb-4 p-2 border rounded h-32"
              value={editForm.content}
              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setEditingNote(null)
                  setEditForm({ title: '', content: '' })
                  setIsEditModalOpen(false)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleEditNote}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Delete Note</h2>
            <p className="mb-6 text-gray-600">Are you sure you want to delete this note? This action cannot be undone.</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNote(deleteConfirmId)}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 