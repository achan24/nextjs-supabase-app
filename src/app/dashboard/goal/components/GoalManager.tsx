'use client';

import { useState, useEffect } from 'react';
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
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface GoalManagerProps {
  selectedSubareaId: string | null;
  selectedGoalId: string | null;
}

export default function GoalManager({ selectedSubareaId, selectedGoalId }: GoalManagerProps) {
  const router = useRouter();
  
  console.log('GoalManager render, selectedSubareaId:', selectedSubareaId, 'selectedGoalId:', selectedGoalId);
  
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
  const [tempSelectedGoalId, setTempSelectedGoalId] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');

  // Add state for milestone dialog
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
  const [isCreatingMetric, setIsCreatingMetric] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricType, setNewMetricType] = useState<'time' | 'count' | 'streak' | 'custom'>('count');
  const [newMetricUnit, setNewMetricUnit] = useState('');
  const [newMetricTarget, setNewMetricTarget] = useState('');

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

  // Find the selected goal if any
  const selectedGoal = selectedGoalId ? 
    areas.flatMap(area => 
      area.subareas.flatMap(subarea => 
        subarea.goals
      )
    ).find(goal => goal.id === selectedGoalId) : null;

  // Find the goal's area and subarea
  const goalContext = selectedGoal ? 
    areas.flatMap(area => 
      area.subareas.map(subarea => ({
        area,
        subarea,
        goal: subarea.goals.find(g => g.id === selectedGoal.id)
      }))
    ).find(ctx => ctx.goal) : null;

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

  const handleAddMilestone = async () => {
    const goalId = selectedGoal?.id || tempSelectedGoalId;
    if (!goalId || !newMilestoneTitle) return;

    try {
      const milestone = await addMilestone(
        goalId,
        newMilestoneTitle,
        newMilestoneDescription,
        newMilestoneDueDate || undefined
      );

      // If we're creating a new metric with this milestone
      if (isCreatingMetric && newMetricName && newMetricTarget) {
        const metric = await addMetric(
          goalId,
          newMetricName,
          newMetricType,
          newMetricUnit
        );
        
        await addMetricThreshold(metric.id, milestone.id, parseFloat(newMetricTarget));
      }

      setNewMilestoneTitle('');
      setNewMilestoneDescription('');
      setNewMilestoneDueDate('');
      setIsCreatingMetric(false);
      setNewMetricName('');
      setNewMetricType('count');
      setNewMetricUnit('');
      setNewMetricTarget('');
      setIsAddingMilestone(false);
      setTempSelectedGoalId(null);
      toast.success('Milestone added successfully');
    } catch (error) {
      console.error('Error adding milestone:', error);
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

  const handleEditMilestone = async () => {
    if (!editingMilestone || !editMilestoneTitle.trim()) return;

    try {
      await updateMilestone(editingMilestone.id, {
        title: editMilestoneTitle,
        description: editMilestoneDescription,
        due_date: editMilestoneDueDate || undefined,
      });
      setIsEditingMilestone(false);
      setEditingMilestone(null);
      setEditMilestoneTitle('');
      setEditMilestoneDescription('');
      setEditMilestoneDueDate('');
      toast.success('Milestone updated successfully');
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast.error('Failed to update milestone');
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
      const targetValue = parseFloat(newThresholdValue);
      if (isNaN(targetValue)) {
        throw new Error('Invalid target value');
      }

      await addMetricThreshold(selectedMetricId, selectedMilestoneId, targetValue);
      
      setIsAddingMetricThreshold(false);
      setSelectedMilestoneId(null);
      setSelectedMetricId(null);
      setNewThresholdValue('');
      toast.success('Metric target added successfully');
    } catch (err) {
      toast.error('Failed to add metric target');
      console.error('Error adding metric target:', err);
    }
  };

  const navigateToGoal = (goalId: string) => {
    router.push(`/dashboard/goal?subarea=${selectedSubareaId}&goal=${goalId}`);
  };

  const navigateBack = () => {
    router.push(selectedSubareaId ? `/dashboard/goal?subarea=${selectedSubareaId}` : '/dashboard/goal');
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
        <div className="flex flex-col gap-1">
          {selectedGoal && goalContext ? (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Link href="/dashboard/goal" className="hover:text-blue-600">
                  {goalContext.area.name}
                </Link>
                <span>›</span>
                <Link 
                  href={`/dashboard/goal?subarea=${goalContext.subarea.id}`}
                  className="hover:text-blue-600"
                >
                  {goalContext.subarea.name}
                </Link>
                <span>›</span>
                <span className="text-gray-900 font-medium">{selectedGoal.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/dashboard/goal?subarea=${goalContext.subarea.id}`)}
                  size="sm"
                  className="text-blue-600 hover:text-blue-800 -ml-2"
                >
                  Show all goals in {goalContext.subarea.name}
                </Button>
              </div>
            </>
          ) : (
            <h2 className="text-2xl font-bold">
              {selectedSubareaId ? 
                areas.flatMap(area => 
                  area.subareas
                    .filter(subarea => subarea.id === selectedSubareaId)
                    .map(subarea => (
                      <div key={subarea.id} className="flex items-center gap-2">
                        <Link href="/dashboard/goal" className="text-gray-600 hover:text-blue-600 text-lg">
                          {area.name}
                        </Link>
                        <span className="text-gray-600">›</span>
                        <Link 
                          href={`/dashboard/goal?subarea=${subarea.id}`}
                          className="text-lg hover:text-blue-600"
                        >
                          {subarea.name}
                        </Link>
                      </div>
                    ))
                ) : 'Goals'
              }
            </h2>
          )}
        </div>
        <div className="flex gap-2">
          {!selectedGoal && (
            <>
              {selectedSubareaId && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/goal')}
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
            </>
          )}
        </div>
      </div>

      {selectedGoal ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{selectedGoal.title}</CardTitle>
                {selectedGoal.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedGoal.description}
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
                  onClick={() => handleDeleteGoal(selectedGoal.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Milestones Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Milestones</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingMilestone(true);
                    }}
                  >
                    Add Milestone
                  </Button>
                </div>
                {selectedGoal.milestones && selectedGoal.milestones.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedGoal.milestones.map((milestone: LifeGoalMilestone) => (
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
                                Due: {new Date(milestone.due_date).toLocaleDateString()}
                              </p>
                            )}
                            {/* Add metric thresholds display */}
                            {selectedGoal.metrics.flatMap(metric => 
                              metric.thresholds
                                .filter(threshold => threshold.milestone_id === milestone.id)
                                .map(threshold => (
                                  <p key={threshold.id} className="text-xs text-gray-500 mt-1 flex items-center">
                                    <Target className="w-3 h-3 mr-1" />
                                    {metric.name}: {threshold.target_value} {metric.unit}
                                    {metric.current_value > 0 && ` (Current: ${metric.current_value})`}
                                  </p>
                                ))
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
                                setIsAddingMetricThreshold(true);
                              }}
                            >
                              <Target className="w-3 h-3" />
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
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No milestones yet</p>
                )}
              </div>

              {/* Metrics Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Metrics</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingMetricThreshold(true);
                    }}
                  >
                    Add Metric
                  </Button>
                </div>
                {selectedGoal.metrics && selectedGoal.metrics.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedGoal.metrics.map((metric: LifeGoalMetric) => (
                      <li key={metric.id} className="flex justify-between items-center p-3 rounded-lg border">
                        <div>
                          <span className="font-medium">{metric.name}</span>
                          <p className="text-sm text-gray-600">
                            Current: {metric.current_value} {metric.unit}
                          </p>
                        </div>
                        <div className="flex gap-2">
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
                  <p className="text-sm text-gray-500">No metrics yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {!selectedSubareaId && (
            <div className="space-y-8">
              {areas.map(area => (
                <div key={area.id}>
                  <h3 className="text-xl font-semibold mb-4">{area.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {area.subareas.map(subarea => (
                      <Link 
                        key={subarea.id}
                        href={`/dashboard/goal?subarea=${subarea.id}`}
                        className="block no-underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/goal?subarea=${subarea.id}`);
                        }}
                      >
                        <Card className="transition-colors hover:border-blue-600">
                          <CardHeader>
                            <CardTitle className="transition-colors hover:text-blue-600">{subarea.name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {subarea.goals && subarea.goals.length > 0 ? (
                              <ul className="space-y-2">
                                {subarea.goals.map((goal: LifeGoal) => (
                                  <li 
                                    key={goal.id} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/dashboard/goal?goal=${goal.id}`);
                                    }}
                                    className="flex justify-between items-start border-b pb-2 last:border-0 cursor-pointer hover:bg-gray-50 rounded p-2 -mx-2"
                                  >
                                    <div>
                                      <span className="font-medium">{goal.title}</span>
                                      {goal.description && (
                                        <p className="text-sm text-gray-600">{goal.description}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <Target className="w-3 h-3" />
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
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedSubareaId && (
            <div className="space-y-4">
              {areas.map(area => 
                area.subareas
                  .filter(subarea => subarea.id === selectedSubareaId)
                  .map(subarea => (
                    <div key={subarea.id} className="space-y-4">
                      {subarea.goals && subarea.goals.length > 0 ? (
                        <div className="space-y-6">
                          {subarea.goals.map((goal: LifeGoal) => (
                            <div 
                              key={goal.id} 
                              className="flex flex-col p-6 rounded-lg border group relative cursor-pointer hover:border-blue-600 transition-colors"
                              onClick={() => router.push(`/dashboard/goal?goal=${goal.id}`)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-grow">
                                  <h3 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">{goal.title}</h3>
                                  {goal.description && (
                                    <p className="text-gray-600 mt-1">{goal.description}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteGoal(goal.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Milestones Section */}
                              <div className="mt-4">
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-sm font-medium text-gray-500">Milestones</h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTempSelectedGoalId(goal.id);
                                      setIsAddingMilestone(true);
                                    }}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Milestone
                                  </Button>
                                </div>
                                {goal.milestones && goal.milestones.length > 0 ? (
                                  <div className="space-y-2">
                                    {goal.milestones.map((milestone) => (
                                      <div 
                                        key={milestone.id} 
                                        className={`flex items-start gap-3 p-3 rounded-lg border ${milestone.completed ? 'bg-green-50 border-green-100' : 'bg-white'}`}
                                      >
                                        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${milestone.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        <div className="flex-grow">
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <span className="font-medium">{milestone.title}</span>
                                              {milestone.description && (
                                                <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                                              )}
                                              {milestone.due_date && (
                                                <p className="text-xs text-gray-500 mt-1 flex items-center">
                                                  <Calendar className="w-3 h-3 mr-1" />
                                                  Due: {new Date(milestone.due_date).toLocaleDateString()}
                                                </p>
                                              )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => {
                                                  e.stopPropagation();
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
                                                className="h-6 w-6"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteMilestone(milestone.id);
                                                }}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                          {/* Display metric thresholds */}
                                          {goal.metrics?.flatMap(metric => 
                                            metric.thresholds
                                              .filter(threshold => threshold.milestone_id === milestone.id)
                                              .map(threshold => (
                                                <div key={threshold.id} className="mt-2 flex items-center gap-2 text-sm">
                                                  <Target className="w-3 h-3 text-gray-500" />
                                                  <span className="text-gray-600">
                                                    {metric.name}: {threshold.target_value} {metric.unit}
                                                    {metric.current_value > 0 && ` (Current: ${metric.current_value})`}
                                                  </span>
                                                </div>
                                              ))
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 text-center py-2">No milestones yet</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No goals yet</p>
                          <Button
                            onClick={() => setIsAddingGoal(true)}
                            className="mt-2"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your First Goal
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}
        </>
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

            {/* Metric Creation Section */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">
                  Add Metric Target
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreatingMetric(!isCreatingMetric)}
                >
                  {isCreatingMetric ? "Cancel" : "Create New Metric"}
                </Button>
              </div>

              {isCreatingMetric && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label htmlFor="metricName" className="text-sm font-medium">
                      Metric Name
                    </label>
                    <Input
                      id="metricName"
                      value={newMetricName}
                      onChange={(e) => setNewMetricName(e.target.value)}
                      placeholder="e.g., Weight, Distance, Time"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="metricType" className="text-sm font-medium">
                      Type
                    </label>
                    <select
                      id="metricType"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={newMetricType}
                      onChange={(e) => setNewMetricType(e.target.value as 'time' | 'count' | 'streak' | 'custom')}
                    >
                      <option value="count">Count</option>
                      <option value="time">Time</option>
                      <option value="streak">Streak</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="metricUnit" className="text-sm font-medium">
                      Unit (optional)
                    </label>
                    <Input
                      id="metricUnit"
                      value={newMetricUnit}
                      onChange={(e) => setNewMetricUnit(e.target.value)}
                      placeholder="e.g., kg, km, minutes"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="metricTarget" className="text-sm font-medium">
                      Target Value
                    </label>
                    <Input
                      id="metricTarget"
                      type="number"
                      value={newMetricTarget}
                      onChange={(e) => setNewMetricTarget(e.target.value)}
                      placeholder="Enter target value"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setIsAddingMilestone(false);
              setIsCreatingMetric(false);
              setNewMetricName('');
              setNewMetricType('count');
              setNewMetricUnit('');
              setNewMetricTarget('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMilestone}
              disabled={!newMilestoneTitle.trim() || (isCreatingMetric && (!newMetricName.trim() || !newMetricTarget))}
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

      {/* Add Metric Target Dialog */}
      <Dialog 
        open={isAddingMetricThreshold} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingMetricThreshold(false);
            setSelectedMilestoneId(null);
            setSelectedMetricId(null);
            setNewThresholdValue('');
            setIsCreatingMetric(false);
            setNewMetricName('');
            setNewMetricType('count');
            setNewMetricUnit('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Metric Target</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">
                Select or Create Metric
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingMetric(!isCreatingMetric)}
              >
                {isCreatingMetric ? "Select Existing" : "Create New"}
              </Button>
            </div>

            {isCreatingMetric ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="metricName" className="text-sm font-medium">
                    Metric Name
                  </label>
                  <Input
                    id="metricName"
                    value={newMetricName}
                    onChange={(e) => setNewMetricName(e.target.value)}
                    placeholder="e.g., Weight, Distance, Time"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="metricType" className="text-sm font-medium">
                    Type
                  </label>
                  <select
                    id="metricType"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={newMetricType}
                    onChange={(e) => setNewMetricType(e.target.value as 'time' | 'count' | 'streak' | 'custom')}
                  >
                    <option value="count">Count</option>
                    <option value="time">Time</option>
                    <option value="streak">Streak</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="metricUnit" className="text-sm font-medium">
                    Unit (optional)
                  </label>
                  <Input
                    id="metricUnit"
                    value={newMetricUnit}
                    onChange={(e) => setNewMetricUnit(e.target.value)}
                    placeholder="e.g., kg, km, minutes"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newThresholdValue" className="text-sm font-medium">
                    Target Value
                  </label>
                  <Input
                    id="newThresholdValue"
                    type="number"
                    value={newThresholdValue}
                    onChange={(e) => setNewThresholdValue(e.target.value)}
                    placeholder="Enter target value"
                  />
                </div>
              </div>
            ) : (
              <>
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
                    {selectedGoal?.metrics.map((metric: LifeGoalMetric) => (
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
                    type="number"
                    value={newThresholdValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numbers and decimal points
                      if (/^[\d.]*$/.test(value)) {
                        setNewThresholdValue(value);
                      }
                    }}
                    placeholder="Enter target value"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingMetricThreshold(false);
                setSelectedMilestoneId(null);
                setSelectedMetricId(null);
                setNewThresholdValue('');
                setIsCreatingMetric(false);
                setNewMetricName('');
                setNewMetricType('count');
                setNewMetricUnit('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (isCreatingMetric) {
                  if (!selectedGoal?.id || !newMetricName || !newThresholdValue) return;
                  
                  try {
                    const metric = await addMetric(
                      selectedGoal.id,
                      newMetricName,
                      newMetricType,
                      newMetricUnit
                    );
                    
                    await addMetricThreshold(metric.id, selectedMilestoneId!, parseFloat(newThresholdValue));
                    
                    setIsAddingMetricThreshold(false);
                    setSelectedMilestoneId(null);
                    setSelectedMetricId(null);
                    setNewThresholdValue('');
                    setIsCreatingMetric(false);
                    setNewMetricName('');
                    setNewMetricType('count');
                    setNewMetricUnit('');
                    toast.success('Metric and target added successfully');
                  } catch (err) {
                    console.error('Error adding metric and target:', err);
                    toast.error('Failed to add metric and target');
                  }
                } else {
                  handleAddMetricThreshold();
                }
              }}
              disabled={
                isCreatingMetric
                  ? !newMetricName.trim() || !newThresholdValue.trim()
                  : !selectedMetricId || !newThresholdValue.trim()
              }
            >
              Add Target
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 