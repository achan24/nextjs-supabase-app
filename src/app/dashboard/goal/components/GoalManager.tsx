'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Target, Flag, Calendar, Link as LinkIcon, ChevronDown, ChevronRight, CheckCircle2, Timer, X, Share2, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useGoalSystem } from '@/hooks/useGoalSystem';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { LifeGoal, LifeGoalMilestone, LifeGoalMetric, LifeGoalTask, Note, TimerSequence } from '@/types/goal';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { NoteLinkButton } from '@/components/ui/note-link-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ProcessFlowLinkButton } from '@/components/ui/process-flow-link-button';
import StarButton from '@/components/StarButton';
import TaskCreator from '@/components/TaskCreator';

interface GoalManagerProps {
  selectedSubareaId: string | null;
  selectedGoalId: string | null;
}

interface MetricData {
  id: string;
  name: string;
  unit?: string;
}

interface TaskContribution {
  id: string;
  metric_id: string;
  contribution_value: number;
  metric?: MetricData;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  is_starred_for_today?: boolean;
  starred_at?: string | null;
  metric_contributions?: TaskContribution[];
}

interface TaskWithContributions {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  life_goal_task_contributions?: {
    id: string;
    metric_id: string;
    contribution_value: number;
    metric: MetricData;
  }[];
}

