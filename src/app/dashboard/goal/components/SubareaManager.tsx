'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Link as LinkIcon, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useGoalSystem } from '@/hooks/useGoalSystem';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/components/ui/spinner';
import { LifeGoalArea, Note } from '@/types/goal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { NoteLinkButton } from '@/components/ui/note-link-button';

export default function SubareaManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterSubareaId = searchParams?.get('filter');

  const {
    areas,
    loading,
    error,
    addSubarea,
    updateSubarea,
    deleteSubarea,
    linkNoteToSubarea,
    unlinkNoteFromSubarea,
    updateNoteLinkOrder,
  } = useGoalSystem();

  // Filter areas to only show the specific subarea if filter is present
  const filteredAreas = filterSubareaId ? areas.map(area => ({
    ...area,
    subareas: area.subareas.filter(subarea => subarea.id === filterSubareaId)
  })).filter(area => area.subareas.length > 0) : areas;

  const [isAddingSubarea, setIsAddingSubarea] = useState<string | null>(null);
  const [newSubareaName, setNewSubareaName] = useState('');
  const [newSubareaDescription, setNewSubareaDescription] = useState('');
  const [editingSubarea, setEditingSubarea] = useState<string | null>(null);
  const [editSubareaName, setEditSubareaName] = useState('');
  const [editSubareaDescription, setEditSubareaDescription] = useState('');
  const [deletingSubarea, setDeletingSubarea] = useState<string | null>(null);
  const [isLinkingNote, setIsLinkingNote] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [selectedSubareaId, setSelectedSubareaId] = useState<string | null>(null);
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [showFullContent, setShowFullContent] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  const handleAddSubarea = async (areaId: string) => {
    if (!newSubareaName.trim()) {
      toast.error('Please enter a subarea name');
      return;
    }
    
    try {
      await addSubarea(areaId, newSubareaName, newSubareaDescription);
      toast.success('Subarea added successfully');
      setIsAddingSubarea(null);
      setNewSubareaName('');
      setNewSubareaDescription('');
    } catch (err) {
      console.error('Error adding subarea:', err);
      toast.error('Failed to add subarea: ' + (err as Error).message);
    }
  };

  const handleUpdateSubarea = async (id: string) => {
    if (!editSubareaName.trim()) {
      toast.error('Please enter a subarea name');
      return;
    }

    try {
      await updateSubarea(id, {
        name: editSubareaName,
        description: editSubareaDescription,
      });
      toast.success('Subarea updated successfully');
      setEditingSubarea(null);
      setEditSubareaName('');
      setEditSubareaDescription('');
    } catch (err) {
      console.error('Error updating subarea:', err);
      toast.error('Failed to update subarea');
    }
  };

  const handleDeleteSubarea = async (id: string) => {
    try {
      await deleteSubarea(id);
      toast.success('Subarea deleted successfully');
      setDeletingSubarea(null);
    } catch (err) {
      console.error('Error deleting subarea:', err);
      toast.error('Failed to delete subarea');
    }
  };

  const fetchAvailableNotes = async () => {
    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    setAvailableNotes(notes || []);
  };

  const handleLinkNote = async () => {
    if (!selectedNoteId || !selectedSubareaId) return;

    try {
      await linkNoteToSubarea(selectedSubareaId, selectedNoteId);
      toast.success('Note linked successfully');
      setIsLinkingNote(false);
      setSelectedNoteId('');
      setSelectedSubareaId(null);
    } catch (error) {
      console.error('Error linking note:', error);
      toast.error('Failed to link note');
    }
  };

  const handleUnlinkNote = async (linkId: string) => {
    try {
      await unlinkNoteFromSubarea(linkId);
      toast.success('Note unlinked successfully');
    } catch (error) {
      console.error('Error unlinking note:', error);
      toast.error('Failed to unlink note');
    }
  };

  const handleNoteReorder = async (result: any, subareaId: string) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const subarea = areas
      .flatMap(area => area.subareas)
      .find(s => s.id === subareaId);
    if (!subarea) return;

    const newNotes = Array.from(subarea.subarea_notes);
    const [removed] = newNotes.splice(source.index, 1);
    newNotes.splice(destination.index, 0, removed);

    // Update the display order in the database
    try {
      await Promise.all(
        newNotes.map((note, index) =>
          updateNoteLinkOrder('subarea', note.id, index)
        )
      );
    } catch (error) {
      console.error('Error updating note order:', error);
      toast.error('Failed to update note order');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        <p>Error loading areas: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-4">
        {filterSubareaId ? (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/goal?tab=subareas')}
              >
                ← All Subareas
              </Button>
              <span className="text-gray-500">|</span>
              {filteredAreas.map(area => (
                <span key={area.id} className="text-lg font-semibold">
                  {area.name}
                </span>
              ))}
            </div>
          </>
        ) : (
          <h2 className="text-2xl font-bold">Subareas</h2>
        )}
      </div>

      {filteredAreas.map(area => (
        <div key={area.id} className="mb-8">
          {!filterSubareaId && (
            <div className="flex justify-between items-center mb-4">
              <Link 
                href={`/dashboard/goal?tab=areas&area=${area.id}`}
                className="text-xl font-semibold hover:text-blue-600"
              >
                {area.name}
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingSubarea(area.id)}
              >
                + Add Subarea
              </Button>
            </div>
          )}
          <div className={`grid grid-cols-1 ${!filterSubareaId ? 'md:grid-cols-2' : ''} gap-4`}>
            {area.subareas.map(subarea => (
              <Card key={subarea.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{subarea.name}</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSubarea(subarea.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <NoteLinkButton
                        type="subarea"
                        id={subarea.id}
                        name={subarea.name}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Goals Section */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-500">Goals</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.set('tab', 'goals');
                          url.searchParams.set('subarea', subarea.id);
                          router.push(url.toString(), { scroll: false });
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Goals List */}
                  {subarea.goals && subarea.goals.length > 0 && (
                    <div className="space-y-2">
                      {subarea.goals.map((goal) => (
                        <div 
                          key={goal.id} 
                          className="flex justify-between items-start border-b pb-2 last:border-0"
                        >
                          <div className="flex-1">
                            <Link 
                              href={`/dashboard/goal?tab=goals&subarea=${subarea.id}&goal=${goal.id}`}
                              className="text-sm font-medium hover:text-blue-600"
                            >
                              {goal.title}
                            </Link>
                            {goal.description && (
                              <p className="text-xs text-gray-600 mt-1">{goal.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {goal.milestones?.length || 0} milestone{goal.milestones?.length !== 1 ? 's' : ''}
                              </span>
                              {goal.milestones?.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500">
                                    {goal.milestones.filter(m => m.completed).length} completed
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes Section - Only show if there are linked notes */}
                  {subarea.subarea_notes && subarea.subarea_notes.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <div 
                        className="flex items-center gap-2 cursor-pointer mb-2"
                        onClick={() => setExpandedNotes(prev => ({
                          ...prev,
                          [subarea.id]: !prev[subarea.id]
                        }))}
                      >
                        {expandedNotes[subarea.id] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <h3 className="text-sm font-medium text-gray-500">
                          Linked Notes ({subarea.subarea_notes.length})
                        </h3>
                      </div>
                      
                      {expandedNotes[subarea.id] && (
                        <div className="space-y-2 pl-6">
                          {subarea.subarea_notes.map((noteLink) => (
                            <div 
                              key={noteLink.id} 
                              className="bg-gray-50 rounded-lg p-3"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-grow">
                                  <h4 className="font-medium">{noteLink.note.title}</h4>
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {noteLink.note.content}
                                  </p>
                                  {noteLink.note.content.length > 150 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowFullContent(showFullContent === noteLink.id ? null : noteLink.id)}
                                      className="mt-1 text-blue-600 hover:text-blue-800"
                                    >
                                      {showFullContent === noteLink.id ? 'Show less' : 'Show more'}
                                    </Button>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnlinkNote(noteLink.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Unlink
                                </Button>
                              </div>
                              {showFullContent === noteLink.id && (
                                <p className="text-sm text-gray-600 mt-2">
                                  {noteLink.note.content}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Add Subarea Dialog */}
      <Dialog open={isAddingSubarea !== null} onOpenChange={(open) => !open && setIsAddingSubarea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={newSubareaName}
                onChange={(e) => setNewSubareaName(e.target.value)}
                placeholder="Enter subarea name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                id="description"
                value={newSubareaDescription}
                onChange={(e) => setNewSubareaDescription(e.target.value)}
                placeholder="Enter subarea description"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddingSubarea(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => isAddingSubarea && handleAddSubarea(isAddingSubarea)}
              disabled={!newSubareaName.trim()}
            >
              Add Subarea
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subarea Dialog */}
      <Dialog open={editingSubarea !== null} onOpenChange={(open) => !open && setEditingSubarea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="editName" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="editName"
                value={editSubareaName}
                onChange={(e) => setEditSubareaName(e.target.value)}
                placeholder="Enter subarea name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editDescription" className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                id="editDescription"
                value={editSubareaDescription}
                onChange={(e) => setEditSubareaDescription(e.target.value)}
                placeholder="Enter subarea description"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditingSubarea(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingSubarea && handleUpdateSubarea(editingSubarea)}
              disabled={!editSubareaName.trim()}
            >
              Update Subarea
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Subarea Dialog */}
      <Dialog open={deletingSubarea !== null} onOpenChange={(open) => !open && setDeletingSubarea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subarea</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this subarea? This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeletingSubarea(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingSubarea && handleDeleteSubarea(deletingSubarea)}
            >
              Delete Subarea
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Linking Dialog */}
      <Dialog open={isLinkingNote} onOpenChange={setIsLinkingNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Note to Subarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="note-select" className="text-sm font-medium">
                Select Note
              </label>
              <Select
                value={selectedNoteId}
                onValueChange={setSelectedNoteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a note..." />
                </SelectTrigger>
                <SelectContent>
                  {availableNotes.map(note => (
                    <SelectItem key={note.id} value={note.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{note.title}</span>
                        <span className="text-sm text-gray-500 truncate">
                          {note.content}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsLinkingNote(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkNote}
              disabled={!selectedNoteId || !selectedSubareaId}
            >
              Link Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 