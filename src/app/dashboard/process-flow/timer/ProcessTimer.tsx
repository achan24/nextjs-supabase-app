'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Node } from 'reactflow';
import { Play, Plus, Clock, Trash2, Edit2, Pause, SkipForward } from 'lucide-react';
import { CreateSequenceModal } from './CreateSequenceModal';
import { createClient } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter, useSearchParams } from 'next/navigation';
import { useActiveSequence } from '@/contexts/ActiveSequenceContext';
import { toast } from 'sonner';
import { useTaskTimer } from '@/contexts/TaskTimerContext';

interface CompletionRecord {
  completedAt: number;
  timeSpent: number;
  note?: string;
}

interface TaskCue {
  id: string;
  text: string;
  archived?: boolean;
}

interface TaskNodeData {
  label: string;
  description?: string;
  cues?: TaskCue[];
  activeCueId?: string;
  timeSpent?: number;
  startTime?: number;
  isRunning?: boolean;
  completionHistory?: CompletionRecord[];
  targetDuration?: number;
  useTargetDuration?: boolean;
}

interface ProcessTimerProps {
  onTaskComplete?: (taskId: string, timeSpent: number) => void;
  user: any;
}

interface TimerSequence {
  id: string;
  title: string;
  description: string;
  tasks: Node[];
  created_at: string;
  startTime: number | null;
}

interface SequenceCompletion {
  id: string;
  sequence_id: string;
  completed_at: string;
  total_time: number;
  task_times: Array<{taskId: string, timeSpent: number}>;
  notes?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
}

