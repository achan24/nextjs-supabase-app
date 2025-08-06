'use client';

import { useState } from 'react';
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
  const supabase = createClient();

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
      setTitle('');
      setDescription('');
      setSelectedGoalId(null);
      setIsOpen(false);
      onTaskCreated?.();
    } catch (error) {
      console.error('[TaskCreator] Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleCreateTask();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            Create Task
            {areaId && <span className="text-sm text-muted-foreground">(Area)</span>}
            {subareaId && <span className="text-sm text-muted-foreground">(Subarea)</span>}
            {goalId && <span className="text-sm text-muted-foreground">(Goal)</span>}
          </DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
} 