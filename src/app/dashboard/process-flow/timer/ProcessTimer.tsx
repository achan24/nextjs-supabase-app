'use client';

import { useState, useEffect } from 'react';
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

export function ProcessTimer({ onTaskComplete, user }: ProcessTimerProps) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTasks, setSelectedTasks] = useState<Node[]>([]);
  const { 
    activeSequence: selectedSequence,
    setActiveSequence: setSelectedSequence,
    currentTaskIndex,
    setCurrentTaskIndex,
    timeSpent,
    setTimeSpent,
    isRunning,
    setIsRunning,
    startTimer,
    pauseTimer,
    resetTimer
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

  // Set timer view based on URL parameter and active sequence
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
        const { data: sequences, error } = await supabase
          .from('timer_sequences')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading sequences:', error);
          throw error;
        }
        
        setSequences(sequences || []);
      } catch (error) {
        console.error('Error in loadSequences:', error);
        setSequences([]);
      }
    };

    if (user?.id) {
      loadSequences();
    }
  }, [user.id]);

  // Load sequence completions
  useEffect(() => {
    const loadCompletions = async () => {
      if (!selectedSequence) return;
      
      try {
        // First refresh the task data
        const refreshedTasks = await Promise.all(
          selectedSequence.tasks.map(async (task) => {
            if (!task.data?.flowId) {
              console.error('Task missing flowId in loadCompletions:', task);
              throw new Error(`Task ${task.id} is missing flowId`);
            }

            const { data: flow, error: fetchError } = await supabase
              .from('process_flows')
              .select('nodes')
              .eq('id', task.data.flowId)
              .single();

            if (fetchError) throw fetchError;

            const node = flow.nodes.find((n: any) => n.id === task.id);
            if (!node) {
              console.error('Node not found in flow:', task.id);
              throw new Error(`Node ${task.id} not found in flow ${task.data.flowId}`);
            }

            // Preserve the flowId and any other essential data
            return {
              ...task,
              data: {
                ...node.data,
                flowId: task.data.flowId, // Explicitly preserve flowId
                completionHistory: node.data.completionHistory || [],
                targetDuration: node.data.targetDuration,
                useTargetDuration: node.data.useTargetDuration,
                cues: node.data.cues || [],
                activeCueId: node.data.activeCueId
              }
            };
          })
        );

        // Update selected tasks with fresh data
        setSelectedTasks(refreshedTasks);

        // Then load completions
        const { data: completions, error } = await supabase
          .from('sequence_completions')
          .select('*')
          .eq('sequence_id', selectedSequence.id)
          .order('completed_at', { ascending: false });

        if (error) throw error;
        setCompletions(completions || []);
      } catch (error) {
        console.error('Error loading sequence completions:', error);
        setCompletions([]);
      }
    };

    loadCompletions();
  }, [selectedSequence?.id]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && selectedSequence?.startTime !== null && selectedSequence?.startTime !== undefined) {
      interval = setInterval(() => {
        setTimeSpent(Date.now() - selectedSequence.startTime!);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, selectedSequence?.startTime]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const handleCreateSequence = async (tasks: Node[]) => {
    setSelectedTasks(tasks);
    setIsSaveModalOpen(true);
    setIsEditMode(false);
    setNewSequenceTitle('');
    setNewSequenceDescription('');
  };

  const handleEditSequence = (sequence: TimerSequence) => {
    setSelectedTasks(sequence.tasks);
    setNewSequenceTitle(sequence.title);
    setNewSequenceDescription(sequence.description);
    setSelectedSequence(sequence);
    setIsEditMode(true);
    setIsCreateModalOpen(true);
  };

  const handleSaveSequence = async () => {
    try {
      // Ensure tasks have flowId preserved
      const tasksWithFlowIds = selectedTasks.map(task => ({
        ...task,
        data: {
          ...task.data,
          flowId: task.data.flowId // Explicitly preserve flowId
        }
      }));

      if (isEditMode && selectedSequence) {
        // Update existing sequence
        const { error } = await supabase
          .from('timer_sequences')
          .update({
            title: newSequenceTitle,
            description: newSequenceDescription,
            tasks: tasksWithFlowIds,
          })
          .eq('id', selectedSequence.id);

        if (error) throw error;

        setSequences(sequences.map(s => 
          s.id === selectedSequence.id 
            ? { ...s, title: newSequenceTitle, description: newSequenceDescription, tasks: tasksWithFlowIds }
            : s
        ));
      } else {
        // Create new sequence
        const { data: sequence, error } = await supabase
          .from('timer_sequences')
          .insert({
            title: newSequenceTitle,
            description: newSequenceDescription,
            tasks: tasksWithFlowIds,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;

        setSequences([sequence, ...sequences]);
      }

      setIsSaveModalOpen(false);
      setIsCreateModalOpen(false);
      setNewSequenceTitle('');
      setNewSequenceDescription('');
      setSelectedTasks([]);
      setSelectedSequence(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving sequence:', error);
    }
  };

  const handleStartSequence = async (sequence: TimerSequence) => {
    try {
      // Check if there's already an active sequence
      if (selectedSequence) {
        throw new Error('Another sequence is currently active. Please complete or stop it first.');
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

      // Calculate task times using the actual completion history and current time spent
      const taskTimes: Array<{taskId: string, timeSpent: number}> = selectedTasks.map((task, index) => {
        // For the current task, use the current timeSpent
        if (index === currentTaskIndex) {
          return {
            taskId: task.id,
            timeSpent: timeSpent
          };
        }

        // For other tasks, use their completion history
        const completionHistory = task.data.completionHistory || [];
        const latestCompletion = completionHistory[completionHistory.length - 1];
        
        return {
          taskId: task.id,
          timeSpent: latestCompletion?.timeSpent || 0
        };
      });

      // Calculate total time as sum of all task times
      const totalTime = taskTimes.reduce((sum: number, task: {timeSpent: number}) => sum + task.timeSpent, 0);

      // Validate data before saving
      if (!selectedSequence.id || !user.id) {
        throw new Error('Missing required data for sequence completion');
      }

      // Save sequence completion
      const { data: completion, error: saveError } = await supabase
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

      if (saveError) {
        console.error('Error saving sequence completion:', saveError);
        throw saveError;
      }

      if (!completion) {
        throw new Error('No completion data returned');
      }

      // Set the completion for display
      setLastCompletion(completion);
      
      // Show completion view
      setIsCompletionView(true);
      
      // Reset timer state but keep sequence info for completion view
      setCurrentTaskIndex(-1);
      setTimeSpent(0);
      setIsRunning(false);

    } catch (error) {
      console.error('Error completing sequence:', error);
      setCompletionError(error as Error);
      setIsRunning(false);
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
          <p className="text-gray-600">{selectedSequence?.title}</p>
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
            <div className="space-y-3">
              {sequences.map((sequence) => {
                // Calculate total estimated time
                const totalEstimatedTime = sequence.tasks.reduce((total, task) => {
                  // If task has target duration, use that
                  if (task.data.targetDuration) {
                    return total + (task.data.targetDuration * 1000);
                  }
                  // If task has completion history, use average
                  if (task.data.completionHistory?.length) {
                    const avgTime = task.data.completionHistory.reduce((sum: number, rec: CompletionRecord) => sum + rec.timeSpent, 0) / 
                      task.data.completionHistory.length;
                    return total + avgTime;
                  }
                  return total;
                }, 0);

                // Calculate ETA if we start now
                const eta = totalEstimatedTime ? new Date(Date.now() + totalEstimatedTime) : null;

                return (
                  <Card key={sequence.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{sequence.title}</h3>
                        <p className="text-sm text-gray-500">{sequence.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setIsHistoryModalOpen(true);
                            setHistorySequenceId(sequence.id);
                          }}
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditSequence(sequence)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSequence(sequence);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm">
                        {sequence.tasks.length} tasks
                      </p>
                      {completions.filter(c => c.sequence_id === sequence.id).length > 0 && (
                        <p className="text-sm text-gray-500">
                          {completions.filter(c => c.sequence_id === sequence.id).length} completions
                        </p>
                      )}
                      {totalEstimatedTime > 0 && (
                        <p className="text-sm text-blue-600">
                          Estimated time: {formatTime(totalEstimatedTime)}
                          {eta && (
                            <span className="ml-2 text-gray-500">
                              (ETA: {eta.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: false 
                              })})
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        onClick={() => handleStartSequence(sequence)}
                        className="flex-1"
                        disabled={selectedSequence !== null}
                      >
                        {selectedSequence ? (
                          'Another sequence is active'
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <CreateSequenceModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            if (isEditMode) {
              setSelectedSequence(null);
              setIsEditMode(false);
            }
          }}
          onCreateSequence={(tasks) => {
            setSelectedTasks(tasks);
            setIsSaveModalOpen(true);
          }}
          flows={flows}
          initialTasks={isEditMode ? selectedSequence?.tasks : undefined}
        />

        <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Sequence' : 'Save Sequence'}</DialogTitle>
              <DialogDescription>
                Give your sequence a name and optional description.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newSequenceTitle}
                  onChange={(e) => setNewSequenceTitle(e.target.value)}
                  placeholder="Enter sequence title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
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
              <Button onClick={handleSaveSequence} disabled={!newSequenceTitle}>
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

  const currentTask = currentTaskIndex >= 0 ? selectedTasks[currentTaskIndex] : null;

  // Calculate average completion time
  const avgTime = currentTask?.data.completionHistory?.length ? 
    currentTask.data.completionHistory.reduce((sum: number, rec: CompletionRecord) => sum + rec.timeSpent, 0) / 
    currentTask.data.completionHistory.length : 
    null;

  // Get last completion time
  const lastTime = currentTask?.data.completionHistory?.length ? 
    currentTask.data.completionHistory[currentTask.data.completionHistory.length - 1].timeSpent : 
    null;

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
              {formatTime(timeSpent)}
            </div>
            <div className="mt-4 space-y-2 text-sm sm:text-base text-gray-400">
              {currentTask.data.targetDuration && (
                <div>Target: {formatTime(currentTask.data.targetDuration * 1000)}</div>
              )}
              {lastTime && (
                <div>Previous: {formatTime(lastTime)}</div>
              )}
              {avgTime && (
                <div>Average: {formatTime(avgTime)}</div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            {isRunning ? (
              <Button
                variant="outline"
                size="lg"
                onClick={pauseTimer}
                className="w-32"
              >
                Pause
              </Button>
            ) : (
              <Button
                variant="default"
                size="lg"
                onClick={startTimer}
                className="w-32"
              >
                Start
              </Button>
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