'use client'

import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Plus, Minus, ChevronRight, ChevronDown, Settings2, Target } from 'lucide-react'
import { useGoalSystem } from '@/hooks/useGoalSystem'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LifeGoalArea, LifeGoalSubarea } from '@/types/goal'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { resetAllDailyPoints, savePointsToDate } from '@/services/characterProgressService'
import { updateXPFromPoints } from '@/services/characterService'

const areaIcons: Record<string, string> = {
  'Work & Learning': '📚',
  'Health & Fitness': '💪',
  'Relationships': '❤️',
  'Environment & Hygiene': '🌿',
  'Finances': '💰',
  'Mental Health & Reflection': '🧘',
  'Play & Hobbies': '🎮'
}

interface TargetDialogProps {
  title: string;
  currentTarget: number;
  onUpdateTarget: (newTarget: number) => void;
}

function TargetDialog({ title, currentTarget = 1, onUpdateTarget }: TargetDialogProps) {
  const [newTarget, setNewTarget] = useState(currentTarget.toString())

  useEffect(() => {
    setNewTarget(currentTarget.toString())
  }, [currentTarget])

  const handleSave = () => {
    const parsedTarget = Math.max(1, parseInt(newTarget) || 1)
    onUpdateTarget(parsedTarget)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-2">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="target-dialog-description">
        <DialogHeader>
          <DialogTitle>Set Target for {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4" id="target-dialog-description">
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min="1"
              value={newTarget}
              onChange={(e) => setNewTarget(e.currentTarget.value)}
              className="w-24"
            />
            <span>points</span>
          </div>
          <Button onClick={handleSave}>Save Target</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface SetTargetsDialogProps {
  areas: LifeGoalArea[];
  onUpdateTargets: (areaId: string, target: number, type: 'area' | 'subarea' | 'goal') => void;
}

function SetTargetsDialog({ areas, onUpdateTargets }: SetTargetsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Target className="h-4 w-4" />
          Set Targets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set Daily Targets</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
          {areas.map((area) => (
            <div key={area.id} className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-bold flex-1">{area.name}</span>
                <Input
                  type="number"
                  min="0"
                  defaultValue={area.target_points}
                  className="w-24"
                  onChange={(e) => onUpdateTargets(area.id, parseInt(e.target.value) || 0, 'area')}
                />
                <span className="text-sm text-gray-500 w-12">points</span>
              </div>
              {area.subareas.map((subarea) => (
                <div key={subarea.id} className="ml-6 space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="flex-1">{subarea.name}</span>
                    <Input
                      type="number"
                      min="0"
                      defaultValue={subarea.target_points}
                      className="w-24"
                      onChange={(e) => onUpdateTargets(subarea.id, parseInt(e.target.value) || 0, 'subarea')}
                    />
                    <span className="text-sm text-gray-500 w-12">points</span>
                  </div>
                  {subarea.goals.map((goal) => (
                    <div key={goal.id} className="ml-6 flex items-center gap-4">
                      <span className="flex-1 text-sm text-gray-700">{goal.title}</span>
                      <Input
                        type="number"
                        min="0"
                        defaultValue={goal.target_points}
                        className="w-24"
                        onChange={(e) => onUpdateTargets(goal.id, parseInt(e.target.value) || 0, 'goal')}
                      />
                      <span className="text-sm text-gray-500 w-12">points</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ProgressItemProps {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  level: 'area' | 'subarea' | 'goal';
  icon?: string;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onUpdateTarget?: (newTarget: number) => void;
  onClick?: () => void;
}

function ProgressItem({
  title,
  currentValue,
  targetValue,
  level,
  icon,
  isExpanded,
  hasChildren,
  onToggle,
  onIncrement,
  onDecrement,
  onUpdateTarget,
  onClick
}: ProgressItemProps) {
  const progressPercentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

  return (
    <div className={`pl-${level === 'goal' ? 8 : level === 'subarea' ? 4 : 0}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1">
            {hasChildren && (
              <button
                onClick={onToggle}
                className="p-0.5 hover:bg-gray-100 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            <div
              className={`flex items-center gap-2 flex-1 ${onClick ? 'cursor-pointer hover:text-blue-600' : ''}`}
              onClick={onClick}
            >
              {icon && <span className={level === 'area' ? 'text-lg' : ''}>{icon}</span>}
              <span className={`
                ${level === 'area' ? 'text-lg font-bold' : ''}
                ${level === 'subarea' ? 'font-medium' : ''}
                ${level === 'goal' ? 'text-sm text-gray-600' : ''}
              `}>{title}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`${level === 'area' ? 'h-7 w-7' : 'h-6 w-6'}`}
            onClick={onDecrement}
          >
            <Minus className={`${level === 'area' ? 'h-5 w-5' : 'h-4 w-4'}`} />
          </Button>
          <span className={`text-sm w-12 text-center ${level === 'goal' ? 'text-gray-600' : ''}`}>
            {currentValue} / {targetValue}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={`${level === 'area' ? 'h-7 w-7' : 'h-6 w-6'}`}
            onClick={onIncrement}
          >
            <Plus className={`${level === 'area' ? 'h-5 w-5' : 'h-4 w-4'}`} />
          </Button>
          {onUpdateTarget && (
            <TargetDialog
              title={title}
              currentTarget={targetValue}
              onUpdateTarget={onUpdateTarget}
            />
          )}
        </div>
      </div>
      <Progress value={progressPercentage} className="h-1 mt-0.5" />
    </div>
  )
}

export default function ProgressBars() {
  const router = useRouter()
  const { areas, loading, updateArea, updateSubarea, updateGoal, fetchAreas } = useGoalSystem()
  const supabase = createClient()
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({})
  const [expandedSubareas, setExpandedSubareas] = useState<Record<string, boolean>>({})
  const { user } = useAuth()
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [saveYesterdayDialogOpen, setSaveYesterdayDialogOpen] = useState(false)
  
  const handleUpdateTarget = async (id: string, newTarget: number, type: 'area' | 'subarea' | 'goal' = 'area') => {
    try {
      if (type === 'subarea') {
        await updateSubarea(id, { target_points: newTarget });
      } else if (type === 'goal') {
        await updateGoal(id, { target_points: newTarget });
      } else {
        await updateArea(id, { target_points: newTarget });
      }
    } catch (error) {
      console.error('Error updating target:', error);
      toast.error('Failed to update target');
    }
  };

  const handleIncrement = async (id: string, type: 'area' | 'subarea' | 'goal' = 'area') => {
    try {
      let current = 0;
      if (type === 'subarea') {
        const subarea = areas.flatMap(a => a.subareas).find(s => s.id === id);
        current = subarea?.daily_points || 0;
        console.log('[INCREMENT SUBAREA]', { id, current, next: current + 1, subarea });
        await updateSubarea(id, { daily_points: current + 1 });
      } else if (type === 'goal') {
        const goal = areas.flatMap(a => a.subareas).flatMap(s => s.goals).find(g => g.id === id);
        current = goal?.daily_points || 0;
        console.log('[INCREMENT GOAL]', { id, current, next: current + 1, goal });
        await updateGoal(id, { daily_points: current + 1 });
      } else {
        const area = areas.find(a => a.id === id);
        current = area?.daily_points || 0;
        console.log('[INCREMENT AREA]', { id, current, next: current + 1, area });
        await updateArea(id, { daily_points: current + 1 });
      }
    } catch (error) {
      console.error('[INCREMENT ERROR]', error);
      toast.error('Failed to increment points');
    }
  };

  const handleDecrement = async (id: string, type: 'area' | 'subarea' | 'goal' = 'area') => {
    try {
      let current = 0;
      if (type === 'subarea') {
        const subarea = areas.flatMap(a => a.subareas).find(s => s.id === id);
        current = subarea?.daily_points || 0;
        if (current > 0) {
          await updateSubarea(id, { daily_points: current - 1 });
        }
      } else if (type === 'goal') {
        const goal = areas.flatMap(a => a.subareas).flatMap(s => s.goals).find(g => g.id === id);
        current = goal?.daily_points || 0;
        if (current > 0) {
          await updateGoal(id, { daily_points: current - 1 });
        }
      } else {
        const area = areas.find(a => a.id === id);
        current = area?.daily_points || 0;
        if (current > 0) {
          await updateArea(id, { daily_points: current - 1 });
        }
      }
    } catch (error) {
      console.error('[DECREMENT ERROR]', error);
      toast.error('Failed to decrement points');
    }
  };

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => ({
      ...prev,
      [areaId]: !prev[areaId]
    }))
  }

  const toggleSubarea = (subareaId: string) => {
    setExpandedSubareas(prev => ({
      ...prev,
      [subareaId]: !prev[subareaId]
    }))
  }

  const handleGoalClick = (areaId: string, subareaId?: string, goalId?: string) => {
    if (goalId) {
      router.push(`/dashboard/goal?tab=goals&goal=${goalId}&subarea=${subareaId}`)
    } else if (subareaId) {
      router.push(`/dashboard/goal?tab=goals&subarea=${subareaId}`)
    } else {
      router.push(`/dashboard/goal?tab=goals&area=${areaId}`)
    }
  }

  const handleResetPoints = async () => {
    console.log('[DEBUG] handleResetPoints called');
    console.log('[DEBUG] user:', user);
    if (!user?.id) {
      console.log('[DEBUG] No user ID found');
      return;
    }
    try {
      console.log('[DEBUG] Calling resetAllDailyPoints with user ID:', user.id);
      await resetAllDailyPoints(user.id);
      // Reset character XP since it's just for today's progress
      await supabase
        .from('characters')
        .update({ xp: 0, level: 1 })
        .eq('user_id', user.id);
      console.log('[DEBUG] resetAllDailyPoints completed');
      // Refresh the areas data by calling fetchAreas from useGoalSystem
      await fetchAreas();
      console.log('[DEBUG] fetchAreas completed');
      toast.success('Daily points have been reset.');
      setResetDialogOpen(false);
    } catch (error) {
      console.error('[DEBUG] Error in handleResetPoints:', error);
      toast.error('Failed to reset daily points. Please try again.');
    }
  };

  const handleSaveToYesterday = async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedDate = yesterday.toISOString().split('T')[0];
    
    try {
      await savePointsToDate(formattedDate);
      toast.success('Points saved to yesterday');
      setSaveYesterdayDialogOpen(false);
    } catch (error) {
      console.error('Error saving points:', error);
      toast.error('Failed to save points');
    }
  };

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <SetTargetsDialog areas={areas} onUpdateTargets={handleUpdateTarget} />
          <Dialog open={saveYesterdayDialogOpen} onOpenChange={setSaveYesterdayDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                Save as Yesterday's Points
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Current Points as Yesterday's</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p>Are you sure you want to save current points as yesterday's progress? This will overwrite any existing data for yesterday.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSaveYesterdayDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveToYesterday}>
                  Save to Yesterday
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                console.log('[DEBUG] Reset button clicked');
                setResetDialogOpen(true);
              }}
            >
              Reset Daily Points
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Daily Points?</DialogTitle>
            </DialogHeader>
            <div className="py-4">Are you sure you want to reset all daily points to zero? This cannot be undone for today.</div>
            <Button 
              onClick={() => {
                console.log('[DEBUG] Reset confirmation clicked');
                handleResetPoints();
              }} 
              variant="destructive"
            >
              Yes, Reset
            </Button>
            <Button onClick={() => setResetDialogOpen(false)} variant="outline">Cancel</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1">
        {areas.map((area) => (
          <div key={area.id} className="space-y-1">
            <ProgressItem
              id={area.id}
              title={area.name}
              currentValue={area.daily_points || 0}
              targetValue={area.target_points || 0}
              onIncrement={() => handleIncrement(area.id)}
              onDecrement={() => handleDecrement(area.id)}
              onUpdateTarget={(newTarget) => handleUpdateTarget(area.id, newTarget)}
              icon={areaIcons[area.name]}
              level="area"
              isExpanded={expandedAreas[area.id] || false}
              onToggle={() => toggleArea(area.id)}
              hasChildren={area.subareas.length > 0}
              onClick={() => handleGoalClick(area.id)}
            />
            
            {expandedAreas[area.id] && area.subareas.map((subarea) => (
              <div key={subarea.id} className="space-y-1">
                <ProgressItem
                  id={subarea.id}
                  title={subarea.name}
                  currentValue={subarea.daily_points || 0}
                  targetValue={subarea.target_points || 0}
                  onIncrement={() => handleIncrement(subarea.id, 'subarea')}
                  onDecrement={() => handleDecrement(subarea.id, 'subarea')}
                  onUpdateTarget={(newTarget) => handleUpdateTarget(subarea.id, newTarget, 'subarea')}
                  level="subarea"
                  isExpanded={expandedSubareas[subarea.id] || false}
                  onToggle={() => toggleSubarea(subarea.id)}
                  hasChildren={subarea.goals.length > 0}
                  onClick={() => handleGoalClick(area.id, subarea.id)}
                />

                {expandedSubareas[subarea.id] && subarea.goals.map((goal) => (
                  <ProgressItem
                    key={goal.id}
                    id={goal.id}
                    title={goal.title}
                    currentValue={goal.daily_points || 0}
                    targetValue={goal.target_points || 0}
                    onIncrement={() => handleIncrement(goal.id, 'goal')}
                    onDecrement={() => handleDecrement(goal.id, 'goal')}
                    onUpdateTarget={(newTarget) => handleUpdateTarget(goal.id, newTarget, 'goal')}
                    level="goal"
                    isExpanded={false}
                    onToggle={() => {}}
                    hasChildren={false}
                    onClick={() => handleGoalClick(area.id, subarea.id, goal.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
} 