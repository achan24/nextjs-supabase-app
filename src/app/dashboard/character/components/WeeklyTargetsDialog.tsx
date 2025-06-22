'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings2, ChevronRight, ChevronDown, Share2, Copy } from 'lucide-react'
import { useGoalSystem } from '@/hooks/useGoalSystem'
import { Progress } from "@/components/ui/progress"
import { createClient } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import { User } from '@supabase/auth-helpers-nextjs'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

interface LocalLifeArea {
  id: string
  name: string
  target: number
}

interface Subarea {
  id: string
  name: string
  target: number
  goals: Goal[]
}

interface Goal {
  id: string
  title: string
  target: number
}

interface WeeklyTargets {
  [key: string]: number[]
}

interface WeeklyTarget {
  user_id: string
  target_id: string
  target_type: 'area' | 'subarea' | 'goal'
  day_of_week: number
  points: number
}

interface WeeklyTargetsDialogProps {
  areas: LocalLifeArea[]
  onUpdateTargets: (areaId: string, targets: number[]) => void
  currentDayTargets: Record<string, number>
  subareaTargets: Record<string, { value: number; target: number }>
  goalTargets: Record<string, { value: number; target: number }>
  onUpdateSubareaTarget: (subareaId: string, target: number) => void
  onUpdateGoalTarget: (goalId: string, target: number) => void
  onUpdateAllTargets: (weeklyTargets: Record<string, number[]>) => void
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeeklyTargetsDialog({ 
  areas, 
  onUpdateTargets, 
  currentDayTargets,
  subareaTargets,
  goalTargets,
  onUpdateSubareaTarget,
  onUpdateGoalTarget,
  onUpdateAllTargets
}: WeeklyTargetsDialogProps) {
  const supabase = createClient()
  const { areas: goalSystemAreas } = useGoalSystem()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedAreas, setExpandedAreas] = useState<string[]>([])
  const [expandedSubareas, setExpandedSubareas] = useState<string[]>([])
  const [todayTargets, setTodayTargets] = useState<Record<string, number>>(currentDayTargets)
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily')

