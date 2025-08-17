'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import GoalSelector from '@/components/GoalSelector';
import TraitClassificationDialog from '@/components/TraitClassificationDialog';
import { isFirstTaskOfDay, calculateFirstTaskMultipliers } from '@/utils/taskUtils';

interface TaskCreatorProps {
  areaId?: string;
  subareaId?: string;
  goalId?: string;
  triggerText?: string;
  triggerVariant?: 'default' | 'outline' | 'ghost';
  triggerSize?: 'sm' | 'default' | 'lg';
  className?: string;
  onTaskCreated?: () => void;
}

export default function TaskCreator({
  areaId,
  subareaId,
  goalId,
  triggerText = 'Add Task',
  triggerVariant = 'outline',
  triggerSize = 'sm',
  className = '',
  onTaskCreated
}: TaskCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<'create' | 'classify'>('create');
  const [createdTaskId, setCreatedTaskId] = useState<string>('');
  const [isFirstTask, setIsFirstTask] = useState(false);
  const [isWorkRelated, setIsWorkRelated] = useState<boolean | undefined>(undefined);
  const [isOnTime, setIsOnTime] = useState<boolean | undefined>(undefined);
  const supabase = createClient();

  useEffect(() => {
    console.log('[TaskCreator] Step changed to:', step);
  }, [step]);

  // Check if this is the first task of the day when dialog opens
  useEffect(() => {
    if (isOpen && step === 'create') {
      const checkFirstTask = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const firstTask = await isFirstTaskOfDay(session.user.id);
          setIsFirstTask(firstTask);
          console.log('[TaskCreator] Is first task of day:', firstTask);
        }
      };
      checkFirstTask();
    }
  }, [isOpen, step, supabase]);

  const handleCreateTask = async () => {
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error('You must be logged in to create tasks');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: session.user.id,
          title: title.trim(),
          description: description.trim() || null,
          area_id: areaId || null,
          subarea_id: subareaId || null,
          goal_id: goalId || selectedGoalId || null,
          is_starred_for_today: true, // Auto-star for today
          priority: 3, // Medium priority
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('[TaskCreator] Error creating task:', error);
        toast.error('Failed to create task');
        return;
      }

      toast.success('Task created and starred for today!');
      
      // Store task info for trait classification
      setCreatedTaskId(data.id);
      
      // Re-check if this is the first task, excluding the one we just created
      const firstTaskCheck = await isFirstTaskOfDay(session.user.id, data.id);
      setIsFirstTask(firstTaskCheck);
      console.log('[TaskCreator] Re-checked first task status after creation:', firstTaskCheck);
      
      // Move to classification step
      setStep('classify');
      
      console.log('[TaskCreator] Moving to classification step for task:', data.id);
      console.log('[TaskCreator] Current step after setting:', step);
    } catch (error) {
      console.error('[TaskCreator] Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (step === 'create') {
        handleCreateTask();
      }
    }
  };

  const handleTraitClassificationComplete = async () => {
    console.log('[TaskCreator] Completing trait classification, closing dialog');
    
    try {
      // Save first task multipliers if this is the first task
      if (isFirstTask && createdTaskId) {
        const multipliers = calculateFirstTaskMultipliers(isFirstTask, isWorkRelated, isOnTime);
        
        // Save to task_trait_tags table with the multiplier information
        const { error: tagError } = await supabase
          .from('task_trait_tags')
          .insert({
            task_id: createdTaskId,
            trait_tags: ['Initiative'], // Default trait for any task
            task_metadata: {
              isFirstTaskOfDay: isFirstTask,
              isWorkRelated: isWorkRelated,
              isOnTime: isOnTime,
              multipliers: multipliers
            },
            auto_classified: false
          });

        if (tagError) {
          console.error('[TaskCreator] Error saving first task classification:', tagError);
          toast.error('Failed to save task classification');
        } else {
          console.log('[TaskCreator] First task multipliers saved:', multipliers);
          if (Object.keys(multipliers).length > 0) {
            toast.success(`First task bonus activated! ${Object.keys(multipliers).length} multiplier(s) applied.`);
          }
        }
      }
    } catch (error) {
      console.error('[TaskCreator] Error in trait classification completion:', error);
    }
    
    // Reset form and close dialog
    setTitle('');
    setDescription('');
    setSelectedGoalId(null);
    setStep('create');
    setCreatedTaskId('');
    setIsFirstTask(false);
    setIsWorkRelated(undefined);
    setIsOnTime(undefined);
    setIsOpen(false);
    
    // Call onTaskCreated callback after a short delay to ensure dialog closes first
    setTimeout(() => {
      onTaskCreated?.();
    }, 100);
  };

  const handleSkipClassification = () => {
    handleTraitClassificationComplete();
  };

  return (
    <>
      <Dialog 
        open={isOpen} 
        onOpenChange={(open) => {
          console.log('[TaskCreator] Dialog onOpenChange called with:', open);
          setIsOpen(open);
          if (!open) {
            // Reset step when dialog is closed
            setStep('create');
          }
        }}
      >
        <DialogTrigger asChild>
          <Button 
            variant={triggerVariant} 
            size={triggerSize}
            className={className}
          >
            <Plus className="h-3 w-3 mr-1" />
            {triggerText}
          </Button>
        </DialogTrigger>
        <DialogContent className={step === 'classify' ? "sm:max-w-2xl" : "sm:max-w-md"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {step === 'create' ? (
                <>
                  <Star className="h-4 w-4 text-yellow-500" />
                  Create Task
                  {areaId && <span className="text-sm text-muted-foreground">(Area)</span>}
                  {subareaId && <span className="text-sm text-muted-foreground">(Subarea)</span>}
                  {goalId && <span className="text-sm text-muted-foreground">(Goal)</span>}
                </>
              ) : (
                <>
                  Trait Classification
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {step === 'create' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-title">Task Title *</Label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="task-description">Description (optional)</Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={3}
                  onKeyDown={handleKeyDown}
                />
              </div>
              {!goalId && (
                <GoalSelector
                  selectedGoalId={selectedGoalId}
                  onGoalChange={setSelectedGoalId}
                  placeholder="Link to a life goal (optional)"
                />
              )}
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <div className="flex items-center gap-1 mb-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span>This task will be automatically starred for today</span>
                </div>
                <div>Press Cmd/Ctrl + Enter to create quickly</div>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTask}
                  disabled={!title.trim() || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">Help us understand how this task will develop your character traits</p>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Task: {title}</p>
              </div>
              
              {/* First Task of the Day Special Questions */}
              {isFirstTask && (
                <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-800">🌟 First Task of the Day Bonus</h3>
                  <p className="text-sm text-yellow-700 mb-4">
                    Answer these questions to unlock special multipliers for your first task!
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Is this task work-related? (3x multiplier)</Label>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="work-yes" 
                            name="workRelated" 
                            checked={isWorkRelated === true}
                            onChange={() => setIsWorkRelated(true)}
                          />
                          <Label htmlFor="work-yes">Yes - Work/Career related</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="work-no" 
                            name="workRelated" 
                            checked={isWorkRelated === false}
                            onChange={() => setIsWorkRelated(false)}
                          />
                          <Label htmlFor="work-no">No - Personal/Other</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Are you starting on time? (2x multiplier)</Label>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="ontime-yes" 
                            name="onTime" 
                            checked={isOnTime === true}
                            onChange={() => setIsOnTime(true)}
                          />
                          <Label htmlFor="ontime-yes">Yes - On time as planned</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="ontime-no" 
                            name="onTime" 
                            checked={isOnTime === false}
                            onChange={() => setIsOnTime(false)}
                          />
                          <Label htmlFor="ontime-no">No - Late or unplanned timing</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
                      💡 <strong>Potential Bonus:</strong> Work-related (3x) + On-time (2x) = 6x multiplier for your first task!
                    </div>
                  </div>
                </div>
              )}
              
              {/* Regular trait classification placeholder */}
              {!isFirstTask && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Regular trait classification form will go here...</p>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleSkipClassification}>
                  Skip
                </Button>
                <Button onClick={handleTraitClassificationComplete}>
                  Save & Continue
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 