'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Link as LinkIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useGoalSystem } from '@/hooks/useGoalSystem';
import { toast } from 'sonner';
import { LifeGoalArea, LifeGoal, Note } from '@/types/goal';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';

interface AreaManagerProps {
  selectedAreaId: string | null;
}

export default function AreaManager({ selectedAreaId }: AreaManagerProps) {
  console.log('AreaManager render');
  const router = useRouter();
  const [focusedAreaId, setFocusedAreaId] = useState<string | null>(null);

  const {
    areas,
    loading,
    error,
    addArea,
    updateArea,
    deleteArea,
    addSubarea,
    updateSubarea,
    deleteSubarea,
    linkNoteToArea,
    unlinkNoteFromArea,
    updateNoteLinkOrder,
  } = useGoalSystem();

  console.log('Areas from hook:', areas);

  const [isAddingArea, setIsAddingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaDescription, setNewAreaDescription] = useState('');
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editAreaName, setEditAreaName] = useState('');
  const [editAreaDescription, setEditAreaDescription] = useState('');
  const [isAddingSubarea, setIsAddingSubarea] = useState<string | null>(null);
  const [newSubareaName, setNewSubareaName] = useState('');
  const [newSubareaDescription, setNewSubareaDescription] = useState('');
  const [editingSubarea, setEditingSubarea] = useState<string | null>(null);
  const [editSubareaName, setEditSubareaName] = useState('');
  const [editSubareaDescription, setEditSubareaDescription] = useState('');
  const [deletingArea, setDeletingArea] = useState<string | null>(null);
  const [deletingSubarea, setDeletingSubarea] = useState<string | null>(null);
  const [isLinkingNote, setIsLinkingNote] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [showFullContent, setShowFullContent] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (selectedAreaId) {
      // Find the area element and scroll it into view
      const areaElement = document.getElementById(`area-${selectedAreaId}`);
      if (areaElement) {
        areaElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedAreaId]);

  const handleAddArea = async () => {
    try {
      await addArea(newAreaName, newAreaDescription);
      setIsAddingArea(false);
      setNewAreaName('');
      setNewAreaDescription('');
    } catch (err) {
      console.error('Error adding area:', err);
    }
  };

  const handleUpdateArea = async (id: string) => {
    try {
      await updateArea(id, {
        name: editAreaName,
        description: editAreaDescription,
      });
      setEditingArea(null);
      setEditAreaName('');
      setEditAreaDescription('');
    } catch (err) {
      console.error('Error updating area:', err);
    }
  };

  const handleDeleteArea = async (id: string) => {
    try {
      await deleteArea(id);
      setDeletingArea(null);
      toast.success('Area deleted successfully');
    } catch (err) {
      console.error('Error deleting area:', err);
      toast.error('Failed to delete area');
    }
  };

  const handleAddSubarea = async (areaId: string) => {
    if (!newSubareaName.trim()) return;
    
    try {
      console.log('Adding subarea:', { areaId, name: newSubareaName, description: newSubareaDescription });
      await addSubarea(areaId, newSubareaName, newSubareaDescription);
      console.log('Subarea added successfully');
      setIsAddingSubarea(null);
      setNewSubareaName('');
      setNewSubareaDescription('');
    } catch (err) {
      console.error('Error adding subarea:', err);
      toast.error('Failed to add subarea: ' + (err as Error).message);
    }
  };

  const handleDeleteSubarea = async (id: string) => {
    try {
      await deleteSubarea(id);
      setDeletingSubarea(null);
      toast.success('Subarea deleted successfully');
    } catch (err) {
      console.error('Error deleting subarea:', err);
      toast.error('Failed to delete subarea');
    }
  };

  const handleUpdateSubarea = async (id: string) => {
    try {
      await updateSubarea(id, {
        name: editSubareaName,
        description: editSubareaDescription,
      });
      setEditingSubarea(null);
      setEditSubareaName('');
      setEditSubareaDescription('');
    } catch (err) {
      console.error('Error updating subarea:', err);
    }
  };

  const handleSubareaClick = (subareaId: string) => {
    console.log('Subarea clicked:', subareaId);
    router.push(`/dashboard/goal?subarea=${subareaId}`);
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

  const handleLinkNote = async (areaId: string) => {
    if (!selectedNoteId) return;

    try {
      await linkNoteToArea(areaId, selectedNoteId);
      toast.success('Note linked successfully');
      setIsLinkingNote(false);
      setSelectedNoteId('');
    } catch (error) {
      console.error('Error linking note:', error);
      toast.error('Failed to link note');
    }
  };

  const handleUnlinkNote = async (linkId: string) => {
    try {
      await unlinkNoteFromArea(linkId);
      toast.success('Note unlinked successfully');
    } catch (error) {
      console.error('Error unlinking note:', error);
      toast.error('Failed to unlink note');
    }
  };

  const handleNoteReorder = async (result: any, areaId: string) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    const newNotes = Array.from(area.area_notes);
    const [removed] = newNotes.splice(source.index, 1);
    newNotes.splice(destination.index, 0, removed);

    // Update the display order in the database
    try {
      await Promise.all(
        newNotes.map((note, index) =>
          updateNoteLinkOrder('area', note.id, index)
        )
      );
    } catch (error) {
      console.error('Error updating note order:', error);
      toast.error('Failed to update note order');
    }
  };

  // Add a back button when an area is focused
  const renderHeader = () => (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold">
          {focusedAreaId ? 
            areas.find(a => a.id === focusedAreaId)?.name : 
            'Life Areas'
          }
        </h2>
        {focusedAreaId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFocusedAreaId(null)}
            className="text-blue-600 hover:text-blue-800 -ml-2"
          >
            View All Areas
          </Button>
        )}
      </div>
      <Dialog open={isAddingArea} onOpenChange={setIsAddingArea}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Area
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Life Area</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="e.g., Health & Fitness"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={newAreaDescription}
                onChange={(e) => setNewAreaDescription(e.target.value)}
                placeholder="Describe this life area..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddingArea(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddArea} disabled={!newAreaName.trim()}>
              Add Area
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

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
    <div className="space-y-4">
      {renderHeader()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas
          .filter(area => !focusedAreaId || area.id === focusedAreaId)
          .map((area) => (
          <Card key={area.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div 
                  className="cursor-pointer group"
                  onClick={() => setFocusedAreaId(area.id)}
                >
                  <CardTitle className="group-hover:text-blue-600 transition-colors">{area.name}</CardTitle>
                  {area.description && (
                    <p className="text-sm text-gray-600 mt-1">{area.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingArea(area.id);
                      setEditAreaName(area.name);
                      setEditAreaDescription(area.description || '');
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingArea(area.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      fetchAvailableNotes();
                      setIsLinkingNote(true);
                    }}
                  >
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-500">Subareas</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingSubarea(area.id)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Subarea
                  </Button>
                </div>
                
                {area.subareas && area.subareas.length > 0 ? (
                  <div className="space-y-3">
                    {area.subareas.map((subarea) => (
                      <div
                        key={subarea.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{subarea.name}</h4>
                            {subarea.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {subarea.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingSubarea(subarea.id);
                                setEditSubareaName(subarea.name);
                                setEditSubareaDescription(subarea.description || '');
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingSubarea(subarea.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Goals Summary */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Goals</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Navigate to Goals tab with this subarea selected
                                window.history.pushState({}, '', `/dashboard/goal?subarea=${subarea.id}`);
                                window.location.reload();
                              }}
                            >
                              View Goals ({subarea.goals?.length || 0})
                            </Button>
                          </div>
                          {subarea.goals && subarea.goals.length > 0 ? (
                            <ul className="space-y-1">
                              {subarea.goals.slice(0, 3).map((goal: LifeGoal) => (
                                <li key={goal.id} className="text-sm text-gray-600">
                                  • <Link 
                                      href={`/dashboard/goal?subarea=${subarea.id}&goal=${goal.id}`}
                                      className="hover:text-blue-600 hover:underline cursor-pointer"
                                    >
                                      {goal.title}
                                    </Link>
                                </li>
                              ))}
                              {subarea.goals.length > 3 && (
                                <li className="text-sm text-gray-500 italic">
                                  +{subarea.goals.length - 3} more...
                                </li>
                              )}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500">No goals yet</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No subareas yet. Click "Add Subarea" to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {areas.length === 0 && (
          <div className="col-span-2 text-center py-8">
            <p className="text-gray-500">No life areas defined yet.</p>
            <p className="text-sm text-gray-400">
              Click "Add Area" to get started.
            </p>
          </div>
        )}
      </div>

      {/* Edit Area Dialog */}
      <Dialog open={!!editingArea} onOpenChange={(open) => !open && setEditingArea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Life Area</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="edit-name"
                value={editAreaName}
                onChange={(e) => setEditAreaName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="edit-description"
                value={editAreaDescription}
                onChange={(e) => setEditAreaDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditingArea(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingArea && handleUpdateArea(editingArea)}
              disabled={!editAreaName.trim()}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Subarea Dialog */}
      <Dialog
        open={!!isAddingSubarea}
        onOpenChange={(open) => !open && setIsAddingSubarea(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="subarea-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="subarea-name"
                value={newSubareaName}
                onChange={(e) => setNewSubareaName(e.target.value)}
                placeholder="e.g., Strength Training"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="subarea-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="subarea-description"
                value={newSubareaDescription}
                onChange={(e) => setNewSubareaDescription(e.target.value)}
                placeholder="Describe this subarea..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddingSubarea(null);
                setNewSubareaName('');
                setNewSubareaDescription('');
              }}
            >
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
              <label htmlFor="edit-subarea-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="edit-subarea-name"
                value={editSubareaName}
                onChange={(e) => setEditSubareaName(e.target.value)}
                placeholder="e.g., Physical Health"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-subarea-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="edit-subarea-description"
                value={editSubareaDescription}
                onChange={(e) => setEditSubareaDescription(e.target.value)}
                placeholder="Describe this subarea..."
                rows={3}
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

      {/* Delete Area Confirmation Dialog */}
      <Dialog open={!!deletingArea} onOpenChange={(open) => !open && setDeletingArea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Area</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-500">Are you sure you want to delete this area? This will also delete all subareas, goals, milestones, and metrics within it. This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeletingArea(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingArea && handleDeleteArea(deletingArea)}
            >
              Delete Area
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Subarea Confirmation Dialog */}
      <Dialog open={!!deletingSubarea} onOpenChange={(open) => !open && setDeletingSubarea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subarea</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-500">Are you sure you want to delete this subarea? This will also delete all goals, milestones, and metrics within it. This action cannot be undone.</p>
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
            <DialogTitle>Link Note to Area</DialogTitle>
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
              onClick={() => focusedAreaId && handleLinkNote(focusedAreaId)}
              disabled={!selectedNoteId || !focusedAreaId}
            >
              Link Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 