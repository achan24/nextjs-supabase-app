'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Target, Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useGoalSystem } from '@/hooks/useGoalSystem';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { LifeGoal, LifeGoalMilestone, LifeGoalMetric } from '@/types/goal';

interface GoalManagerProps {
  selectedSubareaId: string | null;
}

export default function GoalManager({ selectedSubareaId }: GoalManagerProps) {
  console.log('GoalManager render, selectedSubareaId:', selectedSubareaId);
  
  const {
    areas,
    loading,
    error,
    addGoal,
    updateGoal,
    deleteGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addMetric,
    updateMetric,
    deleteMetric,
  } = useGoalSystem();

  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');

  // Add state for milestone dialog
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');

  // Find the area that contains the selected subarea
  useEffect(() => {
    if (selectedSubareaId) {
      console.log('Looking for area containing subarea:', selectedSubareaId);
      const area = areas.find(area => 
        area.subareas.some(subarea => subarea.id === selectedSubareaId)
      );
      if (area) {
        console.log('Found area:', area.id);
        setSelectedAreaId(area.id);
      }
    }
  }, [selectedSubareaId, areas]);

  const handleAddGoal = async () => {
    if (!selectedSubareaId || !newGoalTitle.trim()) return;

    try {
      await addGoal(selectedSubareaId, newGoalTitle, newGoalDescription);
      setIsAddingGoal(false);
      setNewGoalTitle('');
      setNewGoalDescription('');
      setSelectedAreaId(null);
    } catch (err) {
      console.error('Error adding goal:', err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteGoal(id);
      toast.success('Goal deleted successfully');
    } catch (err) {
      toast.error('Failed to delete goal');
      console.error(err);
    }
  };

  const handleAddMilestone = async (goalId: string, title: string, description?: string) => {
    try {
      await addMilestone(goalId, title, description);
      toast.success('Milestone added successfully');
    } catch (err) {
      toast.error('Failed to add milestone');
      console.error(err);
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    try {
      await deleteMilestone(id);
      toast.success('Milestone deleted successfully');
    } catch (err) {
      toast.error('Failed to delete milestone');
      console.error(err);
    }
  };

  const handleAddMetric = async (goalId: string, name: string, type: string, unit?: string) => {
    try {
      await addMetric(goalId, name, type, unit);
      toast.success('Metric added successfully');
    } catch (err) {
      toast.error('Failed to add metric');
      console.error(err);
    }
  };

  const handleDeleteMetric = async (id: string) => {
    try {
      await deleteMetric(id);
      toast.success('Metric deleted successfully');
    } catch (err) {
      toast.error('Failed to delete metric');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        <p>Error loading goals: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Goals</h2>
        <Button onClick={() => setIsAddingGoal(true)} disabled={!selectedSubareaId}>
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map((area) => (
          <div key={area.id} className="space-y-4">
            <h3 className="text-lg font-semibold">{area.name}</h3>
            {area.subareas.map((subarea) => (
              <Card 
                key={subarea.id}
                className={`${subarea.id === selectedSubareaId ? 'ring-2 ring-primary' : ''}`}
              >
                <CardHeader>
                  <CardTitle>{subarea.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {subarea.goals && subarea.goals.length > 0 ? (
                    <ul className="space-y-4">
                      {subarea.goals.map((goal) => {
                        console.log('Rendering goal:', { id: goal.id, title: goal.title });
                        return (
                          <li key={goal.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{goal.title}</h4>
                                {goal.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {goal.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteGoal(goal.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="mt-4 space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Milestones</span>
                                <Dialog open={isAddingMilestone && selectedGoalId === goal.id} onOpenChange={(open) => {
                                  if (!open) {
                                    setIsAddingMilestone(false);
                                    setSelectedGoalId(null);
                                    setNewMilestoneTitle('');
                                    setNewMilestoneDescription('');
                                  }
                                }}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        setSelectedGoalId(goal.id);
                                        setIsAddingMilestone(true);
                                      }}
                                    >
                                      <Flag className="w-3 h-3 mr-1" />
                                      Add Milestone
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Add Milestone</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <label htmlFor="title" className="text-sm font-medium">
                                          Title
                                        </label>
                                        <Input
                                          id="title"
                                          value={newMilestoneTitle}
                                          onChange={(e) => setNewMilestoneTitle(e.target.value)}
                                          placeholder="Enter milestone title"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <label htmlFor="description" className="text-sm font-medium">
                                          Description (optional)
                                        </label>
                                        <Textarea
                                          id="description"
                                          value={newMilestoneDescription}
                                          onChange={(e) => setNewMilestoneDescription(e.target.value)}
                                          placeholder="Enter milestone description"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setIsAddingMilestone(false);
                                          setSelectedGoalId(null);
                                          setNewMilestoneTitle('');
                                          setNewMilestoneDescription('');
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={async () => {
                                          if (!selectedGoalId || !newMilestoneTitle.trim()) return;
                                          try {
                                            await handleAddMilestone(selectedGoalId, newMilestoneTitle, newMilestoneDescription);
                                            setIsAddingMilestone(false);
                                            setSelectedGoalId(null);
                                            setNewMilestoneTitle('');
                                            setNewMilestoneDescription('');
                                          } catch (err) {
                                            console.error('Error adding milestone:', err);
                                          }
                                        }}
                                      >
                                        Add Milestone
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                              {goal.milestones && goal.milestones.length > 0 ? (
                                <ul className="space-y-1">
                                  {goal.milestones.map((milestone) => (
                                    <li
                                      key={milestone.id}
                                      className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50"
                                    >
                                      <span>{milestone.title}</span>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteMilestone(milestone.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-500">No milestones yet</p>
                              )}
                            </div>

                            <div className="mt-4 space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Metrics</span>
                                <Button variant="outline" size="sm">
                                  <Target className="w-3 h-3 mr-1" />
                                  Add Metric
                                </Button>
                              </div>
                              {goal.metrics && goal.metrics.length > 0 ? (
                                <ul className="space-y-1">
                                  {goal.metrics.map((metric) => (
                                    <li
                                      key={metric.id}
                                      className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50"
                                    >
                                      <div>
                                        <span>{metric.name}</span>
                                        <span className="text-sm text-gray-500 ml-2">
                                          {metric.current_value}
                                          {metric.unit && ` ${metric.unit}`}
                                        </span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon">
                                          <Edit2 className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteMetric(metric.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-500 italic">
                                  No metrics yet
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">No goals yet</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="e.g., Run a Marathon"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                placeholder="Describe your goal..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="area" className="text-sm font-medium">
                Area
              </label>
              <select
                id="area"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={selectedAreaId || ''}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value || null);
                }}
              >
                <option value="">Select an area</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedAreaId && (
              <div className="space-y-2">
                <label htmlFor="subarea" className="text-sm font-medium">
                  Subarea
                </label>
                <select
                  id="subarea"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={selectedSubareaId || ''}
                  onChange={(e) => {
                    // This is a placeholder change handler. The selectedSubareaId is now a prop.
                  }}
                >
                  <option value="">Select a subarea</option>
                  {areas
                    .find((area) => area.id === selectedAreaId)
                    ?.subareas.map((subarea) => (
                      <option key={subarea.id} value={subarea.id}>
                        {subarea.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddingGoal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddGoal}
              disabled={!newGoalTitle.trim() || !selectedAreaId || !selectedSubareaId}
            >
              Add Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 