interface SupabaseTaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  is_starred_for_today: boolean | null;
  starred_at: string | null;
  life_goal_task_contributions: Array<{
    id: string;
    metric_id: string;
    contribution_value: string | number;
    metric: {
      id: string;
      name: string;
      unit: string | null;
    } | null;
  }> | null;
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
    linkNoteToGoal,
    unlinkNoteFromGoal,
    updateNoteLinkOrder,
    addTaskToGoal,
    removeTaskFromGoal,
    addSequenceContribution,
    removeSequenceContribution,
    unlinkProcessFlow,
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

  const [isLinkingNote, setIsLinkingNote] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [showFullContent, setShowFullContent] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalDescription, setEditGoalDescription] = useState('');
  const [editGoalPriority, setEditGoalPriority] = useState<number>(3);
  const supabase = createClient();
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // Memoize area and subarea lookups
  const currentArea = useMemo(() => 
    areas.find(area => area.subareas.some(sub => sub.id === selectedSubareaId)),
    [areas, selectedSubareaId]
  );

  const currentSubarea = useMemo(() => 
    areas.flatMap(a => a.subareas).find(sub => sub.id === selectedSubareaId),
    [areas, selectedSubareaId]
  );

  // Add state for task dialog
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskTimeWorth, setSelectedTaskTimeWorth] = useState<number>(1);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Add state for sequence dialog
  const [isAddingSequence, setIsAddingSequence] = useState(false);
  const [sequences, setSequences] = useState<TimerSequence[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [sequenceContributionValue, setSequenceContributionValue] = useState<number>(1);

  // Add state for task-metric linking
  const [isLinkingTaskToMetric, setIsLinkingTaskToMetric] = useState(false);
  const [selectedTaskForMetric, setSelectedTaskForMetric] = useState<string | null>(null);
  const [selectedMetricForTask, setSelectedMetricForTask] = useState<string | null>(null);
  const [taskContributionValue, setTaskContributionValue] = useState(1);

  // Add state for process flow linking
  const [isLinkingFlow, setIsLinkingFlow] = useState(false);

  // Add state for daily points
  const [dailyPoints, setDailyPoints] = useState<number>(0)

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

  // Listen for task starring events and refresh data
  useEffect(() => {
    const handleTaskStarred = () => {
      console.log('[GoalManager] Task starred event received, refreshing tasks...')
      fetchTasks()
    }

    window.addEventListener('task-starred', handleTaskStarred)
    return () => window.removeEventListener('task-starred', handleTaskStarred)
  }, [])

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

  const handleCompleteMilestone = async (milestone: LifeGoalMilestone) => {
    try {
      const now = new Date().toISOString();
      await updateMilestone(milestone.id, {
        completed: !milestone.completed,
        completed_at: !milestone.completed ? now : undefined,
      });

      // Find the goal this milestone belongs to
      const goal = areas
        .flatMap(area => area.subareas)
        .flatMap(subarea => subarea.goals)
        .find(g => g.milestones.some(m => m.id === milestone.id));

      if (!milestone.completed) {
        toast.success(
          `🎉 Congratulations on completing ${milestone.title}! You are one step closer to ${goal?.title}${goal?.description ? ` and ${goal.description}` : ''}!`,
          {
            duration: Infinity,
            dismissible: true,
          }
        );
      } else {
        toast.info(`Milestone ${milestone.title} unmarked as complete`, {
          duration: Infinity,
          dismissible: true,
        });
      }
    } catch (error) {
      console.error('Error updating milestone completion:', error);
      toast.error('Failed to update milestone completion status');
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

  const handleLinkNote = async (goalId: string) => {
    if (!selectedNoteId) return;

    try {
      await linkNoteToGoal(goalId, selectedNoteId);
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
      await unlinkNoteFromGoal(linkId);
      toast.success('Note unlinked successfully');
    } catch (error) {
      console.error('Error unlinking note:', error);
      toast.error('Failed to unlink note');
    }
  };

  const handleNoteReorder = async (result: any, goalId: string) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const goal = areas
      .flatMap(area => area.subareas)
      .flatMap(subarea => subarea.goals)
      .find(g => g.id === goalId);
    if (!goal) return;

    const newNotes = Array.from(goal.goal_notes);
    const [removed] = newNotes.splice(source.index, 1);
    newNotes.splice(destination.index, 0, removed);

    // Update the display order in the database
    try {
      await Promise.all(
        newNotes.map((note, index) =>
          updateNoteLinkOrder('goal', note.id, index)
        )
      );
    } catch (error) {
      console.error('Error updating note order:', error);
      toast.error('Failed to update note order');
    }
  };

  // Only fetch tasks when we need them
  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          due_date,
          is_starred_for_today,
          starred_at,
          life_goal_task_contributions!left (
            id,
            metric_id,
            contribution_value,
            metric:life_goal_metrics!left (
              id,
              name,
              unit
            )
          )
        `)
        .returns<SupabaseTaskResponse[]>();

      if (error) throw error;

      // Transform the tasks data to include metric contributions
      const transformedTasks = (data || []).map((task: SupabaseTaskResponse): Task => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        status: task.status,
        due_date: task.due_date || undefined,
        is_starred_for_today: task.is_starred_for_today || false,
        starred_at: task.starred_at || null,
        metric_contributions: task.life_goal_task_contributions?.map(contrib => ({
          id: contrib.id,
          metric_id: contrib.metric_id,
          contribution_value: Number(contrib.contribution_value),
          metric: contrib.metric ? {
            id: contrib.metric.id,
            name: contrib.metric.name,
            unit: contrib.metric.unit || undefined
          } : undefined
        })) || []
      }));

      setTasks(transformedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
    }
  };

  // Fetch tasks when component mounts and when selectedGoal changes
  useEffect(() => {
    if (selectedGoal) {
      fetchTasks();
    }
  }, [selectedGoal]);

  // Also fetch tasks when opening the task dialog
  useEffect(() => {
    if (isAddingTask) {
      fetchTasks();
    }
  }, [isAddingTask]);

  const handleAddTaskToGoal = async (goalId: string) => {
    if (!selectedTaskId) return;

    try {
      await addTaskToGoal(goalId, selectedTaskId, selectedTaskTimeWorth);
      await fetchTasks(); // Fetch tasks after adding
      setIsAddingTask(false);
      setSelectedTaskId(null);
      setSelectedTaskTimeWorth(1);
      toast.success('Task added to goal');
    } catch (error) {
      console.error('Error adding task to goal:', error);
      toast.error('Failed to add task to goal');
    }
  };

  const handleRemoveTaskFromGoal = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to remove this task from the goal?')) return;
    try {
      await removeTaskFromGoal(taskId);
      await fetchTasks(); // Fetch tasks after removing
      toast.success('Task removed from goal');
    } catch (error) {
      console.error('Error removing task from goal:', error);
      toast.error('Failed to remove task from goal');
    }
  };

  const handleCompleteTask = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks(); // Refresh tasks after update

      // Find the task to get its name
      const task = tasks.find(t => t.id === taskId);
      if (newStatus === 'completed') {
        toast.success(`Good job completing "${task?.title}"! 🎉\nOne step closer to ${selectedGoal?.title}`);
      } else {
        toast.success(`Task "${task?.title}" reopened`);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleCreateAndAddTask = async () => {
    try {
      // First create the task
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: newTaskTitle,
          description: newTaskDescription,
          due_date: newTaskDueDate || null,
          status: 'todo'
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Then link it to the goal
      if (selectedGoal && newTask) {
        await addTaskToGoal(selectedGoal.id, newTask.id, selectedTaskTimeWorth);
      }

      await fetchTasks(); // Fetch tasks after creating and adding
      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setIsAddingTask(false);
      toast.success('Task created and added to goal');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  // Fetch available sequences when needed
  const fetchSequences = async () => {
    try {
      const { data: sequences, error } = await supabase
        .from('timer_sequences')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sequences:', error);
        return;
      }

      setSequences(sequences || []);
    } catch (error) {
      console.error('Error in fetchSequences:', error);
    }
  };

  // Fetch sequences when opening the sequence dialog
  useEffect(() => {
    if (isAddingSequence) {
      fetchSequences();
    }
  }, [isAddingSequence]);

  const handleAddSequenceToGoal = async () => {
    if (!selectedSequenceId || !selectedMetricId) return;

    try {
      await addSequenceContribution(
        selectedMetricId,
        selectedSequenceId,
        sequenceContributionValue
      );
      setIsAddingSequence(false);
      setSelectedSequenceId(null);
      setSelectedMetricId(null);
      setSequenceContributionValue(1);
      toast.success('Sequence linked to goal successfully');
    } catch (error) {
      console.error('Error linking sequence to goal:', error);
      toast.error('Failed to link sequence to goal');
    }
  };

  const handleRemoveSequenceFromGoal = async (contributionId: string) => {
    try {
      await removeSequenceContribution(contributionId);
      toast.success('Sequence removed from goal');
    } catch (error) {
      console.error('Error removing sequence from goal:', error);
      toast.error('Failed to remove sequence from goal');
    }
  };

  const handleLinkTaskToMetric = async () => {
    if (!selectedTaskForMetric || !selectedMetricForTask) return;

    try {
      const { error } = await supabase
        .from('life_goal_task_contributions')
        .insert({
          task_id: selectedTaskForMetric,
          metric_id: selectedMetricForTask,
          contribution_value: taskContributionValue
        });

      if (error) throw error;

      // Refresh tasks to get updated contributions
      await fetchTasks();

      toast.success('Task linked to metric successfully');
      setIsLinkingTaskToMetric(false);
      setSelectedTaskForMetric(null);
      setSelectedMetricForTask(null);
      setTaskContributionValue(1);
    } catch (error) {
      console.error('Error linking task to metric:', error);
      toast.error('Failed to link task to metric');
    }
  };

  const handleRemoveTaskFromMetric = async (taskId: string, metricId: string) => {
    try {
      const { error } = await supabase
        .from('life_goal_task_contributions')
        .delete()
        .match({ task_id: taskId, metric_id: metricId });

      if (error) throw error;

      // Refresh tasks to update the UI
      await fetchTasks();

      toast.success('Task unlinked from metric successfully');
    } catch (error) {
      console.error('Error unlinking task from metric:', error);
      toast.error('Failed to unlink task from metric');
    }
  };

  const handleUnlinkProcessFlow = async (goalId: string, flowId: string) => {
    try {
      await unlinkProcessFlow(goalId, flowId);
      toast.success('Process flow unlinked successfully');
    } catch (error) {
      toast.error('Failed to unlink process flow');
    }
  };

  // Fetch daily points for the selected goal
  useEffect(() => {
    if (selectedGoalId) {
      const fetchDailyPoints = async () => {
        const { data, error } = await supabase
          .rpc('get_goal_daily_points', { goal_id: selectedGoalId })
        
        if (error) {
          console.error('Error fetching daily points:', error)
          return
        }

        setDailyPoints(Number(data) || 0)
      }

      fetchDailyPoints()
    }
  }, [selectedGoalId])

  const handleAddPoint = async () => {
    if (!selectedGoalId) return

    try {
      const { data, error } = await supabase
        .rpc('add_goal_points', { 
          goal_id: selectedGoalId,
          points_to_add: 1
        })

      if (error) throw error

      setDailyPoints(Number(data) || 0)
      toast.success('Point added successfully')
    } catch (err) {
      console.error('Error adding point:', err)
      toast.error('Failed to add point')
    }
  }

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
        <p>Error loading goals: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {(error as Error).message}</div>}

      {selectedGoal ? (
        <div className="space-y-6">
          {/* Area and Subarea Context */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/goal?tab=areas')}
                className="hover:text-blue-600"
              >
                {currentArea?.name || 'Areas'}
              </Button>
              <span className="text-gray-500">/</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/goal?tab=subareas&filter=${selectedSubareaId}`)}
                className="hover:text-blue-600"
              >
                {currentSubarea?.name || 'Subarea'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/goal?tab=goals&subarea=${selectedSubareaId}`)}
              >
                Subarea Goals
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/goal?tab=goals')}
              >
                All Goals
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl">{selectedGoal.title}</h3>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        selectedGoal.priority === 1 ? 'bg-red-50 text-red-700 border-red-200' :
                        selectedGoal.priority === 2 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        selectedGoal.priority === 3 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        selectedGoal.priority === 4 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {selectedGoal.priority === 1 ? '🔥' : 
                       selectedGoal.priority === 2 ? '⚡' : 
                       selectedGoal.priority === 3 ? '📋' : 
                       selectedGoal.priority === 4 ? '📝' : '📚'} 
                      {selectedGoal.priority === 1 ? 'Critical' : 
                       selectedGoal.priority === 2 ? 'High' : 
                       selectedGoal.priority === 3 ? 'Medium' : 
                       selectedGoal.priority === 4 ? 'Low' : 'Backlog'}
                    </Badge>
                  </div>
                  {selectedGoal.description && (
                    <p className="text-gray-600 mt-1 text-base">{selectedGoal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {/* Daily Points */}
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{dailyPoints} pts</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleAddPoint}
                        className="h-8 w-8"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-xs text-gray-500">Today's Progress</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingGoal(selectedGoal.id);
                        setEditGoalTitle(selectedGoal.title);
                        setEditGoalDescription(selectedGoal.description || '');
                        setEditGoalPriority(selectedGoal.priority || 3);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGoal(selectedGoal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <NoteLinkButton
                      type="goal"
                      id={selectedGoal.id}
                      name={selectedGoal.title}
                    />
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Milestones Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-500">Milestones</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsAddingMilestone(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Milestones List */}
                {selectedGoal.milestones && selectedGoal.milestones.length > 0 && (
                  <div className="space-y-2">
                    {selectedGoal.milestones.map((milestone) => (
                      <div 
                        key={milestone.id}
                        className="flex flex-col p-3 rounded-lg border"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`mt-0.5 h-5 w-5 ${milestone.completed ? 'text-green-500' : 'text-gray-300'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteMilestone(milestone);
                              }}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </Button>
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
                                (metric.thresholds || [])
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
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes Section - Only show if there are linked notes */}
                {selectedGoal.goal_notes && selectedGoal.goal_notes.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <div 
                      className="flex items-center gap-2 cursor-pointer mb-2"
                      onClick={() => setExpandedNotes(prev => ({
                        ...prev,
                        [selectedGoal.id]: !prev[selectedGoal.id]
                      }))}
                    >
                      {expandedNotes[selectedGoal.id] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <h3 className="text-sm font-medium text-gray-500">
                        Linked Notes ({selectedGoal.goal_notes.length})
                      </h3>
                    </div>
                    
                    {expandedNotes[selectedGoal.id] && (
                      <div className="space-y-2 pl-6">
                        {selectedGoal.goal_notes.map((noteLink) => (
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
              </div>

              {/* Metrics Section */}
              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-500">Metrics</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingMetricThreshold(true)}
                    >
                      Add Metric
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingSequence(true)}
                    >
                      <Timer className="w-4 h-4 mr-2" />
                      Link Sequence
                    </Button>
                  </div>
                </div>
                {selectedGoal.metrics && selectedGoal.metrics.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedGoal.metrics.map((metric: LifeGoalMetric) => {
                      const linkedTasks = tasks.filter(task => 
                        task.metric_contributions?.some(contrib => contrib.metric_id === metric.id)
                      );
                      return (
                        <li key={metric.id} className="flex flex-col p-3 rounded-lg border">
                          <div className="flex justify-between items-start">
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
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Only show sections if there are linked items */}
                          {(linkedTasks.length > 0 || metric.sequence_contributions?.length > 0) && (
                            <div className="mt-2 border-t pt-2 space-y-2">
                              {linkedTasks.length > 0 && (
                                <details className="group">
                                  <summary className="flex items-center gap-2 cursor-pointer list-none">
                                    <div className="flex-1 flex items-center gap-2">
                                      <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                                      <p className="text-xs font-medium text-gray-500">
                                        Linked Tasks ({linkedTasks.length})
                                      </p>
                                    </div>
                                  </summary>
                                  <div className="mt-2 pl-6 space-y-2">
                                    {linkedTasks.map(task => (
                                      <div key={task.id} className="flex items-center gap-2 text-sm">
                                        <div className="flex-1">
                                          <span className={task.status === 'completed' ? 'line-through text-gray-500' : ''}>
                                            {task.title}
                                          </span>
                                          <span className="text-xs text-gray-500 ml-2">
                                            (Contributes: {task.metric_contributions?.find(c => c.metric_id === metric.id)?.contribution_value})
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-4 w-4"
                                          onClick={() => handleRemoveTaskFromMetric(task.id, metric.id)}
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}

                              {metric.sequence_contributions?.length > 0 && (
                                <details className="group">
                                  <summary className="flex items-center gap-2 cursor-pointer list-none">
                                    <div className="flex-1 flex items-center gap-2">
                                      <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                                      <p className="text-xs font-medium text-gray-500">
                                        Linked Sequences ({metric.sequence_contributions.length})
                                      </p>
                                    </div>
                                  </summary>
                                  <div className="mt-2 pl-6 space-y-2">
                                    {metric.sequence_contributions?.map(contribution => (
                                      <div key={contribution.id} className="flex items-center gap-2">
                                        <Timer className="w-3 h-3 text-gray-500" />
                                        <Link 
                                          href={`/dashboard/process-flow/timer?sequence=${contribution.sequence?.id}`}
                                          className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                          {contribution.sequence?.title}
                                        </Link>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-4 w-4 ml-1"
                                          onClick={() => handleRemoveSequenceFromGoal(contribution.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No metrics yet</p>
                )}
              </div>

              {/* Tasks Section */}
              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-500">Tasks</h3>
                  <Button variant="ghost" size="sm" onClick={() => setIsAddingTask(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tasks List */}
                {selectedGoal.tasks && selectedGoal.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {selectedGoal.tasks.map((goalTask: LifeGoalTask) => {
                      const task = tasks.find(t => t.id === goalTask.task_id);
                      if (!task) return null;

                      return (
                        <div 
                          key={goalTask.id}
                          className="flex items-center justify-between py-1.5 px-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-4 w-4 ${task.status === 'completed' ? 'text-green-500' : 'text-gray-300'}`}
                              onClick={() => handleCompleteTask(task.id, task.status)}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <StarButton
                              taskId={task.id}
                              isStarred={task.is_starred_for_today || false}
                              size="sm"
                              className="h-4 w-4"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 hover:bg-blue-50 hover:text-blue-600 group relative"
                              onClick={() => {
                                setSelectedTaskForMetric(task.id);
                                setIsLinkingTaskToMetric(true);
                              }}
                            >
                              <Target className="w-3 h-3" />
                              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                                Link to Metric
                              </span>
                            </Button>
                            <div className="min-w-0">
                              <span className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                {task.title}
                              </span>
                              {task.description && (
                                <p className={`text-xs text-gray-600 truncate ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                                  {task.description}
                                </p>
                              )}
                              {task.due_date && (
                                <p className={`text-xs text-gray-500 flex items-center ${task.status === 'completed' ? 'text-gray-400' : ''}`}>
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </p>
                              )}
                              {/* Show linked metrics */}
                              {task.metric_contributions?.map(contribution => (
                                <div key={contribution.id} className="flex items-center gap-1 mt-1">
                                  <Target className="w-3 h-3 text-gray-500" />
                                  <span className="text-xs text-gray-600">
                                    Contributes {contribution.contribution_value} to {contribution.metric?.name}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4"
                                    onClick={() => handleRemoveTaskFromMetric(task.id, contribution.metric_id)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Worth: {goalTask.time_worth}x
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4"
                              onClick={() => handleRemoveTaskFromGoal(goalTask.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-2">No tasks yet</p>
                )}
              </div>

              {/* Process Flows Section */}
              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-500">Process Flows</h3>
                  <ProcessFlowLinkButton goalId={selectedGoal.id} goalTitle={selectedGoal.title} />
                </div>
                {selectedGoal.process_flows && selectedGoal.process_flows.length > 0 ? (
                  <div className="space-y-2">
                    {selectedGoal.process_flows.map((flow) => (
                      <div key={flow.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex-1">
                          <button
                            className="font-medium text-left text-blue-600 hover:underline"
                            onClick={() => router.push(`/dashboard/process-flow?flowId=${flow.flow_id}`)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          >
                            {flow.title}
                          </button>
                          {flow.description && (
                            <p className="text-sm text-gray-500">{flow.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/process-flow?flowId=${flow.flow_id}`)}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlinkProcessFlow(selectedGoal.id, flow.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No process flows linked yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {!selectedSubareaId ? (
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
                      >
                        <Card className="transition-colors hover:border-blue-600">
                          <CardHeader>
                            <CardTitle className="transition-colors hover:text-blue-600">
                              {subarea.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {subarea.goals && subarea.goals.length > 0 ? (
                              <ul className="space-y-2">
                                {subarea.goals.map((goal: LifeGoal) => (
                                  <li 
                                    key={goal.id} 
                                    onClick={(e) => {
                                      e.preventDefault();
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
          ) : (
            <div className="space-y-4">
              {/* Area/Subarea Context Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard/goal?tab=areas')}
                    className="hover:text-blue-600"
                  >
                    {currentArea?.name}
                  </Button>
                  <span className="text-gray-500">/</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/goal?tab=subareas&filter=${selectedSubareaId}`)}
                    className="hover:text-blue-600"
                  >
                    {currentSubarea?.name}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingGoal(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Goal
                  </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/goal?tab=goals')}
                >
                  All Goals
                </Button>
                </div>
              </div>

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
                              onClick={() => router.push(`/dashboard/goal?tab=goals&subarea=${subarea.id}&goal=${goal.id}`)}
                            >
                              <div className="flex justify-between items-start">
                                                              <div className="flex-grow">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">{goal.title}</h3>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      goal.priority === 1 ? 'bg-red-50 text-red-700 border-red-200' :
                                      goal.priority === 2 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                      goal.priority === 3 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                      goal.priority === 4 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      'bg-gray-50 text-gray-700 border-gray-200'
                                    }`}
                                  >
                                    {goal.priority === 1 ? '🔥' : 
                                     goal.priority === 2 ? '⚡' : 
                                     goal.priority === 3 ? '📋' : 
                                     goal.priority === 4 ? '📝' : '📚'} 
                                    {goal.priority === 1 ? 'Critical' : 
                                     goal.priority === 2 ? 'High' : 
                                     goal.priority === 3 ? 'Medium' : 
                                     goal.priority === 4 ? 'Low' : 'Backlog'}
                                  </Badge>
                                </div>
                                {goal.description && (
                                  <p className="text-gray-600 mt-1 text-base">{goal.description}</p>
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
                                  <div className="flex gap-2">
                                    <TaskCreator
                                      goalId={goal.id}
                                      triggerText="Add Task"
                                      triggerVariant="outline"
                                      triggerSize="sm"
                                      className="h-8"
                                    />
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
                                </div>
                                {goal.milestones && goal.milestones.length > 0 ? (
                                  <div className="space-y-2">
                                    {goal.milestones.map((milestone) => (
                                      <div 
                                        key={milestone.id} 
                                        className={`flex items-start gap-3 p-3 rounded-lg border ${milestone.completed ? 'bg-green-50 border-green-100' : 'bg-white'}`}
                                      >
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className={`mt-0.5 h-5 w-5 ${milestone.completed ? 'text-green-500' : 'text-gray-300'}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCompleteMilestone(milestone);
                                          }}
                                        >
                                          <CheckCircle2 className="w-5 h-5" />
                                        </Button>
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

      {/* Add Task Dialog */}
      <Dialog 
        open={isAddingTask} 
        onOpenChange={(open: boolean) => setIsAddingTask(open)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Task to Goal</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="existing">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Select Existing Task</TabsTrigger>
              <TabsTrigger value="new">Create New Task</TabsTrigger>
            </TabsList>
            <TabsContent value="existing" className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Task</label>
                <Select
                  value={selectedTaskId || ''}
                  onValueChange={(value: string) => {
                    if (value === '') {
                      setSelectedTaskId(null);
                    } else {
                      setSelectedTaskId(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a task" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Worth Multiplier</label>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={selectedTaskTimeWorth}
                  onChange={(e) => setSelectedTaskTimeWorth(parseFloat(e.target.value))}
                />
                <p className="text-xs text-gray-500">
                  How much should this task count towards the goal's metrics?
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedGoal && handleAddTaskToGoal(selectedGoal.id)}
                  disabled={!selectedTaskId}
                >
                  Add Task
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="new" className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Task Title</label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Enter task description"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAndAddTask}
                  disabled={!newTaskTitle.trim()}
                >
                  Create and Add Task
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add Goal Dialog */}
      <Dialog open={isAddingGoal} onOpenChange={(open) => !open && setIsAddingGoal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="Enter goal title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                placeholder="Enter goal description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingGoal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddGoal}
              disabled={!newGoalTitle.trim()}
            >
              Add Goal
            </Button>
          </DialogFooter>
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

      {/* Note Linking Dialog */}
      <Dialog open={isLinkingNote} onOpenChange={setIsLinkingNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Note to Goal</DialogTitle>
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
              onClick={() => selectedGoal && handleLinkNote(selectedGoal.id)}
              disabled={!selectedNoteId || !selectedGoal}
            >
              Link Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog 
        open={editingGoal !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingGoal(null);
            setEditGoalTitle('');
            setEditGoalDescription('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="editGoalTitle" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="editGoalTitle"
                value={editGoalTitle}
                onChange={(e) => setEditGoalTitle(e.target.value)}
                placeholder="e.g., Run a Marathon"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editGoalDescription" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="editGoalDescription"
                value={editGoalDescription}
                onChange={(e) => setEditGoalDescription(e.target.value)}
                placeholder="Describe your goal..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editGoalPriority" className="text-sm font-medium">
                Priority
              </label>
              <Select
                value={editGoalPriority.toString()}
                onValueChange={(value) => setEditGoalPriority(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">🔥 Critical</SelectItem>
                  <SelectItem value="2">⚡ High</SelectItem>
                  <SelectItem value="3">📋 Medium</SelectItem>
                  <SelectItem value="4">📝 Low</SelectItem>
                  <SelectItem value="5">📚 Backlog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditingGoal(null);
                setEditGoalTitle('');
                setEditGoalDescription('');
                setEditGoalPriority(3);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingGoal || !editGoalTitle.trim()) return;
                
                try {
                  await updateGoal(editingGoal, {
                    title: editGoalTitle,
                    description: editGoalDescription || undefined,
                    priority: editGoalPriority,
                  });
                  setEditingGoal(null);
                  setEditGoalTitle('');
                  setEditGoalDescription('');
                  toast.success('Goal updated successfully');
                } catch (error) {
                  console.error('Error updating goal:', error);
                  toast.error('Failed to update goal');
                }
              }}
              disabled={!editGoalTitle.trim()}
            >
              Update Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Sequence Dialog */}
      <Dialog 
        open={isAddingSequence} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingSequence(false);
            setSelectedSequenceId(null);
            setSelectedMetricId(null);
            setSequenceContributionValue(1);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Sequence to Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Sequence</label>
              <Select
                value={selectedSequenceId || ''}
                onValueChange={(value) => setSelectedSequenceId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a sequence" />
                </SelectTrigger>
                <SelectContent>
                  {sequences.map(sequence => (
                    <SelectItem key={sequence.id} value={sequence.id}>
                      {sequence.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Metric</label>
              <Select
                value={selectedMetricId || ''}
                onValueChange={(value) => setSelectedMetricId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a metric" />
                </SelectTrigger>
                <SelectContent>
                  {selectedGoal?.metrics.map(metric => (
                    <SelectItem key={metric.id} value={metric.id}>
                      {metric.name} ({metric.unit || metric.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contribution Value</label>
              <Input
                type="number"
                value={sequenceContributionValue}
                onChange={(e) => setSequenceContributionValue(parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                How much should this sequence count towards the metric?
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddingSequence(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSequenceToGoal}
              disabled={!selectedSequenceId || !selectedMetricId}
            >
              Link Sequence
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for linking task to metric */}
      <Dialog open={isLinkingTaskToMetric} onOpenChange={setIsLinkingTaskToMetric}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Task to Metric</DialogTitle>
            <DialogDescription>
              Select a metric and set the contribution value. When this task is completed, it will update the metric's value.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Metric</Label>
              <Select
                value={selectedMetricForTask || ''}
                onValueChange={setSelectedMetricForTask}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a metric" />
                </SelectTrigger>
                <SelectContent>
                  {selectedGoal?.metrics.map(metric => (
                    <SelectItem key={metric.id} value={metric.id}>
                      {metric.name} ({metric.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contribution Value</Label>
              <Input
                type="number"
                value={taskContributionValue}
                onChange={(e) => setTaskContributionValue(parseFloat(e.target.value))}
                min={0}
                step={0.1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkingTaskToMetric(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkTaskToMetric}>
              Link Task to Metric
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 