  // Get and monitor auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const getSubareasForArea = (area: LocalLifeArea) => {
    const goalSystemArea = goalSystemAreas.find(a => a.name.includes(area.name.split(' ')[1]))
    return goalSystemArea?.subareas || []
  }

  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTargets>(() => {
    const targets: WeeklyTargets = {}
    areas.forEach(area => {
      targets[area.id] = Array(7).fill(currentDayTargets[area.id] || area.target)
      const subareas = getSubareasForArea(area)
      subareas.forEach(subarea => {
        targets[subarea.id] = Array(7).fill(currentDayTargets[subarea.id] || 0)
        subarea.goals?.forEach(goal => {
          targets[goal.id] = Array(7).fill(currentDayTargets[goal.id] || 0)
        })
      })
    })
    return targets
  })

  // --- UUID to UI ID mapping ---
  function buildUuidToUiIdMap() {
    const map: Record<string, string> = {}
    // Areas
    areas.forEach(area => {
      const uuid = getAreaUUID(area.name)
      if (uuid) map[uuid] = area.id
      // Subareas
      const subareas = getSubareasForArea(area)
      subareas.forEach(subarea => {
        const subUuid = getSubareaUUID(area.name, subarea.name)
        if (subUuid) map[subUuid] = subarea.id
        // Goals
        subarea.goals?.forEach(goal => {
          const goalUuid = getGoalUUID(area.name, subarea.name, goal.title)
          if (goalUuid) map[goalUuid] = goal.id
        })
      })
    })
    return map
  }

  // Load existing weekly targets from database
  useEffect(() => {
    const loadWeeklyTargets = async () => {
      const { data: weeklyTargetsData, error } = await supabase
        .from('character_weekly_targets')
        .select('*')
      console.log('[WEEKLY TARGETS] Loaded from DB:', weeklyTargetsData, 'Error:', error)
      
      if (error) {
        console.error('Error loading weekly targets:', error)
        return
      }

      if (weeklyTargetsData) {
        const loadedTargets: WeeklyTargets = {}
        const uuidToUiId = buildUuidToUiIdMap()
        weeklyTargetsData.forEach(target => {
          const uiId = uuidToUiId[target.target_id]
          if (!uiId) return // skip if we can't map
          if (!loadedTargets[uiId]) {
            loadedTargets[uiId] = Array(7).fill(0)
          }
          loadedTargets[uiId][target.day_of_week] = target.points
        })
        console.log('[WEEKLY TARGETS] Mapped to UI IDs:', loadedTargets)
        setWeeklyTargets(prev => {
          const merged = { ...prev, ...loadedTargets }
          onUpdateAllTargets(merged)
          return merged
        })
      }
    }

    loadWeeklyTargets()
  }, [goalSystemAreas])

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => 
      prev.includes(areaId) 
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    )
  }

  const toggleSubarea = (subareaId: string) => {
    setExpandedSubareas(prev => 
      prev.includes(subareaId)
        ? prev.filter(id => id !== subareaId)
        : [...prev, subareaId]
    )
  }

  const handleWeeklyTargetChange = (id: string, dayIndex: number, value: number) => {
    setWeeklyTargets(prev => ({
      ...prev,
      [id]: prev[id].map((t, i) => i === dayIndex ? value : t)
    }))
  }

  useEffect(() => {
    setTodayTargets(currentDayTargets)
  }, [currentDayTargets])

  const handleTodayTargetChange = (areaId: string, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0)
    setTodayTargets(prev => ({
      ...prev,
      [areaId]: numValue
    }))
  }

  const getSubareaSum = (areaId: string) => {
    const area = areas.find(a => a.id === areaId)
    if (!area) return 0
    
    const subareas = getSubareasForArea(area)
    return subareas.reduce((sum, subarea) => {
      const target = (subareaTargets[subarea.id]?.target || 0)
      return sum + target
    }, 0)
  }

  const getRemainingPoints = (areaId: string) => {
    const areaTarget = todayTargets[areaId] || 0
    const usedPoints = getSubareaSum(areaId)
    return areaTarget - usedPoints
  }

  const handleSubareaTargetChange = (subareaId: string, value: string, areaId: string) => {
    const numValue = Math.max(0, parseInt(value) || 0)
    const area = areas.find(a => a.id === areaId)
    if (!area) return

    const subareas = getSubareasForArea(area)
    const currentSubarea = subareas.find(s => s.id === subareaId)
    if (!currentSubarea) return

    const currentTarget = subareaTargets[subareaId]?.target || 0
    const otherSubareasSum = getSubareaSum(areaId) - currentTarget
    const maxAllowed = todayTargets[areaId] - otherSubareasSum
    const newTarget = Math.min(numValue, maxAllowed)

    onUpdateSubareaTarget(subareaId, newTarget)

    // Also update weeklyTargets for today
    const today = new Date().getDay()
    const todayIndex = today === 0 ? 6 : today - 1
    setWeeklyTargets(prev => ({
      ...prev,
      [subareaId]: prev[subareaId]?.map((t, i) => i === todayIndex ? newTarget : t) || Array(7).fill(0).map((_, i) => i === todayIndex ? newTarget : 0)
    }))
  }

  const handleGoalTargetChange = (goalId: string, value: string, subareaTarget: number) => {
    const numValue = Math.min(Math.max(0, parseInt(value) || 0), subareaTarget)
    onUpdateGoalTarget(goalId, numValue)

    // Also update weeklyTargets for today
    const today = new Date().getDay()
    const todayIndex = today === 0 ? 6 : today - 1
    setWeeklyTargets(prev => ({
      ...prev,
      [goalId]: prev[goalId]?.map((t, i) => i === todayIndex ? numValue : t) || Array(7).fill(0).map((_, i) => i === todayIndex ? numValue : 0)
    }))
  }

  const applyToAllDays = (areaId: string, value: number) => {
    setWeeklyTargets(prev => ({
      ...prev,
      [areaId]: Array(7).fill(value)
    }))
  }

  // Helper to check for over-allocation
  function isOverAllocated() {
    let overAllocated = false;
    areas.forEach(area => {
      const subareas = getSubareasForArea(area);
      const total = todayTargets[area.id] || 0;
      const subSum = subareas.reduce((sum, sub) => sum + (subareaTargets[sub.id]?.target || 0), 0);
      if (subSum > total) overAllocated = true;
      subareas.forEach(sub => {
        const goalSum = sub.goals.reduce((sum, goal) => sum + (goalTargets[goal.id]?.target || 0), 0);
        if (goalSum > (subareaTargets[sub.id]?.target || 0)) overAllocated = true;
      });
    });
    return overAllocated;
  }

  const handleSaveChanges = async () => {
    if (isOverAllocated()) {
      toast.error('You have allocated more points to subareas or goals than the total allowed. Please fix before saving.');
      return;
    }
    if (isLoading) {
      console.log('Still loading user data...')
      return
    }
    if (!user?.id) {
      console.error('No user ID available')
      toast.error('Authentication error. Please try signing in again.')
      return
    }
    try {
      // First, delete all existing weekly targets for this user
      const { error: deleteError } = await supabase
        .from('character_weekly_targets')
        .delete()
        .eq('user_id', user.id)
      console.log('[WEEKLY TARGETS] Delete result:', deleteError)
      if (deleteError) {
        console.error('Error deleting existing weekly targets:', deleteError)
        toast.error('Failed to update weekly targets. Please try again.')
        return
      }
      // Prepare all the new weekly targets
      const newTargets: WeeklyTarget[] = []
      areas.forEach(area => {
        const areaUUID = getAreaUUID(area.name)
        if (!areaUUID) {
          console.error(`Could not find UUID for area: ${area.name}`)
          return
        }
        // Save all days for area
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          newTargets.push({
            user_id: user.id,
            target_id: areaUUID,
            target_type: 'area',
            day_of_week: dayIndex,
            points: weeklyTargets[area.id]?.[dayIndex] ?? 0
          })
        }
        // Save all days for subareas
        const subareas = getSubareasForArea(area)
        subareas.forEach(subarea => {
          const subareaUUID = getSubareaUUID(area.name, subarea.name)
          if (!subareaUUID) {
            console.error(`Could not find UUID for subarea: ${subarea.name}`)
            return
          }
          for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            newTargets.push({
              user_id: user.id,
              target_id: subareaUUID,
              target_type: 'subarea',
              day_of_week: dayIndex,
              points: weeklyTargets[subarea.id]?.[dayIndex] ?? 0
            })
          }
          // Save all days for goals
          subarea.goals?.forEach(goal => {
            const goalUUID = getGoalUUID(area.name, subarea.name, goal.title)
            if (!goalUUID) {
              console.error(`Could not find UUID for goal: ${goal.title}`)
              return
            }
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
              newTargets.push({
                user_id: user.id,
                target_id: goalUUID,
                target_type: 'goal',
                day_of_week: dayIndex,
                points: weeklyTargets[goal.id]?.[dayIndex] ?? 0
              })
            }
          })
        })
      })
      console.log('[WEEKLY TARGETS] Data to insert:', newTargets)
      // Insert all new targets
      const { error: insertError } = await supabase
        .from('character_weekly_targets')
        .insert(newTargets)
      console.log('[WEEKLY TARGETS] Insert result:', insertError)
      if (insertError) {
        console.error('Error saving weekly targets:', insertError)
        toast.error('Failed to save weekly targets. Please try again.')
        return
      }
      toast.success('Targets saved successfully!')
      onUpdateAllTargets(weeklyTargets)
    } catch (error) {
      console.error('Unexpected error saving weekly targets:', error)
      toast.error('An unexpected error occurred. Please try again.')
    }
  }

  const distributeRemainingPoints = (areaId: string) => {
    const area = areas.find(a => a.id === areaId)
    if (!area) return

    const subareas = getSubareasForArea(area)
    if (subareas.length === 0) return

    const remainingPoints = getRemainingPoints(areaId)
    if (remainingPoints <= 0) return

    // Calculate points per subarea (handle both integer and decimal distribution)
    const pointsPerSubarea = remainingPoints / subareas.length
    const basePoints = Math.floor(pointsPerSubarea)
    const extraPoint = pointsPerSubarea - basePoints

    // Distribute base points to all subareas and handle remainder
    let pointsToDistribute = remainingPoints
    subareas.forEach((subarea, index) => {
      const currentTarget = subareaTargets[subarea.id]?.target || 0
      let additionalPoints = basePoints
      
      // Add extra point to early subareas if we have a decimal remainder
      if (extraPoint > 0 && index < (pointsToDistribute - (basePoints * subareas.length))) {
        additionalPoints += 1
      }

      const newTarget = currentTarget + Math.min(additionalPoints, pointsToDistribute)
      onUpdateSubareaTarget(subarea.id, newTarget)
      pointsToDistribute -= additionalPoints
    })
  }

  const applyTodayToWeek = async () => {
    const today = new Date().getDay()
    const todayIndex = today === 0 ? 6 : today - 1

    // Update the local state first
    const updatedTargets = { ...weeklyTargets }
    areas.forEach(area => {
      const todayValue = weeklyTargets[area.id][todayIndex]
      updatedTargets[area.id] = Array(7).fill(todayValue)

      const subareas = getSubareasForArea(area)
      subareas.forEach(subarea => {
        if (weeklyTargets[subarea.id]) {
          const subareaValue = weeklyTargets[subarea.id][todayIndex]
          updatedTargets[subarea.id] = Array(7).fill(subareaValue)
        }
        subarea.goals?.forEach(goal => {
          if (weeklyTargets[goal.id]) {
            const goalValue = weeklyTargets[goal.id][todayIndex]
            updatedTargets[goal.id] = Array(7).fill(goalValue)
          }
        })
      })
    })
    setWeeklyTargets(updatedTargets)

    // Save to database
    await handleSaveChanges()
  }

  // Helper function to get the actual UUID for an area
  const getAreaUUID = (areaName: string) => {
    const area = goalSystemAreas.find(a => a.name.includes(areaName.split(' ')[1]))
    return area?.id
  }

  // Helper function to get the actual UUID for a subarea
  const getSubareaUUID = (areaName: string, subareaName: string) => {
    const area = goalSystemAreas.find(a => a.name.includes(areaName.split(' ')[1]))
    const subarea = area?.subareas.find(s => s.name === subareaName)
    return subarea?.id
  }

  // Helper function to get the actual UUID for a goal
  const getGoalUUID = (areaName: string, subareaName: string, goalTitle: string) => {
    const area = goalSystemAreas.find(a => a.name.includes(areaName.split(' ')[1]))
    const subarea = area?.subareas.find(s => s.name === subareaName)
    const goal = subarea?.goals.find(g => g.title === goalTitle)
    return goal?.id
  }

  // After loading weekly targets, sync todayTargets for the current day
  useEffect(() => {
    const today = new Date().getDay();
    const todayIndex = today === 0 ? 6 : today - 1;
    setTodayTargets(prev => {
      const updated: Record<string, number> = { ...prev };
      Object.entries(weeklyTargets).forEach(([id, targets]) => {
        updated[id] = targets[todayIndex] || 0;
      });
      return updated;
    });
  }, [weeklyTargets]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-4 text-red-500">
        Please sign in to manage weekly targets.
      </div>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Set Targets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" aria-describedby="weekly-targets-dialog-desc">
        <DialogHeader>
          <DialogTitle>Progress Targets</DialogTitle>
        </DialogHeader>
        <div id="weekly-targets-dialog-desc" className="sr-only">
          Set and manage your daily and weekly progress targets for each area, subarea, and goal.
        </div>
        <Tabs defaultValue="daily" value={activeTab} onValueChange={v => setActiveTab(v as 'daily' | 'weekly')} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="daily">Today's Targets</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily">
            <div className="space-y-6">
              {areas.map(area => {
                const isExpanded = expandedAreas.includes(area.id)
                const subareas = getSubareasForArea(area)
                const remainingPoints = getRemainingPoints(area.id)
                const totalPoints = todayTargets[area.id] || 0
                const usedPoints = totalPoints - remainingPoints
                const usedPercentage = totalPoints > 0 ? (usedPoints / totalPoints) * 100 : 0
                
                return (
                  <div key={area.id} className="space-y-2">
                    <div className="flex items-center justify-between">
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
                        <h3 className="font-medium">{area.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20"
                          min={0}
                          value={todayTargets[area.id]}
                          onChange={(e) => {
                            handleTodayTargetChange(area.id, e.target.value)
                            // Also update weeklyTargets for today
                            const today = new Date().getDay()
                            const todayIndex = today === 0 ? 6 : today - 1
                            setWeeklyTargets(prev => ({
                              ...prev,
                              [area.id]: prev[area.id]?.map((t, i) => i === todayIndex ? parseInt(e.target.value) || 0 : t) || Array(7).fill(0).map((_, i) => i === todayIndex ? parseInt(e.target.value) || 0 : 0)
                            }))
                          }}
                        />
                        <span className="text-sm text-gray-500">points total</span>
                      </div>
                    </div>

                    {/* Subareas */}
                    {isExpanded && subareas.length > 0 && (
                      <div className="pl-8 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            {remainingPoints} points remaining to distribute
                          </div>
                          {remainingPoints > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7"
                              onClick={() => distributeRemainingPoints(area.id)}
                            >
                              <Share2 className="h-3 w-3 mr-2" />
                              Distribute Evenly
                            </Button>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Points allocated</span>
                            <span className="text-gray-500">{usedPoints} / {totalPoints}</span>
                          </div>
                          <Progress value={usedPercentage} className="h-1" />
                        </div>
                        {subareas.map(subarea => {
                          const isSubareaExpanded = expandedSubareas.includes(subarea.id)
                          const subareaState = subareaTargets[subarea.id] || { value: 0, target: 0 }
                          
                          return (
                            <div key={subarea.id} className="space-y-2">
                              <div className="flex items-center justify-between">
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
                                  <span className="text-sm">{subarea.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    className="w-20"
                                    min={0}
                                    max={subareaState.target + remainingPoints}
                                    value={subareaState.target}
                                    onChange={(e) => {
                                      handleSubareaTargetChange(subarea.id, e.target.value, area.id)
                                      // Also update weeklyTargets for today
                                      const today = new Date().getDay()
                                      const todayIndex = today === 0 ? 6 : today - 1
                                      setWeeklyTargets(prev => ({
                                        ...prev,
                                        [subarea.id]: prev[subarea.id]?.map((t, i) => i === todayIndex ? parseInt(e.target.value) || 0 : t) || Array(7).fill(0).map((_, i) => i === todayIndex ? parseInt(e.target.value) || 0 : 0)
                                      }))
                                    }}
                                  />
                                  <span className="text-sm text-gray-500">/ {todayTargets[area.id]} pts</span>
                                </div>
                              </div>

                              {/* Goals */}
                              {isSubareaExpanded && subarea.goals.length > 0 && (
                                <div className="pl-8 space-y-2">
                                  {subarea.goals.map(goal => {
                                    const goalState = goalTargets[goal.id] || { value: 0, target: Math.min(1, subareaState.target) }
                                    
                                    return (
                                      <div key={goal.id} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">{goal.title}</span>
                                        <div className="flex items-center gap-2">
                                          <Input
                                            type="number"
                                            className="w-20"
                                            min={0}
                                            max={subareaState.target}
                                            value={goalState.target}
                                            onChange={(e) => {
                                              handleGoalTargetChange(goal.id, e.target.value, subareaState.target)
                                              // Also update weeklyTargets for today
                                              const today = new Date().getDay()
                                              const todayIndex = today === 0 ? 6 : today - 1
                                              setWeeklyTargets(prev => ({
                                                ...prev,
                                                [goal.id]: prev[goal.id]?.map((t, i) => i === todayIndex ? parseInt(e.target.value) || 0 : t) || Array(7).fill(0).map((_, i) => i === todayIndex ? parseInt(e.target.value) || 0 : 0)
                                              }))
                                            }}
                                          />
                                          <span className="text-sm text-gray-500">/ {subareaState.target} pts</span>
                                        </div>
                                      </div>
                                    )
                                  })}
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
          </TabsContent>

          <TabsContent value="weekly">
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyTodayToWeek}
                  className="mb-4"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Apply Today's Targets to Week
                </Button>
              </div>
              {areas.map(area => (
                <div key={area.id} className="space-y-2">
                  <div 
                    className="flex items-center cursor-pointer" 
                    onClick={() => toggleArea(area.id)}
                  >
                    {expandedAreas.includes(area.id) ? (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    <h3 className="text-lg font-semibold">{area.name}</h3>
                  </div>

                  <div className="grid grid-cols-8 gap-2 items-center">
                    <div className="font-medium">Points</div>
                    {DAYS_OF_WEEK.map((day, index) => (
                      <Input
                        key={index}
                        type="number"
                        min={0}
                        value={weeklyTargets[area.id][index]}
                        onChange={(e) => handleWeeklyTargetChange(area.id, index, parseFloat(e.target.value) || 0)}
                        className="w-full"
                      />
                    ))}
                  </div>

                  {expandedAreas.includes(area.id) && (
                    <div className="ml-6 space-y-4">
                      {getSubareasForArea(area).map(subarea => (
                        <div key={subarea.id} className="space-y-2">
                          <div 
                            className="flex items-center cursor-pointer" 
                            onClick={() => toggleSubarea(subarea.id)}
                          >
                            {expandedSubareas.includes(subarea.id) ? (
                              <ChevronDown className="h-4 w-4 mr-2" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2" />
                            )}
                            <h4 className="font-medium">{subarea.name}</h4>
                          </div>

                          <div className="grid grid-cols-8 gap-2 items-center">
                            <div className="font-medium">Points</div>
                            {DAYS_OF_WEEK.map((day, index) => (
                              <Input
                                key={index}
                                type="number"
                                min={0}
                                value={weeklyTargets[subarea.id]?.[index] || 0}
                                onChange={(e) => handleWeeklyTargetChange(subarea.id, index, parseFloat(e.target.value) || 0)}
                                className="w-full"
                              />
                            ))}
                          </div>

                          {expandedSubareas.includes(subarea.id) && (
                            <div className="ml-6 space-y-2">
                              {subarea.goals?.map(goal => (
                                <div key={goal.id} className="space-y-2">
                                  <h5 className="font-medium">{goal.title}</h5>
                                  <div className="grid grid-cols-8 gap-2 items-center">
                                    <div className="font-medium">Points</div>
                                    {DAYS_OF_WEEK.map((day, index) => (
                                      <Input
                                        key={index}
                                        type="number"
                                        min={0}
                                        value={weeklyTargets[goal.id]?.[index] || 0}
                                        onChange={(e) => handleWeeklyTargetChange(goal.id, index, parseFloat(e.target.value) || 0)}
                                        className="w-full"
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={handleSaveChanges}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 