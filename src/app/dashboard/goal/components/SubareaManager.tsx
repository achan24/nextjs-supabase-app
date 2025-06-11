'use client';

import { useState } from 'react';
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

export default function SubareaManager() {
  const {
    areas,
    loading,
    error,
    addSubarea,
    updateSubarea,
    deleteSubarea,
  } = useGoalSystem();

  const [isAddingSubarea, setIsAddingSubarea] = useState<string | null>(null);
  const [newSubareaName, setNewSubareaName] = useState('');
  const [newSubareaDescription, setNewSubareaDescription] = useState('');
  const [editingSubarea, setEditingSubarea] = useState<string | null>(null);
  const [editSubareaName, setEditSubareaName] = useState('');
  const [editSubareaDescription, setEditSubareaDescription] = useState('');
  const [deletingSubarea, setDeletingSubarea] = useState<string | null>(null);

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Subareas</h2>
      </div>

      {areas.map((area) => (
        <Card key={area.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{area.name}</CardTitle>
              {area.description && (
                <p className="text-sm text-gray-600 mt-1">{area.description}</p>
              )}
            </div>
            <Button
              onClick={() => setIsAddingSubarea(area.id)}
              className="ml-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Subarea
            </Button>
          </CardHeader>
          <CardContent>
            {area.subareas && area.subareas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {area.subareas.map((subarea) => (
                  <Card 
                    key={subarea.id}
                    className="group cursor-pointer transition-all hover:shadow-lg hover:border-gray-400"
                    onClick={() => {
                      window.history.pushState({}, '', `/dashboard/goal?subarea=${subarea.id}`);
                      window.location.reload();
                    }}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="group-hover:text-blue-600 transition-colors">
                            {subarea.name}
                          </CardTitle>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSubarea(subarea.id);
                              setEditSubareaName(subarea.name);
                              setEditSubareaDescription(subarea.description || '');
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingSubarea(subarea.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {subarea.goals?.length || 0} goal{subarea.goals?.length !== 1 ? 's' : ''}
                        </div>
                        <Button
                          variant="link"
                          className="px-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.history.pushState({}, '', `/dashboard/goal?subarea=${subarea.id}`);
                            window.location.reload();
                          }}
                        >
                          View Goals
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No subareas yet. Click "Add Subarea" to get started.
              </p>
            )}
          </CardContent>
        </Card>
      ))}

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
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={newSubareaName}
                onChange={(e) => setNewSubareaName(e.target.value)}
                placeholder="e.g., Physical Health"
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
                placeholder="Describe this subarea..."
                rows={3}
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
      <Dialog 
        open={!!editingSubarea} 
        onOpenChange={(open) => !open && setEditingSubarea(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="edit-name"
                value={editSubareaName}
                onChange={(e) => setEditSubareaName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="edit-description"
                value={editSubareaDescription}
                onChange={(e) => setEditSubareaDescription(e.target.value)}
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
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Subarea Confirmation Dialog */}
      <Dialog 
        open={!!deletingSubarea} 
        onOpenChange={(open) => !open && setDeletingSubarea(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subarea</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-500">
              Are you sure you want to delete this subarea? This will also delete all goals, milestones, and metrics within it. This action cannot be undone.
            </p>
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
    </div>
  );
} 