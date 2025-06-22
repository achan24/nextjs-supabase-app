'use client'

import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Plus, Minus, ChevronRight, ChevronDown, Settings2 } from 'lucide-react'
import WeeklyTargetsDialog from './WeeklyTargetsDialog'
import { useGoalSystem } from '@/hooks/useGoalSystem'
import { LifeGoal } from '@/types/goal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface LocalLifeArea {
  id: string;
  name: string;
  target: number;
}

const lifeAreas: LocalLifeArea[] = [
  { id: 'work-learning', name: '🎓 Work & Learning', target: 5 },
  { id: 'health-fitness', name: '💪 Health & Fitness', target: 3 },
  { id: 'relationships', name: '❤️ Relationships', target: 2 },
  { id: 'environment', name: '🧼 Environment & Hygiene', target: 2 },
  { id: 'finances', name: '💰 Finances', target: 1 },
  { id: 'mental-health', name: '🧠 Mental Health & Reflection', target: 3 },
  { id: 'play-hobbies', name: '🎨 Play & Hobbies', target: 2 }
]

interface ProgressState {
  value: number;
  target: number;
}

interface TargetDialogProps {
  title: string;
  currentTarget: number;
  maxTarget?: number;
  onUpdateTarget: (newTarget: number) => void;
}

function TargetDialog({ title, currentTarget, maxTarget, onUpdateTarget }: TargetDialogProps) {
  const [newTarget, setNewTarget] = useState(
    currentTarget !== undefined && currentTarget !== null ? currentTarget.toString() : "1"
  )

  useEffect(() => {
    setNewTarget(
      currentTarget !== undefined && currentTarget !== null ? currentTarget.toString() : "1"
    )
  }, [currentTarget])

  const handleSave = () => {
    const parsedTarget = Math.max(1, parseInt(newTarget) || 1)
    const constrainedTarget = maxTarget ? Math.min(parsedTarget, maxTarget) : parsedTarget
    onUpdateTarget(constrainedTarget)
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
              max={maxTarget}
              value={newTarget}
              onChange={(e) => setNewTarget(e.currentTarget.value)}
              className="w-24"
            />
            <span>points{maxTarget ? ` (max: ${maxTarget})` : ''}</span>
          </div>
          <Button onClick={handleSave}>Save Target</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ProgressBars() {
  const { areas, loading } = useGoalSystem()
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({})
  const [expandedSubareas, setExpandedSubareas] = useState<Record<string, boolean>>({})
  
  // Current progress for today - areas
  const [progress, setProgress] = useState<Record<string, number>>(
    Object.fromEntries(lifeAreas.map(area => [area.id, 0]))
  )

  // Current progress for subareas and goals
  const [subareaProgress, setSubareaProgress] = useState<Record<string, ProgressState>>({})
  const [goalProgress, setGoalProgress] = useState<Record<string, ProgressState>>({})

  // Daily targets for each area (separate from weekly targets)
  const [dailyAreaTargets, setDailyAreaTargets] = useState<Record<string, number>>(
    Object.fromEntries(lifeAreas.map(area => [area.id, area.target]))
  )

  // Weekly targets for each area (for the weekly dialog)
  const [weeklyTargets, setWeeklyTargets] = useState<Record<string, number[]>>(
    Object.fromEntries(lifeAreas.map(area => [area.id, Array(7).fill(area.target)]))
  )

  // Get current day's target (0 = Monday, 6 = Sunday)
  const getCurrentDayTarget = (areaId: string) => {
    return dailyAreaTargets[areaId]
  }

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

  const incrementProgress = (areaId: string) => {
    setProgress(prev => {
      const currentTarget = getCurrentDayTarget(areaId)
      const newValue = Math.min(prev[areaId] + 1, currentTarget)
      return { ...prev, [areaId]: newValue }
    })
  }

  const decrementProgress = (areaId: string) => {
    setProgress(prev => {
      const newValue = Math.max(prev[areaId] - 1, 0)
      return { ...prev, [areaId]: newValue }
    })
  }

  const incrementSubareaProgress = (subareaId: string, areaTarget: number) => {
    setSubareaProgress(prev => {
      const current = prev[subareaId] || { value: 0, target: Math.min(3, areaTarget) }
      return {
        ...prev,
        [subareaId]: {
          ...current,
          value: Math.min(current.value + 1, current.target)
        }
      }
    })
  }

  const decrementSubareaProgress = (subareaId: string) => {
    setSubareaProgress(prev => {
      const current = prev[subareaId] || { value: 0, target: 3 }
      return {
        ...prev,
        [subareaId]: {
          ...current,
          value: Math.max(current.value - 1, 0)
        }
      }
    })
  }

  const incrementGoalProgress = (goalId: string, subareaTarget: number) => {
    setGoalProgress(prev => {
      const current = prev[goalId] || { value: 0, target: Math.min(1, subareaTarget) }
      return {
        ...prev,
        [goalId]: {
          ...current,
          value: Math.min(current.value + 1, current.target)
        }
      }
    })
  }

  const decrementGoalProgress = (goalId: string) => {
    setGoalProgress(prev => {
      const current = prev[goalId] || { value: 0, target: 1 }
      return {
        ...prev,
        [goalId]: {
          ...current,
          value: Math.max(current.value - 1, 0)
        }
      }
    })
  }

  const handleUpdateTargets = (areaId: string, targets: number[]) => {
    setWeeklyTargets(prev => ({
      ...prev,
      [areaId]: targets
    }))
    // Update today's target
    const today = new Date().getDay()
    const dayIndex = today === 0 ? 6 : today - 1
    setDailyAreaTargets(prev => ({
      ...prev,
      [areaId]: targets[dayIndex]
    }))
  }

  const updateAreaTarget = (areaId: string, newTarget: number) => {
    setDailyAreaTargets(prev => ({
      ...prev,
      [areaId]: newTarget
    }))
    
    // Update subareas if their targets exceed the new area target
    setSubareaProgress(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(subareaId => {
        if (updated[subareaId].target > newTarget) {
          updated[subareaId] = {
            ...updated[subareaId],
            target: newTarget
          }
        }
      })
      return updated
    })
  }

  const updateSubareaTarget = (subareaId: string, newTarget: number, areaTarget: number) => {
    const constrainedTarget = Math.min(newTarget, areaTarget)
    setSubareaProgress(prev => ({
      ...prev,
      [subareaId]: {
        ...(prev[subareaId] || { value: 0 }),
        target: constrainedTarget
      }
    }))

    // Update goals if their targets exceed the new subarea target
    setGoalProgress(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(goalId => {
        if (updated[goalId].target > constrainedTarget) {
          updated[goalId] = {
            ...updated[goalId],
            target: constrainedTarget
          }
        }
      })
      return updated
    })
  }

  const updateGoalTarget = (goalId: string, newTarget: number, subareaTarget: number) => {
    const constrainedTarget = Math.min(newTarget, subareaTarget)
    setGoalProgress(prev => ({
      ...prev,
      [goalId]: {
        ...(prev[goalId] || { value: 0 }),
        target: constrainedTarget
      }
    }))
  }

  const handleUpdateAllTargets = (allWeeklyTargets: Record<string, number[]>) => {
    setWeeklyTargets(allWeeklyTargets)
    // Update dailyAreaTargets for today
    const today = new Date().getDay()
    const todayIndex = today === 0 ? 6 : today - 1
    setDailyAreaTargets(prev => {
      const updated = { ...prev }
      Object.keys(allWeeklyTargets).forEach(id => {
        if (lifeAreas.some(a => a.id === id)) {
          updated[id] = allWeeklyTargets[id][todayIndex] || 0
        }
      })
      return updated
    })
    // Update subareaProgress and goalProgress for today
    setSubareaProgress(prev => {
      const updated = { ...prev }
      Object.keys(allWeeklyTargets).forEach(id => {
        if (!lifeAreas.some(a => a.id === id)) {
          updated[id] = {
            ...(prev[id] || { value: 0 }),
            target: allWeeklyTargets[id][todayIndex] || 0
          }
        }
      })
      return updated
    })
    setGoalProgress(prev => {
      const updated = { ...prev }
      Object.keys(allWeeklyTargets).forEach(id => {
        if (!lifeAreas.some(a => a.id === id)) {
          updated[id] = {
            ...(prev[id] || { value: 0 }),
            target: allWeeklyTargets[id][todayIndex] || 0
          }
        }
      })
      return updated
    })
  }

  const renderProgressControls = (
    id: string,
    currentValue: number,
    targetValue: number,
    onIncrement: () => void,
    onDecrement: () => void,
    title: string,
    maxTarget?: number,
    onUpdateTarget?: (newTarget: number) => void
  ) => (
    <div className="flex items-center gap-2">
      <span>{currentValue}/{targetValue} pts</span>
      <div className="flex gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-6 w-6"
          onClick={onDecrement}
          disabled={currentValue === 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-6 w-6"
          onClick={onIncrement}
          disabled={currentValue === targetValue}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {onUpdateTarget && (
        <TargetDialog
          title={title}
          currentTarget={targetValue}
          maxTarget={maxTarget}
          onUpdateTarget={onUpdateTarget}
        />
      )}
    </div>
  )

  const renderGoal = (goal: LifeGoal, subareaTarget: number) => {
    const goalState = goalProgress[goal.id] || { value: 0, target: Math.min(1, subareaTarget) }
    const progressPercentage = (goalState.value / goalState.target) * 100

    return (
      <div key={goal.id} className="space-y-1">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{goal.title}</span>
          {renderProgressControls(
            goal.id,
            goalState.value,
            goalState.target,
            () => incrementGoalProgress(goal.id, subareaTarget),
            () => decrementGoalProgress(goal.id),
            goal.title,
            subareaTarget,
            (newTarget) => updateGoalTarget(goal.id, newTarget, subareaTarget)
          )}
        </div>
        <Progress value={progressPercentage} className="h-1" />
      </div>
    )
  }

  if (loading) {
    return <div>Loading areas...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Daily Progress</h2>
        <WeeklyTargetsDialog 
          areas={lifeAreas} 
          onUpdateTargets={handleUpdateTargets}
          currentDayTargets={dailyAreaTargets}
          subareaTargets={subareaProgress}
          goalTargets={goalProgress}
          onUpdateSubareaTarget={(subareaId, target) => {
            setSubareaProgress(prev => ({
              ...prev,
              [subareaId]: {
                ...(prev[subareaId] || { value: 0 }),
                target
              }
            }))
          }}
          onUpdateGoalTarget={(goalId, target) => {
            setGoalProgress(prev => ({
              ...prev,
              [goalId]: {
                ...(prev[goalId] || { value: 0 }),
                target
              }
            }))
          }}
          onUpdateAllTargets={handleUpdateAllTargets}
        />
      </div>

      {lifeAreas.map((area) => {
        const currentProgress = progress[area.id]
        const currentTarget = getCurrentDayTarget(area.id)
        const progressPercentage = (currentProgress / currentTarget) * 100
        const isExpanded = expandedAreas[area.id]
        const goalSystemArea = areas.find(a => a.name.includes(area.name.split(' ')[1])) // Match by second word
        const subareas = goalSystemArea?.subareas || []
        
        return (
          <div key={area.id} className="space-y-2">
            {/* Main Area Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm mb-1">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleArea(area.id)}
                  >
                    {subareas.length > 0 && (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    )}
                  </Button>
                  <span>{area.name}</span>
                </div>
                {renderProgressControls(
                  area.id,
                  currentProgress,
                  currentTarget,
                  () => incrementProgress(area.id),
                  () => decrementProgress(area.id),
                  area.name,
                  undefined,
                  (newTarget) => updateAreaTarget(area.id, newTarget)
                )}
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Subareas */}
            {isExpanded && subareas.length > 0 && (
              <div className="pl-8 space-y-3 mt-3">
                {subareas.map((subarea) => {
                  const isSubareaExpanded = expandedSubareas[subarea.id]
                  const subareaState = subareaProgress[subarea.id] || { value: 0, target: Math.min(3, currentTarget) }
                  const subareaProgressPercentage = (subareaState.value / subareaState.target) * 100

                  return (
                    <div key={subarea.id} className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleSubarea(subarea.id)}
                            >
                              {subarea.goals.length > 0 && (
                                isSubareaExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )
                              )}
                            </Button>
                            <span>{subarea.name}</span>
                          </div>
                          {renderProgressControls(
                            subarea.id,
                            subareaState.value,
                            subareaState.target,
                            () => incrementSubareaProgress(subarea.id, currentTarget),
                            () => decrementSubareaProgress(subarea.id),
                            subarea.name,
                            currentTarget,
                            (newTarget) => updateSubareaTarget(subarea.id, newTarget, currentTarget)
                          )}
                        </div>
                        <Progress value={subareaProgressPercentage} className="h-1.5" />
                      </div>

                      {/* Goals */}
                      {isSubareaExpanded && subarea.goals.length > 0 && (
                        <div className="pl-8 space-y-2 mt-2">
                          {subarea.goals.map(goal => renderGoal(goal, subareaState.target))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
} 