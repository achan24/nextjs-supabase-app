'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Target, Flag, Calendar } from 'lucide-react';
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
    addMetricThreshold,
    updateMetricThreshold,
    deleteMetricThreshold,
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
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');

  // Add state for metric threshold dialog
  const [isAddingMetricThreshold, setIsAddingMetricThreshold] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [newThresholdValue, setNewThresholdValue] = useState('');

  // Add state for milestone editing
  const [isEditingMilestone, setIsEditingMilestone] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<LifeGoalMilestone | null>(null);
  const [editMilestoneTitle, setEditMilestoneTitle] = useState('');
  const [editMilestoneDescription, setEditMilestoneDescription] = useState('');
  const [editMilestoneDueDate, setEditMilestoneDueDate] = useState('');

  // Add state for metric dialog
  const [isAddingMetric, setIsAddingMetric] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricType, setNewMetricType] = useState<'time' | 'count' | 'streak' | 'custom'>('count');
  const [newMetricUnit, setNewMetricUnit] = useState('');

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

  // Find the selected goal from areas
  const selectedGoal = useMemo(() => {
    if (!selectedGoalId) return null;
    return areas
      .flatMap(area => area.subareas)
      .flatMap(subarea => subarea.goals)
      .find(g => g.id === selectedGoalId);
  }, [areas, selectedGoalId]);

  const handleAddGoal = async () => {
    console.log('Adding goal for subarea:', selectedSubareaId);
    if (!selectedSubareaId || !newGoalTitle.trim()) {
      toast.error('Please select a subarea and enter a goal title');
      return;
    }

    try {
      await addGoal(selectedSubareaId, newGoalTitle, newGoalDescription);
      toast.success('Goal added successfully');
      setIsAddingGoal(false);
      setNewGoalTitle('');
      setNewGoalDescription('');
    } catch (err) {
      console.error('Error adding goal:', err);
      toast.error('Failed to add goal');
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
    console.log('Adding milestone for goal:', goalId);
    if (!goalId || !title.trim()) {
      toast.error('Please enter a milestone title');
      return;
    }

    try {
      await addMilestone(goalId, title, description, newMilestoneDueDate || undefined);
      toast.success('Milestone added successfully');
      setIsAddingMilestone(false);
      setSelectedGoalId(null);
      setNewMilestoneTitle('');
      setNewMilestoneDescription('');
      setNewMilestoneDueDate('');
    } catch (err) {
      console.error('Error adding milestone:', err);
      toast.error('Failed to add milestone');
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

  const handleAddMetricThreshold = async () => {
    if (!selectedMetricId || !selectedMilestoneId || !newThresholdValue.trim()) return;

    try {
      // Split by spaces and convert each part to a number
      const values = newThresholdValue.trim().split(/\s+/).map(Number);
      // Use the first value as the target value
      const targetValue = values[0] || 0;

      const metric = areas
        .flatMap(area => area.subareas)
        .flatMap(subarea => subarea.goals)
        .flatMap(goal => goal.metrics)
        .find(m => m.id === selectedMetricId);

      if (!metric) {
        throw new Error('Metric not found');
      }

      const now = new Date().toISOString();
      const updatedThresholds = [
        ...metric.thresholds,
        {
          id: Date.now().toString(), // Simple ID generation
          metric_id: selectedMetricId,
          milestone_id: selectedMilestoneId,
          target_value: targetValue,
          created_at: now,
          updated_at: now,
        },
      ];

      // Initialize current_value to 0 if not already set
      await updateMetric(selectedMetricId, { 
        thresholds: updatedThresholds,
        current_value: metric.current_value ?? 0
      });
      
      setIsAddingMetricThreshold(false);
      setSelectedMilestoneId(null);
      setSelectedMetricId(null);
      setNewThresholdValue('');
      toast.success('Metric threshold added successfully');
    } catch (err) {
      toast.error('Failed to add metric threshold');
      console.error('Error adding metric threshold:', err);
    }
  };

  const handleEditMilestone = async () => {
    if (!editingMilestone || !editMilestoneTitle.trim()) {
      toast.error('Please enter a milestone title');
      return;
    }

    try {
      await updateMilestone(editingMilestone.id, {
        title: editMilestoneTitle,
        description: editMilestoneDescription,
        due_date: editMilestoneDueDate || undefined,
      });
      toast.success('Milestone updated successfully');
      setIsEditingMilestone(false);
      setEditingMilestone(null);
      setEditMilestoneTitle('');
      setEditMilestoneDescription('');
      setEditMilestoneDueDate('');
    } catch (err) {
      console.error('Error updating milestone:', err);
      toast.error('Failed to update milestone');
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
        <div>
          <h2 className="text-2xl font-bold">Goals</h2>
          {selectedSubareaId && areas.map(area => 
            area.subareas
              .filter(subarea => subarea.id === selectedSubareaId)
              .map(subarea => (
                <p key={subarea.id} className="text-gray-600">
                  {area.name} &gt; {subarea.name}
                </p>
              ))
          )}
        </div>
        <div className="flex gap-2">
          {selectedSubareaId && (
            <Button
              variant="outline"
              onClick={() => {
                window.history.pushState({}, '', '/dashboard/goal');
                window.location.reload();
              }}
            >
              View All Goals
            </Button>
          )}
          <Button 
            onClick={() => setIsAddingGoal(true)} 
            disabled={!selectedSubareaId}
            title={!selectedSubareaId ? "Select a subarea in the Areas tab first" : "Add a new goal"}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Goal
          </Button>
        </div>
      </div>

      {!selectedSubareaId ? (
        // Show all goals grouped by area and subarea
        <div className="space-y-8">
          {areas.map(area => (
            <div key={area.id}>
              <h3 className="text-xl font-semibold mb-4">{area.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {area.subareas.map(subarea => (
                  <Card key={subarea.id}>
                    <CardHeader>
                      <CardTitle>{subarea.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {subarea.goals && subarea.goals.length > 0 ? (
                        <ul className="space-y-2">
                          {subarea.goals.map(goal => (
                            <li key={goal.id} className="flex justify-between items-start border-b pb-2 last:border-0">
                              <div>
                                <p className="font-medium">{goal.title}</p>
                                {goal.description && (
                                  <p className="text-sm text-gray-600">{goal.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <span>{goal.milestones?.length || 0} milestone{goal.milestones?.length !== 1 ? 's' : ''}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No goals yet</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Show goals for selected subarea
        <div className="space-y-4">
          {areas.map(area => 
            area.subareas
              .filter(subarea => subarea.id === selectedSubareaId)
              .map(subarea => (
                <div key={subarea.id} className="space-y-4">
                  {subarea.goals && subarea.goals.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {subarea.goals.map((goal) => (
                        <Card key={goal.id}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle>{goal.title}</CardTitle>
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
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="text-sm font-medium text-gray-500">Milestones</h4>
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
                              </div>
                              {goal.milestones && goal.milestones.length > 0 ? (
                                <ul className="space-y-2">
                                  {goal.milestones.map((milestone: LifeGoalMilestone) => (
                                    <li
                                      key={milestone.id}
                                      className="flex flex-col p-3 rounded-lg border"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className="font-medium">{milestone.title}</span>
                                          {milestone.description && (
                                            <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                                          )}
                                          {milestone.due_date && (
                                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                                              <Calendar className="w-3 h-3 mr-1" />
                                              Due: {new Date(milestone.due_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' })} 
                                              {" "}
                                              {(() => {
                                                const daysLeft = Math.ceil((new Date(milestone.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                                let colorClass = "text-green-600";
                                                if (daysLeft < 0) {
                                                  colorClass = "text-red-600";
                                                } else if (daysLeft <= 3) {
                                                  colorClass = "text-red-600";
                                                } else if (daysLeft <= 5) {
                                                  colorClass = "text-yellow-600";
                                                }
                                                return (
                                                  <span className={`ml-1 ${colorClass}`}>
                                                    ({daysLeft < 0 ? 'Overdue by ' + Math.abs(daysLeft) : daysLeft} {Math.abs(daysLeft) === 1 ? 'day' : 'days'} {daysLeft < 0 ? '' : 'left'})
                                                  </span>
                                                );
                                              })()}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setEditingMilestone(milestone);
                                              setEditMilestoneTitle(milestone.title);
                                              setEditMilestoneDescription(milestone.description || '');
                                              setEditMilestoneDueDate(milestone.due_date || '');
                                              setIsEditingMilestone(true);
                                            }}
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setSelectedMilestoneId(milestone.id);
                                              setIsAddingMetric(true);
                                            }}
                                          >
                                            <Plus className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteMilestone(milestone.id)}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      {/* Show associated metric thresholds */}
                                      <div className="mt-2 pl-4 border-l-2 border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">Target Metrics:</p>
                                        <ul className="space-y-1">
                                          {goal.metrics
                                            .filter((metric: LifeGoalMetric) => 
                                              metric.thresholds.some(t => t.milestone_id === milestone.id)
                                            )
                                            .map((metric: LifeGoalMetric) => {
                                              const threshold = metric.thresholds.find(t => t.milestone_id === milestone.id);
                                              return (
                                                <li key={metric.id} className="text-sm flex justify-between items-center">
                                                  <span>{metric.name}</span>
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-gray-600">
                                                      {metric.current_value}/{threshold?.target_value} {metric.unit || ''}
                                                    </span>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      onClick={() => {
                                                        setSelectedMetricId(metric.id);
                                                        setSelectedMilestoneId(milestone.id);
                                                        setIsAddingMetricThreshold(true);
                                                      }}
                                                    >
                                                      <Target className="w-3 h-3" />
                                                    </Button>
                                                  </div>
                                                </li>
                                              );
                                            })}
                                        </ul>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-500">No milestones yet</p>
                              )}

                              {/* Metrics Section */}
                              <div className="mt-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-sm font-medium text-gray-500">Metrics</h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedGoalId(goal.id);
                                      setIsAddingMetric(true);
                                    }}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Metric
                                  </Button>
                                </div>
                                {goal.metrics && goal.metrics.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    {goal.metrics.map((metric: LifeGoalMetric) => (
                                      <div key={metric.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <div>
                                          <div className="font-medium">{metric.name}</div>
                                          <div className="text-sm text-gray-500">
                                            {metric.current_value} {metric.unit || metric.type}
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setSelectedMetricId(metric.id);
                                              setIsAddingMetricThreshold(true);
                                            }}
                                          >
                                            <Target className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteMetric(metric.id)}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No goals yet</p>
                      <p className="text-sm text-gray-400 mt-1">Click "Add Goal" to get started</p>
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}

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
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddingGoal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddGoal}
              disabled={!newGoalTitle.trim()}
            >
              Add Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Milestone Dialog */}
      <Dialog open={isAddingMilestone} onOpenChange={setIsAddingMilestone}>
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
            <div className="space-y-2">
              <label htmlFor="dueDate" className="text-sm font-medium">
                Due Date (optional)
              </label>
              <Input
                id="dueDate"
                type="date"
                value={newMilestoneDueDate}
                onChange={(e) => setNewMilestoneDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddingMilestone(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleAddMilestone(selectedGoalId!, newMilestoneTitle, newMilestoneDescription)}
              disabled={!newMilestoneTitle.trim() || !selectedGoalId}
            >
              Add Milestone
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Milestone Dialog */}
      <Dialog open={isEditingMilestone} onOpenChange={setIsEditingMilestone}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="editTitle" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="editTitle"
                value={editMilestoneTitle}
                onChange={(e) => setEditMilestoneTitle(e.target.value)}
                placeholder="Enter milestone title"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editDescription" className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                id="editDescription"
                value={editMilestoneDescription}
                onChange={(e) => setEditMilestoneDescription(e.target.value)}
                placeholder="Enter milestone description"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editDueDate" className="text-sm font-medium">
                Due Date (optional)
              </label>
              <Input
                id="editDueDate"
                type="date"
                value={editMilestoneDueDate}
                onChange={(e) => setEditMilestoneDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditingMilestone(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditMilestone}
              disabled={!editMilestoneTitle.trim()}
            >
              Update Milestone
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Metric Threshold Dialog */}
      <Dialog 
        open={isAddingMetricThreshold} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingMetricThreshold(false);
            setSelectedMilestoneId(null);
            setSelectedMetricId(null);
            setNewThresholdValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Metric Target</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="metric" className="text-sm font-medium">
                Metric
              </label>
              <select
                id="metric"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={selectedMetricId || ''}
                onChange={(e) => setSelectedMetricId(e.target.value)}
              >
                <option value="">Select a metric</option>
                {areas
                  .flatMap(area => area.subareas)
                  .flatMap(subarea => subarea.goals)
                  .find(g => g.milestones.some(m => m.id === selectedMilestoneId))
                  ?.metrics.map((metric: LifeGoalMetric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.name} ({metric.unit || metric.type})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="threshold" className="text-sm font-medium">
                Target Value
              </label>
              <Input
                id="threshold"
                value={newThresholdValue}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numbers, spaces, and decimal points
                  if (/^[\d\s.]*$/.test(value)) {
                    setNewThresholdValue(value);
                  }
                }}
                placeholder="Enter target value"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingMetricThreshold(false);
                setSelectedMilestoneId(null);
                setSelectedMetricId(null);
                setNewThresholdValue('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMetricThreshold}
              disabled={!selectedMetricId || !newThresholdValue.trim()}
            >
              Add Target
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Metric Dialog */}
      <Dialog open={isAddingMetric} onOpenChange={setIsAddingMetric}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Metric Target</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Show existing metrics first */}
            {Array.isArray(selectedGoal?.metrics) && selectedGoal?.metrics?.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Use Existing Metric
                </label>
                <div className="space-y-2">
                  {selectedGoal?.metrics?.map((metric: LifeGoalMetric) => (
                    <div 
                      key={metric.id} 
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setSelectedMetricId(metric.id);
                        setNewMetricName(metric.name);
                        setNewMetricType(metric.type);
                        setNewMetricUnit(metric.unit || '');
                      }}
                    >
                      <div>
                        <div className="font-medium">{metric.name}</div>
                        <div className="text-sm text-gray-500">
                          {metric.current_value} {metric.unit || metric.type}
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${selectedMetricId === metric.id ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Create New Metric
              </label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={newMetricName}
                    onChange={(e) => {
                      setNewMetricName(e.target.value);
                      setSelectedMetricId(null); // Clear selection when typing new name
                    }}
                    placeholder="e.g., Tasks Completed"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="type" className="text-sm font-medium">
                    Type
                  </label>
                  <select
                    id="type"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={newMetricType}
                    onChange={(e) => {
                      setNewMetricType(e.target.value as 'time' | 'count' | 'streak' | 'custom');
                      setSelectedMetricId(null); // Clear selection when changing type
                    }}
                  >
                    <option value="count">Count</option>
                    <option value="time">Time</option>
                    <option value="streak">Streak</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="unit" className="text-sm font-medium">
                    Unit (optional)
                  </label>
                  <Input
                    id="unit"
                    value={newMetricUnit}
                    onChange={(e) => {
                      setNewMetricUnit(e.target.value);
                      setSelectedMetricId(null); // Clear selection when typing new unit
                    }}
                    placeholder="e.g., tasks, hours, points"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="target" className="text-sm font-medium">
                Target Value
              </label>
              <Input
                id="target"
                type="number"
                value={newThresholdValue}
                onChange={(e) => setNewThresholdValue(e.target.value)}
                placeholder="Enter target value"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setIsAddingMetric(false);
              setSelectedMetricId(null);
              setNewMetricName('');
              setNewMetricType('count');
              setNewMetricUnit('');
              setNewThresholdValue('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedMilestoneId) return;
                
                try {
                  let metricId = selectedMetricId;
                  
                  // If no existing metric selected, create a new one
                  if (!metricId) {
                    if (!newMetricName.trim()) {
                      toast.error('Please select a metric or enter a name for a new one');
                      return;
                    }
                    
                    const goal = areas
                      .flatMap(area => area.subareas)
                      .flatMap(subarea => subarea.goals)
                      .find(g => g.milestones.some(m => m.id === selectedMilestoneId));
                    
                    if (!goal) throw new Error('Goal not found');
                    
                    const metric = await addMetric(goal.id, newMetricName, newMetricType, newMetricUnit || undefined);
                    metricId = metric.id;
                  }
                  
                  if (!metricId) throw new Error('No metric ID available');
                  
                  // Set the threshold
                  const targetValue = parseFloat(newThresholdValue);
                  if (isNaN(targetValue)) throw new Error('Invalid target value');
                  
                  await addMetricThreshold(metricId, selectedMilestoneId, targetValue);
                  
                  setIsAddingMetric(false);
                  setSelectedMetricId(null);
                  setNewMetricName('');
                  setNewMetricType('count');
                  setNewMetricUnit('');
                  setNewThresholdValue('');
                  toast.success('Metric target set successfully');
                } catch (err) {
                  console.error('Error setting metric target:', err);
                  toast.error('Failed to set metric target');
                }
              }}
              disabled={!newThresholdValue.trim() || !selectedMilestoneId || (!selectedMetricId && !newMetricName.trim())}
            >
              Set Target
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 