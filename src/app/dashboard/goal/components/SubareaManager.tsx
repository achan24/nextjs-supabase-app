'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';
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
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Subareas</h2>
      </div>

      <div className="space-y-6">
        {areas.map((area) => (
          <div key={area.id} className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{area.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingSubarea(area.id)}
                  className="h-7 px-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Subarea
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
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
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {subarea.goals?.length || 0} goal{subarea.goals?.length !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">View All Goals</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                      {subarea.goals && subarea.goals.length > 0 && (
                        <div className="border-t pt-4 space-y-2">
                          {subarea.goals.map(goal => (
                            <div key={goal.id} className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{goal.title}</p>
                                {goal.description && (
                                  <p className="text-sm text-gray-600">{goal.description}</p>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {goal.milestones?.length || 0} milestone{goal.milestones?.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {area.subareas.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No subareas yet. Click "Add Subarea" to get started.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

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
    </div>
  );
} 