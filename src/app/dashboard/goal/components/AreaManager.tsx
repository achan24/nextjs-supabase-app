'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useGoalSystem } from '@/hooks/useGoalSystem';
import { toast } from 'sonner';
import { LifeGoalArea } from '@/types/goal';

export default function AreaManager() {
  console.log('AreaManager render');
  const router = useRouter();

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
    } catch (err) {
      console.error('Error deleting area:', err);
    }
  };

  const handleAddSubarea = async (areaId: string) => {
    if (!newSubareaName.trim()) return;
    
    try {
      await addSubarea(areaId, newSubareaName, newSubareaDescription);
      setIsAddingSubarea(null);
      setNewSubareaName('');
      setNewSubareaDescription('');
    } catch (err) {
      console.error('Error adding subarea:', err);
    }
  };

  const handleDeleteSubarea = async (id: string) => {
    try {
      await deleteSubarea(id);
    } catch (err) {
      console.error('Error deleting subarea:', err);
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Life Areas</h2>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map((area) => {
          console.log('Rendering area:', { id: area.id, name: area.name, subareas: area.subareas?.length });
          return (
            <Card key={area.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{area.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        console.log('Edit area clicked:', area.id);
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
                      onClick={() => handleDeleteArea(area.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {area.description && (
                  <p className="text-sm text-gray-600 mb-4">{area.description}</p>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Subareas</span>
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
                    <ul className="space-y-2">
                      {area.subareas.map((subarea) => {
                        console.log('Rendering subarea:', { id: subarea.id, name: subarea.name });
                        return (
                          <li
                            key={subarea.id}
                            onClick={() => handleSubareaClick(subarea.id)}
                            className="flex justify-between items-center p-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
                          >
                            <span>{subarea.name}</span>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  console.log('Edit subarea clicked:', subarea.id);
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
                                onClick={() => handleDeleteSubarea(subarea.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No subareas yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {areas.length === 0 && (
          <div className="col-span-2 text-center py-8">
            <p className="text-gray-500">No life areas defined yet.</p>
            <p className="text-sm text-gray-400">
              Click &quot;Add Area&quot; to get started.
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
    </div>
  );
} 