export function ProcessTimer({ onTaskComplete, user }: ProcessTimerProps) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTasks, setSelectedTasks] = useState<Node[]>([]);
  const { resetTimer: resetTaskTimer, getCurrentTime, isTimerRunning, stopTimer, startTimer } = useTaskTimer();
  const { 
    activeSequence: selectedSequence,
    setActiveSequence: setSelectedSequence,
    currentTaskIndex,
    setCurrentTaskIndex,
    timeSpent,
    setTimeSpent,
    isRunning,
    setIsRunning,
    startTimer: activeSequenceStartTimer,
    pauseTimer,
    resetTimer,
    setActiveSequence
  } = useActiveSequence();
  const [isTimerView, setIsTimerView] = useState(false);
  const [isCompletionView, setIsCompletionView] = useState(false);
  const [lastCompletion, setLastCompletion] = useState<SequenceCompletion | null>(null);
  const [completionError, setCompletionError] = useState<Error | null>(null);
  const [flows, setFlows] = useState<any[]>([]);
  const [sequences, setSequences] = useState<TimerSequence[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newSequenceTitle, setNewSequenceTitle] = useState('');
  const [newSequenceDescription, setNewSequenceDescription] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [completions, setCompletions] = useState<SequenceCompletion[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<'asc' | 'desc'>('desc');
  const [historySequenceId, setHistorySequenceId] = useState<string | null>(null);
  const currentTask = selectedTasks[currentTaskIndex];
  const [lockedTaskEta, setLockedTaskEta] = useState<Date | null>(null);
  const [lockedSequenceEta, setLockedSequenceEta] = useState<Date | null>(null);
  const [isCompletingSequence, setIsCompletingSequence] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [sequenceTags, setSequenceTags] = useState<Record<string, Tag[]>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [pendingTagIds, setPendingTagIds] = useState<string[]>([]);

  // Load all sequence completions when component mounts
  useEffect(() => {
    const loadAllCompletions = async () => {
      try {
        const { data: completions, error } = await supabase
          .from('sequence_completions')
          .select('*')
          .order('completed_at', { ascending: false });

        if (error) throw error;
        setCompletions(completions || []);
      } catch (error) {
        console.error('Error loading sequence completions:', error);
        setCompletions([]);
      }
    };

    loadAllCompletions();
  }, []);

  // Set timer view based on URL parameter and active sequence
  useEffect(() => {
    if (!searchParams || !sequences.length) return;
    
    const sequenceId = searchParams.get('sequence');
    
    // If a specific sequence is requested and no sequence is currently selected
    if (sequenceId && !selectedSequence) {
      const sequence = sequences.find(s => s.id === sequenceId);
      if (sequence) {
        setIsTimerView(true);
        handleStartSequence(sequence);
      }
    }
  }, [searchParams, sequences]); // Only depend on searchParams and sequences

  // Separate effect for showing timer view
  useEffect(() => {
    if (!searchParams) return;
    const shouldShowTimer = searchParams.get('isTimerView') === 'true';
    if (shouldShowTimer && selectedSequence) {
      setIsTimerView(true);
      setSelectedTasks(selectedSequence.tasks);
    }
  }, [searchParams, selectedSequence]);

  // Load flows from Supabase
  useEffect(() => {
    const loadFlows = async () => {
      try {
        const { data: flows, error } = await supabase
          .from('process_flows')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading flows:', error);
          throw error;
        }
        
        setFlows(flows || []);
      } catch (error) {
        console.error('Error in loadFlows:', error);
        setFlows([]);
      }
    };

    if (user?.id) {
      loadFlows();
    }
  }, [user.id]);

  // Load saved sequences
  useEffect(() => {
    const loadSequences = async () => {
      try {
        // Fetch sequences
        const { data: sequences, error } = await supabase
          .from('timer_sequences')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch all tags
        const { data: tags, error: tagsError } = await supabase
          .from('tags')
          .select('*')
          .eq('user_id', user.id);

        if (tagsError) throw tagsError;
        setAllTags(tags || []);

        // Fetch sequence tags for all sequences
        const { data: sequenceTagsData, error: sequenceTagsError } = await supabase
          .from('sequence_tags')
          .select('sequence_id, tag_id')
          .in('sequence_id', (sequences || []).map(s => s.id));

        if (sequenceTagsError) throw sequenceTagsError;

        // Group tags by sequence
        const tagsBySequence: Record<string, Tag[]> = {};
        sequenceTagsData?.forEach(st => {
          if (!tagsBySequence[st.sequence_id]) {
            tagsBySequence[st.sequence_id] = [];
          }
          const tag = tags?.find(t => t.id === st.tag_id);
          if (tag) {
            tagsBySequence[st.sequence_id].push(tag);
          }
        });

        setSequenceTags(tagsBySequence);
        setSequences(sequences || []);
      } catch (error) {
        console.error('Error loading sequences:', error);
        setSequences([]);
      }
    };

    if (user?.id) {
      loadSequences();
    }
  }, [user.id]);

  // Sync timer state on mount and when current task changes
  useEffect(() => {
    if (currentTask) {
      const running = isTimerRunning(currentTask.id);
      setIsRunning(running);
      
      // Update task data if needed
      if (running !== currentTask.data.isRunning) {
        const updatedTask = {
          ...currentTask,
          data: {
            ...currentTask.data,
            isRunning: running,
            timeSpent: getCurrentTime(currentTask.id)
          }
        };
        
        setSelectedTasks(tasks => 
          tasks.map(t => t.id === currentTask.id ? updatedTask : t)
        );

        if (selectedSequence) {
          setSelectedSequence({
            ...selectedSequence,
            tasks: selectedTasks.map(t => 
              t.id === currentTask.id ? updatedTask : t
            )
          });
        }
      }
    }
  }, [currentTask, isTimerRunning, getCurrentTime, setIsRunning, selectedSequence, selectedTasks, setSelectedSequence]);

  // Update ETAs when starting timer
  useEffect(() => {
    if (isRunning && selectedSequence?.startTime !== null && selectedSequence?.startTime !== undefined) {
      setTimeSpent(Date.now() - selectedSequence.startTime!);
    }
  }, [isRunning, selectedSequence?.startTime]);

  // Update timer state when data changes
  useEffect(() => {
    if (currentTask) {
      const isCurrentlyRunning = isTimerRunning(currentTask.id);
      const currentTimeSpent = getCurrentTime(currentTask.id);
      
      // Update task data if timer is running
      if (isCurrentlyRunning && currentTimeSpent !== currentTask.data.timeSpent) {
        const updatedTask = {
          ...currentTask,
              data: {
            ...currentTask.data,
            timeSpent: currentTimeSpent,
            isRunning: true,
            startTime: Date.now() - currentTimeSpent
          }
        };

        setSelectedTasks(tasks => 
          tasks.map(t => t.id === currentTask.id ? updatedTask : t)
        );

        // Update sequence data
        if (selectedSequence) {
          setSelectedSequence({
            ...selectedSequence,
            tasks: selectedTasks.map(t => 
              t.id === currentTask.id ? updatedTask : t
            ),
            startTime: selectedSequence.startTime || (Date.now() - currentTimeSpent)
          });
        }
      }
    }
  }, [currentTask, getCurrentTime, isTimerRunning, selectedSequence, selectedTasks, setSelectedSequence]);

  // Update displayTime from per-task timer
  useEffect(() => {
    if (!currentTask) return;
    let interval: NodeJS.Timeout | null = null;
    const update = () => {
      setDisplayTime(getCurrentTime(currentTask.id));
    };
    update();
    if (isTimerRunning(currentTask.id)) {
      interval = setInterval(update, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTask, getCurrentTime, isTimerRunning]);

  // Handle start/pause actions
  const handleStartTimer = useCallback(() => {
    if (!currentTask) return;
    // Start per-task timer with correct initial data
    startTimer(currentTask.id, {
      timeSpent: currentTask.data.timeSpent || 0,
      label: currentTask.data.label,
      targetDuration: currentTask.data.targetDuration,
      useTargetDuration: currentTask.data.useTargetDuration || false,
      completionHistory: currentTask.data.completionHistory,
    });
    // Start sequence/global timer
    if (selectedSequence && !selectedSequence.startTime) {
      setSelectedSequence({
        ...selectedSequence,
        startTime: Date.now(),
      });
    }
    setIsRunning(true);
    const updatedTask = {
      ...currentTask,
      data: {
        ...currentTask.data,
        isRunning: true,
        startTime: Date.now(),
      },
    };
    setSelectedTasks(tasks =>
      tasks.map(t => t.id === currentTask.id ? updatedTask : t)
    );
    if (selectedSequence) {
      setSelectedSequence({
        ...selectedSequence,
        tasks: selectedTasks.map(t =>
          t.id === currentTask.id ? updatedTask : t
        ),
      });
    }
  }, [currentTask, startTimer, selectedSequence, selectedTasks, setSelectedSequence, setIsRunning, setSelectedTasks]);

  const handlePauseTimer = useCallback(() => {
    if (!currentTask) return;
    stopTimer(currentTask.id); // per-task
    pauseTimer(); // sequence/global
    setIsRunning(false);
    const updatedTask = {
      ...currentTask,
      data: {
        ...currentTask.data,
        isRunning: false,
        timeSpent: getCurrentTime(currentTask.id),
      },
    };
    setSelectedTasks(tasks =>
      tasks.map(t => t.id === currentTask.id ? updatedTask : t)
    );
    if (selectedSequence) {
      setSelectedSequence({
        ...selectedSequence,
        tasks: selectedTasks.map(t =>
          t.id === currentTask.id ? updatedTask : t
        ),
      });
    }
  }, [currentTask, stopTimer, pauseTimer, getCurrentTime, selectedSequence, selectedTasks, setSelectedSequence, setIsRunning, setSelectedTasks]);

  const handleResetTimer = useCallback(async () => {
    if (!currentTask) return;
    resetTaskTimer(currentTask.id); // per-task
    resetTimer(); // sequence/global
    setIsRunning(false);
    const updatedTask = {
      ...currentTask,
      data: {
        ...currentTask.data,
        timeSpent: 0,
        startTime: null,
        isRunning: false,
      },
    };
    setSelectedTasks(tasks =>
      tasks.map(t => t.id === currentTask.id ? updatedTask : t)
    );
    if (selectedSequence) {
      setSelectedSequence({
        ...selectedSequence,
        tasks: selectedTasks.map(t =>
          t.id === currentTask.id ? updatedTask : t
        ),
      });
    }
    // Update in database if needed (existing code)
    if (currentTask.data.flowId) {
      try {
        const { data: flow, error: fetchError } = await supabase
          .from('process_flows')
          .select('nodes')
          .eq('id', currentTask.data.flowId)
          .single();
        if (fetchError) throw fetchError;
        const updatedNodes = flow.nodes.map((n: any) => {
          if (n.id === currentTask.id) {
            return {
              ...n,
              data: {
                ...n.data,
                timeSpent: 0,
                startTime: null,
                isRunning: false,
              },
            };
          }
          return n;
        });
        const { error: updateError } = await supabase
          .from('process_flows')
          .update({ nodes: updatedNodes })
          .eq('id', currentTask.data.flowId);
        if (updateError) throw updateError;
      } catch (error) {
        console.error('Error updating flow:', error);
        toast.error('Failed to reset timer in database');
      }
    }
  }, [currentTask, resetTaskTimer, resetTimer, selectedSequence, selectedTasks, setSelectedSequence, setIsRunning, setSelectedTasks, supabase, toast]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const handleCreateSequence = async (tasks: Node[], tagIds: string[], title: string, description: string) => {
    try {
      // Create the sequence
      const { data: newSequence, error: createError } = await supabase
        .from('timer_sequences')
        .insert({
          title,
          description,
          tasks: tasks,
          user_id: user.id
        })
        .select()
        .single();

      if (createError) throw createError;
      if (!newSequence) throw new Error('Failed to create sequence');

      // Add tags to the sequence
      if (tagIds.length > 0) {
        const tagRows = tagIds.map(tagId => ({
          sequence_id: newSequence.id,
          tag_id: tagId
        }));
        const { error: tagError } = await supabase
          .from('sequence_tags')
          .insert(tagRows);
        if (tagError) throw tagError;
      }

      // Update local state
      setSequences([newSequence, ...sequences]);
      setIsCreateModalOpen(false);
    setNewSequenceTitle('');
    setNewSequenceDescription('');
      toast.success('Sequence created successfully');
    } catch (error: unknown) {
      console.error('Error creating sequence:', error);
      toast.error('Failed to create sequence');
    }
  };

  const handleEditSequence = (sequence: TimerSequence) => {
    setSelectedTasks(sequence.tasks);
    setNewSequenceTitle(sequence.title);
    setNewSequenceDescription(sequence.description);
    setSelectedSequence(sequence);
    // Set initial tag IDs from the sequence's existing tags
    setPendingTagIds((sequenceTags[sequence.id] || []).map(tag => tag.id));
    setIsEditMode(true);
    setIsCreateModalOpen(true);
  };

  const handleSaveSequence = async (tasks: Node[], tagIds: string[], title: string, description: string) => {
    try {
      if (!selectedSequence || !isEditMode) {
        toast.error('No sequence selected for editing');
        return;
      }

      // Ensure tasks have flowId preserved
      const tasksWithFlowIds = tasks.map(task => ({
        ...task,
        data: {
          ...task.data,
          flowId: task.data.flowId
        }
      }));

        // Update existing sequence
      const { error: updateError } = await supabase
          .from('timer_sequences')
          .update({
          title,
          description,
            tasks: tasksWithFlowIds,
          })
          .eq('id', selectedSequence.id);

      if (updateError) throw updateError;

      // Update sequence tags
      // First, remove all existing tags
      const { error: deleteTagsError } = await supabase
        .from('sequence_tags')
        .delete()
        .eq('sequence_id', selectedSequence.id);

      if (deleteTagsError) throw deleteTagsError;

      // Then add the new tags
      if (tagIds.length > 0) {
        const tagRows = tagIds.map(tagId => ({
          sequence_id: selectedSequence.id,
          tag_id: tagId
        }));
        const { error: tagError } = await supabase
          .from('sequence_tags')
          .insert(tagRows);
        if (tagError) throw tagError;
      }

      // Update local state
        setSequences(sequences.map(s => 
          s.id === selectedSequence.id 
          ? { ...s, title, description, tasks: tasksWithFlowIds }
            : s
        ));
      
      // Update sequence tags in local state
      setSequenceTags(prev => ({
        ...prev,
        [selectedSequence.id]: allTags.filter(tag => tagIds.includes(tag.id))
      }));

      // Reset state
      setIsSaveModalOpen(false);
      setIsCreateModalOpen(false);
      setNewSequenceTitle('');
      setNewSequenceDescription('');
      setSelectedTasks([]);
      setSelectedSequence(null);
      setIsEditMode(false);
      setPendingTagIds([]);

      toast.success('Sequence updated successfully');
    } catch (error: unknown) {
      console.error('Error saving sequence:', error);
      toast.error('Failed to save sequence');
    }
  };

  const handleStartSequence = async (sequence: TimerSequence) => {
    try {
      // Check if there's already an active sequence
      if (selectedSequence) {
        // If the requested sequence is different from the active one,
        // just navigate to the active sequence
        if (sequence.id !== selectedSequence.id) {
          setIsTimerView(true);
          router.push(`/dashboard/process-flow/timer?sequence=${selectedSequence.id}`);
          return;
        }
        // If it's the same sequence, just show the timer view
        setIsTimerView(true);
        return;
      }

      // Validate that all tasks have flowIds
      const invalidTasks = sequence.tasks.filter(task => !task.data?.flowId);
      if (invalidTasks.length > 0) {
        console.error('Tasks missing flowId:', invalidTasks);
        throw new Error('Some tasks are missing required data');
      }

      // Fetch fresh task data for each task in the sequence
      const refreshedTasks = await Promise.all(
        sequence.tasks.map(async (task) => {
          if (!task.data?.flowId) {
            console.error('Task missing flowId:', task);
            throw new Error(`Task ${task.id} is missing flowId`);
          }

          const { data: flow, error: fetchError } = await supabase
            .from('process_flows')
            .select('nodes')
            .eq('id', task.data.flowId)
            .single();

          if (fetchError) {
            console.error('Error fetching flow:', fetchError);
            throw fetchError;
          }

          if (!flow || !flow.nodes) {
            console.error('Invalid flow data:', flow);
            throw new Error('Invalid flow data');
          }

          const node = flow.nodes.find((n: any) => n.id === task.id);
          if (!node) {
            console.error('Node not found in flow:', task.id);
            throw new Error(`Node ${task.id} not found in flow ${task.data.flowId}`);
          }

          // Preserve the flowId and any other essential data
          const refreshedTask = {
            ...task,
            data: {
              ...node.data,
              flowId: task.data.flowId,
              completionHistory: node.data.completionHistory || [],
              targetDuration: node.data.targetDuration,
              useTargetDuration: node.data.useTargetDuration,
              cues: node.data.cues || [],
              activeCueId: node.data.activeCueId
            }
          };

          return refreshedTask;
        })
      );

      setSelectedTasks(refreshedTasks);
      setSelectedSequence({ 
        ...sequence, 
        tasks: refreshedTasks,
        startTime: null
      });
      setCurrentTaskIndex(0);
      setTimeSpent(0);
      setIsRunning(false);
      setIsTimerView(true);
    } catch (error) {
      console.error('Error starting sequence:', error);
      setCompletionError(error as Error);
    }
  };

  const handleDeleteSequence = async (sequence: TimerSequence) => {
    try {
      const { error } = await supabase
        .from('timer_sequences')
        .delete()
        .eq('id', sequence.id);

      if (error) throw error;

      setSequences(sequences.filter(s => s.id !== sequence.id));
      setIsDeleteModalOpen(false);
      
      if (selectedSequence?.id === sequence.id) {
        setSelectedSequence(null);
        setSelectedTasks([]);
        setCurrentTaskIndex(-1);
        setIsRunning(false);
        setIsTimerView(false);
      }
    } catch (error) {
      console.error('Error deleting sequence:', error);
    }
  };

  const handleJumpToNode = (flowId: string, nodeId: string) => {
    router.push(`/dashboard/process-flow?flowId=${flowId}&nodeId=${nodeId}`);
  };

  const handleCompleteSequence = async () => {
    if (!selectedSequence) return;

    try {
      setCompletionError(null);

      // Calculate task times using the actual completion history
      const taskTimes: Array<{taskId: string, timeSpent: number}> = selectedTasks.map((task, index) => {
        // For the current task, use the current timeSpent
        if (index === currentTaskIndex) {
          return {
            taskId: task.id,
            timeSpent: timeSpent
          };
        }

        // For completed tasks, use their latest completion record
        const completionHistory = task.data.completionHistory || [];
        const latestCompletion = completionHistory[completionHistory.length - 1];
        
        return {
          taskId: task.id,
          timeSpent: latestCompletion?.timeSpent || 0
        };
      });

      // Calculate total time as sum of all task times
      const totalTime = taskTimes.reduce((sum, task) => sum + task.timeSpent, 0);

      // Validate data before saving
      if (!selectedSequence.id || !user.id) {
        throw new Error('Missing required data for sequence completion');
      }

      // Check for recent completions (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentCompletion } = await supabase
        .from('sequence_completions')
        .select()
        .eq('sequence_id', selectedSequence.id)
        .eq('user_id', user.id)
        .gte('completed_at', fiveMinutesAgo)
        .maybeSingle();

      if (recentCompletion) {
        console.log('Sequence was recently completed');
        toast.info('This sequence was completed very recently. Please wait a few minutes before completing it again.');
        return;
      }

      // Save new sequence completion
      const { data: completion, error } = await supabase
        .from('sequence_completions')
        .insert({
          sequence_id: selectedSequence.id,
          user_id: user.id,
          completed_at: new Date().toISOString(),
          total_time: totalTime,
          task_times: taskTimes
        })
        .select()
        .single();

      if (error) {
        // If we get a unique constraint violation, someone completed it just now
        if (error.code === '23505') {
          toast.info('This sequence was just completed. Please wait a few minutes before completing it again.');
          return;
        }
        console.error('Error completing sequence:', error);
        throw error;
      }

      // Set the completion for display
      if (completion) {
      setLastCompletion(completion);
        setCompletions(prevCompletions => {
          // Only add if not already in the list
          if (!prevCompletions.some(c => c.id === completion.id)) {
            return [...prevCompletions, completion];
          }
          return prevCompletions;
        });
        toast.success(`Completed "${selectedSequence.title}"! 🎉`);
      }
      
      // Show completion view
      setIsCompletionView(true);
      
      // Reset all state including the active sequence
      setCurrentTaskIndex(-1);
      setTimeSpent(0);
      setIsRunning(false);
      setSelectedSequence(null);
      setSelectedTasks([]);
      setActiveSequence(null); // Clear the active sequence from context

    } catch (error) {
      console.error('Error completing sequence:', error);
      setCompletionError(error as Error);
      setIsRunning(false);
      toast.error('Failed to complete sequence');
    }
  };

  // If there's a completion error
  if (completionError) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Error Completing Sequence</h1>
          <p className="text-red-600 mb-4">{completionError.message}</p>
          <p className="text-gray-600 mb-8">Don't worry, your progress is saved. You can try completing the sequence again.</p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => {
              setCompletionError(null);
              handleCompleteSequence();
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-lg"
          >
            Try Again
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              // Reset all state to return to the main screen
              setCompletionError(null);
              setIsCompletionView(false);
              setIsTimerView(false);
              setSelectedSequence(null);
              setSelectedTasks([]);
              setLastCompletion(null);
            }}
            className="w-full py-4"
          >
            Return to Sequences
          </Button>
        </div>
      </div>
    );
  }

  // If showing completion summary
  if (isCompletionView && lastCompletion) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Sequence Completed!</h1>
          <p className="text-gray-600">{lastCompletion.sequence_id}</p>
        </div>

        <Card className="p-6 mb-8">
          <div className="text-center mb-6">
            <div className="text-4xl font-mono font-bold mb-2">
              {formatTime(lastCompletion.total_time)}
            </div>
            <div className="text-gray-500">Total Time</div>
          </div>

          <div className="space-y-4">
            {lastCompletion.task_times.map((taskTime, index) => {
              const task = selectedTasks.find(t => t.id === taskTime.taskId);
              return (
                <div key={taskTime.taskId} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{task?.data.label}</div>
                    <div className="text-sm text-gray-500">Task {index + 1}</div>
                  </div>
                  <div className="font-mono">{formatTime(taskTime.timeSpent)}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Button
          onClick={() => {
            // Reset all state to return to the main screen
            setIsCompletionView(false);
            setIsTimerView(false);
            setSelectedSequence(null);
            setSelectedTasks([]);
            setLastCompletion(null);
            // Clear the active sequence from context
            setActiveSequence(null);
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-lg"
        >
          Return to Sequences
        </Button>
      </div>
    );
  }

  // If not in timer view, show the sequence list
  if (!isTimerView) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Process Timer</h1>
          <p className="text-gray-600">Create and run sequences of tasks with timing</p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-6 rounded-lg flex items-center justify-center gap-2 mb-8"
        >
          <Plus className="h-5 w-5" />
          Create New Sequence
        </Button>

        {sequences.length > 0 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Sequences</h2>
            <div className="space-y-4">
              {sequences.map((sequence) => (
                <Card key={sequence.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium">{sequence.title}</h3>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSequence(sequence)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDeleteModalOpen(true)}
                      >
                        <Trash2 size={16} />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStartSequence(sequence)}
                      >
                        <Play size={16} />
                      </Button>
                    </div>
                  </div>
                  {sequence.description && (
                    <p className="text-sm text-gray-600 mb-2">{sequence.description}</p>
                  )}
                  {/* Display sequence tags */}
                  {sequenceTags[sequence.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sequenceTags[sequence.id].map(tag => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            border: `1px solid ${tag.color}`
                          }}
                        >
                          {tag.name}
                            </span>
                      ))}
                  </div>
                  )}
                  <div className="text-sm text-gray-500 mt-2">
                    {sequence.tasks.length} tasks
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        <CreateSequenceModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setNewSequenceTitle('');
            setNewSequenceDescription('');
            setSelectedTasks([]);
              setSelectedSequence(null);
              setIsEditMode(false);
            setPendingTagIds([]);
          }}
          onCreateSequence={(tasks, tagIds, title, description) => {
            if (isEditMode) {
              handleSaveSequence(tasks, tagIds, title, description);
            } else {
              handleCreateSequence(tasks, tagIds, title, description);
            }
          }}
          flows={flows}
          initialTasks={selectedTasks}
          initialTagIds={pendingTagIds}
          initialTitle={newSequenceTitle}
          initialDescription={newSequenceDescription}
        />

        <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Update' : 'Save'} Sequence</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newSequenceTitle}
                  onChange={(e) => setNewSequenceTitle(e.target.value)}
                  placeholder="Enter sequence title"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={newSequenceDescription}
                  onChange={(e) => setNewSequenceDescription(e.target.value)}
                  placeholder="Enter sequence description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSaveModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!newSequenceTitle.trim()) {
                    toast.error('Please enter a sequence title');
                    return;
                  }
                  handleSaveSequence(selectedTasks, pendingTagIds, newSequenceTitle, newSequenceDescription);
                }} 
                disabled={!newSequenceTitle.trim()}
              >
                {isEditMode ? 'Update' : 'Save'} Sequence
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Sequence</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this sequence? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedSequence && handleDeleteSequence(selectedSequence)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sequence History</DialogTitle>
              <DialogDescription>
                View past completions of this sequence
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryOrder(order => order === 'asc' ? 'desc' : 'asc')}
              >
                Sort {historyOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {completions
                .filter(c => c.sequence_id === historySequenceId)
                .sort((a, b) => {
                  const dateA = new Date(a.completed_at).getTime();
                  const dateB = new Date(b.completed_at).getTime();
                  return historyOrder === 'desc' ? dateB - dateA : dateA - dateB;
                })
                .map((completion) => (
                  <Card key={completion.id} className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">
                        {new Date(completion.completed_at).toLocaleString()}
                      </span>
                      <span className="text-sm font-medium">
                        Total: {formatTime(completion.total_time)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {completion.task_times.map((taskTime, index) => {
                        const sequence = sequences.find(s => s.id === completion.sequence_id);
                        const task = sequence?.tasks.find(t => t.id === taskTime.taskId);
                        return (
                          <div key={taskTime.taskId} className="text-sm flex justify-between">
                            <span className="text-gray-600">
                              {index + 1}. {task?.data.label || 'Unknown Task'}
                            </span>
                            <span className="text-gray-500">
                              {formatTime(taskTime.timeSpent)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Calculate average time from completion history
  const avgTime = currentTask?.data.completionHistory?.length
    ? currentTask.data.completionHistory.reduce((sum: number, record: CompletionRecord) => sum + record.timeSpent, 0) / currentTask.data.completionHistory.length
    : null;

  // Get last completion time
  const lastTime = currentTask?.data.completionHistory?.length 
    ? currentTask.data.completionHistory[currentTask.data.completionHistory.length - 1].timeSpent 
    : null;

  // Get active cue
  const activeCue = currentTask?.data.cues?.find((c: TaskCue) => c.id === currentTask.data.activeCueId && !c.archived);

  return (
    <div className="max-w-2xl mx-auto py-8">
      {currentTask && (
        <div className="space-y-8">
          {/* Progress */}
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>Task {currentTaskIndex + 1} of {selectedTasks.length}</div>
            <div className="text-base font-medium">
              {selectedSequence?.title}
            </div>
          </div>

          {/* Task Title and Description */}
          <div className="text-center">
            <h1 className="text-4xl font-bold">{currentTask.data.label}</h1>
            {currentTask.data.description && (
              <p className="mt-2 text-gray-600">{currentTask.data.description}</p>
            )}
          </div>
          
          {/* Active Cue */}
          {activeCue && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-blue-800">{activeCue.text}</p>
            </div>
          )}

          {/* Timer */}
          <div className="bg-gray-900 text-white rounded-2xl p-4 sm:p-8">
            <div className="text-5xl sm:text-8xl font-mono font-bold tabular-nums text-center">
              {formatTime(displayTime)}
            </div>
            <div className="mt-4 space-y-2 text-sm sm:text-base text-gray-400">
              {currentTask?.data.targetDuration && (
                <div>Target: {formatTime(currentTask.data.targetDuration * 1000)}</div>
              )}
              {lastTime && (
                <div>Previous: {formatTime(lastTime)}</div>
              )}
              {avgTime && (
                <div>Average: {formatTime(avgTime)}</div>
              )}
              {currentTask?.data.targetDuration && (
                <div className="text-blue-400">
                  ETA: {(isRunning && lockedTaskEta ? lockedTaskEta : new Date(Date.now() + (currentTask?.data.targetDuration || 0) * 1000))
                    .toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false 
                    })}
                </div>
              )}
              <div className="text-green-400">
                Sequence ETA: {(isRunning && lockedSequenceEta ? lockedSequenceEta : new Date(Date.now() + selectedTasks.slice(currentTaskIndex).reduce((total, task) => {
                  if (task?.data?.targetDuration) {
                    return total + (task.data.targetDuration * 1000);
                  }
                  if (task?.data?.completionHistory?.length) {
                    return total + (task.data.completionHistory.reduce((s: number, r: CompletionRecord) => s + r.timeSpent, 0) / 
                      task.data.completionHistory.length);
                  }
                  return total;
                }, 0))).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false 
                })}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            {isTimerRunning(currentTask?.id || '') ? (
              <Button
                variant="outline"
                size="lg"
                onClick={handlePauseTimer}
                className="w-32"
              >
                Pause
              </Button>
            ) : (
              <>
              <Button
                variant="default"
                size="lg"
                  onClick={handleStartTimer}
                className="w-32"
              >
                Start
              </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleResetTimer}
                  className="w-32"
                >
                  Reset
                </Button>
              </>
            )}

            {currentTaskIndex < selectedTasks.length - 1 ? (
              <Button
                variant="default"
                size="lg"
                onClick={() => {
                  // Save completion record for current task
                  const currentTask = selectedTasks[currentTaskIndex];
                  if (currentTask) {
                    const elapsedTime = timeSpent;
                    const newHistory = [
                      ...(currentTask.data.completionHistory || []),
                      {
                        completedAt: Date.now(),
                        timeSpent: elapsedTime
                      }
                    ];
                    
                    // Update task in database first
                    if (currentTask.data.flowId) {
                      supabase
                        .from('process_flows')
                        .select('nodes')
                        .eq('id', currentTask.data.flowId)
                        .single()
                        .then(({ data: flow, error }) => {
                          if (error) {
                            console.error('Error fetching flow:', error);
                            return;
                          }
                          
                          const updatedNodes = flow.nodes.map((n: any) => {
                            if (n.id === currentTask.id) {
                              return {
                                ...n,
                                data: {
                                  ...n.data,
                                  completionHistory: newHistory,
                                  lastTimeSpent: elapsedTime
                                }
                              };
                            }
                            return n;
                          });
                          
                          supabase
                            .from('process_flows')
                            .update({ nodes: updatedNodes })
                            .eq('id', currentTask.data.flowId)
                            .then(({ error }) => {
                              if (error) {
                                console.error('Error updating flow:', error);
                              }
                            });
                        });
                    }
                    
                    const updatedTask = {
                      ...currentTask,
                      data: {
                        ...currentTask.data,
                        completionHistory: newHistory,
                        lastTimeSpent: elapsedTime
                      }
                    };
                    
                    setSelectedTasks(tasks => 
                      tasks.map(t => t.id === currentTask.id ? updatedTask : t)
                    );
                  }
                  
                  // Move to next task
                  setCurrentTaskIndex(currentTaskIndex + 1);
                  resetTimer();
                }}
                className="w-32"
              >
                Next Task
              </Button>
            ) : (
              <Button
                variant="default"
                size="lg"
                onClick={() => {
                  // Save completion record for current task
                  const currentTask = selectedTasks[currentTaskIndex];
                  if (currentTask) {
                    const elapsedTime = timeSpent;
                    const newHistory = [
                      ...(currentTask.data.completionHistory || []),
                      {
                        completedAt: Date.now(),
                        timeSpent: elapsedTime
                      }
                    ];
                    
                    // Update task in database first
                    if (currentTask.data.flowId) {
                      supabase
                        .from('process_flows')
                        .select('nodes')
                        .eq('id', currentTask.data.flowId)
                        .single()
                        .then(({ data: flow, error }) => {
                          if (error) {
                            console.error('Error fetching flow:', error);
                            return;
                          }
                          
                          const updatedNodes = flow.nodes.map((n: any) => {
                            if (n.id === currentTask.id) {
                              return {
                                ...n,
                                data: {
                                  ...n.data,
                                  completionHistory: newHistory,
                                  lastTimeSpent: elapsedTime
                                }
                              };
                            }
                            return n;
                          });
                          
                          supabase
                            .from('process_flows')
                            .update({ nodes: updatedNodes })
                            .eq('id', currentTask.data.flowId)
                            .then(({ error }) => {
                              if (error) {
                                console.error('Error updating flow:', error);
                              }
                            });
                        });
                    }
                    
                    const updatedTask = {
                      ...currentTask,
                      data: {
                        ...currentTask.data,
                        completionHistory: newHistory,
                        lastTimeSpent: elapsedTime
                      }
                    };
                    
                    setSelectedTasks(tasks => 
                      tasks.map(t => t.id === currentTask.id ? updatedTask : t)
                    );
                  }
                  
                  // Complete the sequence
                  handleCompleteSequence();
                }}
                className="w-32"
              >
                Complete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 