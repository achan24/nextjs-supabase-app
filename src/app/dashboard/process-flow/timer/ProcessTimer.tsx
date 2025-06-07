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
import { useRouter } from 'next/navigation';

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
  const [selectedTasks, setSelectedTasks] = useState<Node[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
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
  const [selectedSequence, setSelectedSequence] = useState<TimerSequence | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [completions, setCompletions] = useState<SequenceCompletion[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<'asc' | 'desc'>('desc');

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
    
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setTimeSpent(Date.now() - startTime);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

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
      // Validate that all tasks have flowIds
      const invalidTasks = sequence.tasks.filter(task => !task.data?.flowId);
      if (invalidTasks.length > 0) {
        console.error('Tasks missing flowId:', invalidTasks);
        throw new Error('Some tasks are missing required data');
      }

      // Log the tasks before refresh
      console.log('Starting sequence with tasks:', sequence.tasks.map(t => ({
        id: t.id,
        flowId: t.data.flowId,
        label: t.data.label
      })));

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
              flowId: task.data.flowId, // Explicitly preserve flowId
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

      // Log the refreshed tasks
      console.log('Refreshed tasks:', refreshedTasks.map(t => ({
        id: t.id,
        flowId: t.data.flowId,
        label: t.data.label
      })));

      setSelectedSequence(sequence);
      setSelectedTasks(refreshedTasks);
      setCurrentTaskIndex(0);
      setTimeSpent(0);
      setStartTime(null);
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

      // Refresh all tasks' data to ensure we have latest completion histories
      const refreshedTasks = await Promise.all(
        selectedTasks.map(async (task) => {
          try {
            const { data: flow, error: fetchError } = await supabase
              .from('process_flows')
              .select('nodes')
              .eq('id', task.data.flowId)
              .single();

            if (fetchError) {
              console.error(`Error fetching flow for task ${task.id}:`, fetchError);
              return task;
            }

            if (!flow || !flow.nodes) {
              console.error(`Invalid flow data for task ${task.id}:`, flow);
              return task;
            }

            const node = flow.nodes.find((n: any) => n.id === task.id);
            return node ? { ...task, data: node.data } : task;
          } catch (error) {
            console.error(`Error refreshing task ${task.id}:`, error);
            return task;
          }
        })
      );

      // Update local state with refreshed tasks
      setSelectedTasks(refreshedTasks);

      // Calculate task times using refreshed data
      const taskTimes = refreshedTasks.map((task) => {
        const completionHistory = task.data.completionHistory || [];
        // Get the most recent completion
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
      setStartTime(null);
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
  if (isCompletionView && lastCompletion && selectedSequence) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Sequence Completed!</h1>
          <p className="text-gray-600">{selectedSequence.title}</p>
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
              {sequences.map((sequence) => (
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
                          setSelectedSequence(sequence);
                          setIsHistoryModalOpen(true);
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
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={() => handleStartSequence(sequence)}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </Button>
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
                Are you sure you want to delete "{selectedSequence?.title}"? This action cannot be undone.
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
              <DialogTitle>Sequence History - {selectedSequence?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {completions.filter(c => c.sequence_id === selectedSequence?.id).length} completions
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHistoryOrder(historyOrder === 'desc' ? 'asc' : 'desc')}
                >
                  {historyOrder === 'desc' ? 'Oldest First' : 'Newest First'}
                </Button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {completions
                  .filter(c => c.sequence_id === selectedSequence?.id)
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
                          const task = selectedSequence?.tasks.find(t => t.id === taskTime.taskId);
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
                      {completion.notes && (
                        <p className="mt-2 text-sm text-gray-600">
                          {completion.notes}
                        </p>
                      )}
                    </Card>
                  ))}
              </div>
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
          <div className="bg-gray-900 text-white rounded-2xl p-8">
            <div className="text-8xl font-mono font-bold tabular-nums">
              {formatTime(timeSpent)}
            </div>
            <div className="mt-4 space-y-2 text-gray-400">
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
            {!isRunning ? (
              <Button
                onClick={() => {
                  setStartTime(Date.now() - timeSpent);
                  setIsRunning(true);
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 text-xl rounded-xl"
              >
                <Play size={24} className="mr-2" />
                Start
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setIsRunning(false);
                    setTimeSpent(Date.now() - (startTime || Date.now()));
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-6 text-xl rounded-xl"
                >
                  <Pause size={24} className="mr-2" />
                  Pause
                </Button>
                <Button
                  onClick={async () => {
                    if (currentTaskIndex < selectedTasks.length - 1) {
                      // Save completion record if needed
                      const currentTask = selectedTasks[currentTaskIndex];
                      if (currentTask && timeSpent > 0) {
                        // Call onTaskComplete if provided
                        if (onTaskComplete) {
                          onTaskComplete(currentTask.id, timeSpent);
                        }

                        // Validate flowId exists
                        if (!currentTask.data?.flowId) {
                          console.error('Task missing flowId:', currentTask);
                          throw new Error(`Task ${currentTask.id} is missing flowId`);
                        }

                        // Save completion record
                        const newHistory = [
                          ...(currentTask.data.completionHistory || []),
                          {
                            completedAt: Date.now(),
                            timeSpent
                          }
                        ];
                        
                        const updatedTask = {
                          ...currentTask,
                          data: {
                            ...currentTask.data,
                            completionHistory: newHistory
                          }
                        };
                        
                        // Update task in local state
                        setSelectedTasks(tasks => 
                          tasks.map(t => t.id === currentTask.id ? updatedTask : t)
                        );

                        // Update task in database
                        try {
                          console.log('Saving task completion for:', {
                            taskId: currentTask.id,
                            flowId: currentTask.data.flowId,
                            timeSpent
                          });

                          // First get the current flow
                          const { data: flow, error: fetchError } = await supabase
                            .from('process_flows')
                            .select('nodes')
                            .eq('id', currentTask.data.flowId)
                            .single();

                          if (fetchError) {
                            console.error('Error fetching flow:', fetchError);
                            throw fetchError;
                          }

                          if (!flow || !flow.nodes) {
                            console.error('Invalid flow data:', flow);
                            throw new Error('Invalid flow data');
                          }

                          // Find and update the specific node
                          const nodeIndex = flow.nodes.findIndex((n: any) => n.id === currentTask.id);
                          if (nodeIndex === -1) {
                            console.error('Node not found in flow:', {
                              nodeId: currentTask.id,
                              flowId: currentTask.data.flowId,
                              availableNodes: flow.nodes.map((n: any) => n.id)
                            });
                            throw new Error(`Node ${currentTask.id} not found in flow ${currentTask.data.flowId}`);
                          }

                          // Create updated nodes array
                          const updatedNodes = [...flow.nodes];
                          updatedNodes[nodeIndex] = {
                            ...flow.nodes[nodeIndex],
                            data: {
                              ...flow.nodes[nodeIndex].data,
                              completionHistory: newHistory
                            }
                          };

                          // Save the updated nodes
                          const { error: updateError } = await supabase
                            .from('process_flows')
                            .update({ nodes: updatedNodes })
                            .eq('id', currentTask.data.flowId);

                          if (updateError) {
                            console.error('Error updating flow:', updateError);
                            throw updateError;
                          }

                          console.log('Successfully saved task completion');
                        } catch (error) {
                          console.error('Error saving task completion:', error);
                          throw error; // Propagate error to show in UI
                        }

                        // Clear timer state for this task
                        localStorage.removeItem(`timer_${currentTask.id}`);
                      }

                      // Move to next task and auto-start it
                      setCurrentTaskIndex(currentTaskIndex + 1);
                      setTimeSpent(0);
                      setStartTime(Date.now()); // Set start time for auto-start
                      setIsRunning(true); // Auto-start the timer
                    } else {
                      // We're on the last task
                      const currentTask = selectedTasks[currentTaskIndex];
                      
                      // Save the current time spent before stopping the timer
                      const finalTimeSpent = timeSpent;
                      
                      // Stop the timer first
                      setIsRunning(false);
                      
                      if (currentTask && finalTimeSpent > 0) {
                        // Validate flowId exists
                        if (!currentTask.data?.flowId) {
                          console.error('Last task missing flowId:', currentTask);
                          throw new Error(`Last task ${currentTask.id} is missing flowId`);
                        }

                        // Save completion record for the last task
                        const newHistory = [
                          ...(currentTask.data.completionHistory || []),
                          {
                            completedAt: Date.now(),
                            timeSpent: finalTimeSpent
                          }
                        ];
                        
                        const updatedTask = {
                          ...currentTask,
                          data: {
                            ...currentTask.data,
                            completionHistory: newHistory
                          }
                        };
                        
                        // Update task in local state
                        setSelectedTasks(tasks => 
                          tasks.map(t => t.id === currentTask.id ? updatedTask : t)
                        );

                        // Update task in database
                        try {
                          console.log('Saving last task completion:', {
                            taskId: currentTask.id,
                            flowId: currentTask.data.flowId,
                            timeSpent: finalTimeSpent
                          });

                          // First get the current flow
                          const { data: flow, error: fetchError } = await supabase
                            .from('process_flows')
                            .select('nodes')
                            .eq('id', currentTask.data.flowId)
                            .single();

                          if (fetchError) {
                            console.error('Error fetching flow:', fetchError);
                            throw fetchError;
                          }

                          if (!flow || !flow.nodes) {
                            console.error('Invalid flow data:', flow);
                            throw new Error('Invalid flow data');
                          }

                          // Find and update the specific node
                          const nodeIndex = flow.nodes.findIndex((n: any) => n.id === currentTask.id);
                          if (nodeIndex === -1) {
                            console.error('Node not found in flow:', {
                              nodeId: currentTask.id,
                              flowId: currentTask.data.flowId,
                              availableNodes: flow.nodes.map((n: any) => n.id)
                            });
                            throw new Error(`Node ${currentTask.id} not found in flow ${currentTask.data.flowId}`);
                          }

                          // Create updated nodes array
                          const updatedNodes = [...flow.nodes];
                          updatedNodes[nodeIndex] = {
                            ...flow.nodes[nodeIndex],
                            data: {
                              ...flow.nodes[nodeIndex].data,
                              completionHistory: newHistory
                            }
                          };

                          // Save the updated nodes
                          const { error: updateError } = await supabase
                            .from('process_flows')
                            .update({ nodes: updatedNodes })
                            .eq('id', currentTask.data.flowId);

                          if (updateError) {
                            console.error('Error updating flow:', updateError);
                            throw updateError;
                          }

                          console.log('Successfully saved last task completion');

                          // Clear timer state for this task
                          localStorage.removeItem(`timer_${currentTask.id}`);
                        } catch (error) {
                          console.error('Error saving last task completion:', error);
                          throw error;
                        }
                      }

                      // Now complete the sequence with the final time
                      await handleCompleteSequence();
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-6 text-xl rounded-xl"
                >
                  <SkipForward size={24} className="mr-2" />
                  {currentTaskIndex < selectedTasks.length - 1 ? 'Next' : 'Complete'}
                </Button>
              </>
            )}
          </div>

          {/* Up Next */}
          {currentTaskIndex < selectedTasks.length - 1 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-500">Up Next</h3>
              <div className="mt-2 bg-gray-50 rounded-lg p-4">
                {selectedTasks[currentTaskIndex + 1].data.label}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {isRunning ? (
          <Button
            variant="outline"
            onClick={() => setIsRunning(false)}
            className="flex-1"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={() => {
              setIsRunning(true);
              if (!startTime) {
                setStartTime(Date.now() - timeSpent);
              }
            }}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            {timeSpent === 0 ? 'Start' : 'Resume'}
          </Button>
        )}

        {currentTaskIndex < selectedTasks.length - 1 ? (
          <Button
            variant="outline"
            onClick={async () => {
              // Save completion record for current task
              const currentTask = selectedTasks[currentTaskIndex];
              if (currentTask && timeSpent > 0) {
                const newHistory = [
                  ...(currentTask.data.completionHistory || []),
                  {
                    completedAt: Date.now(),
                    timeSpent
                  }
                ];
                
                const updatedTask = {
                  ...currentTask,
                  data: {
                    ...currentTask.data,
                    completionHistory: newHistory
                  }
                };
                
                // Update task in local state
                setSelectedTasks(tasks => 
                  tasks.map(t => t.id === currentTask.id ? updatedTask : t)
                );

                // Update task in database
                try {
                  // First get the current flow
                  const { data: flow, error: fetchError } = await supabase
                    .from('process_flows')
                    .select('nodes')
                    .eq('id', currentTask.data.flowId)
                    .single();

                  if (fetchError) {
                    console.error('Error fetching flow:', fetchError);
                    throw fetchError;
                  }

                  // Update the specific node in the nodes array
                  const updatedNodes = flow.nodes.map((node: any) => 
                    node.id === currentTask.id ? {
                      ...node,
                      data: {
                        ...node.data,
                        completionHistory: newHistory
                      }
                    } : node
                  );

                  // Save the updated nodes
                  const { error: updateError } = await supabase
                    .from('process_flows')
                    .update({ nodes: updatedNodes })
                    .eq('id', currentTask.data.flowId);

                  if (updateError) {
                    console.error('Error updating node completion history:', updateError);
                    throw updateError;
                  }

                  // Refresh the next task's data to ensure we have latest completion history
                  const nextTask = selectedTasks[currentTaskIndex + 1];
                  if (nextTask) {
                    const { data: nextFlow, error: nextFetchError } = await supabase
                      .from('process_flows')
                      .select('nodes')
                      .eq('id', nextTask.data.flowId)
                      .single();

                    if (!nextFetchError && nextFlow) {
                      const nextNode = nextFlow.nodes.find((n: any) => n.id === nextTask.id);
                      if (nextNode) {
                        // Update the next task in local state with fresh data
                        setSelectedTasks(tasks =>
                          tasks.map(t => t.id === nextTask.id ? { ...t, data: nextNode.data } : t)
                        );
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error saving task completion:', error);
                  // Don't return early, continue with moving to next task
                }
              }
              
              // Move to next task
              setCurrentTaskIndex(i => i + 1);
              setTimeSpent(0);
              setStartTime(null);
              setIsRunning(false);

              // Clear any persisted timer state for the current task
              if (currentTask) {
                localStorage.removeItem(`timer_${currentTask.id}`);
              }

              // Reset timer state for the next task
              const nextTask = selectedTasks[currentTaskIndex + 1];
              if (nextTask) {
                localStorage.removeItem(`timer_${nextTask.id}`);
              }
            }}
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Next Task
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={() => {
              // Save completion record for the last task
              const currentTask = selectedTasks[currentTaskIndex];
              if (currentTask && timeSpent > 0) {
                const newHistory = [
                  ...(currentTask.data.completionHistory || []),
                  {
                    completedAt: Date.now(),
                    timeSpent
                  }
                ];
                
                const updatedTask = {
                  ...currentTask,
                  data: {
                    ...currentTask.data,
                    completionHistory: newHistory
                  }
                };
                
                setSelectedTasks(tasks => 
                  tasks.map(t => t.id === currentTask.id ? updatedTask : t)
                );
              }
              
              // Complete the sequence
              handleCompleteSequence();
            }}
          >
            Complete Sequence
          </Button>
        )}
      </div>
    </div>
  );
} 