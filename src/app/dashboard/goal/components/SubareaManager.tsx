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
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubareaManager() {
  const router = useRouter();
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
    <div className="space-y-8">
      {areas.map(area => (
        <div key={area.id} className="mb-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {subarea.goals && subarea.goals.length > 0 ? (
                    <div className="space-y-3">
                      {subarea.goals.map(goal => (
                        <div 
                          key={goal.id} 
                          className="flex justify-between items-start border-b pb-2 last:border-0"
                        >
                          <div className="flex-1">
                            <Link 
                              href={`/dashboard/goal?subarea=${subarea.id}&goal=${goal.id}`}
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
                  ) : (
                    <p className="text-sm text-gray-500">No goals yet</p>
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
    </div>
  );
} 