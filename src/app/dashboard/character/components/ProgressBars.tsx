'use client'

import { useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Plus, Minus, ChevronRight, ChevronDown } from 'lucide-react'
import WeeklyTargetsDialog from './WeeklyTargetsDialog'
import { useGoalSystem } from '@/hooks/useGoalSystem'

const lifeAreas = [
  { id: 'work-learning', name: '🎓 Work & Learning', target: 5 },
  { id: 'health-fitness', name: '💪 Health & Fitness', target: 3 },
  { id: 'relationships', name: '❤️ Relationships', target: 2 },
  { id: 'environment', name: '🧼 Environment & Hygiene', target: 2 },
  { id: 'finances', name: '💰 Finances', target: 1 },
  { id: 'mental-health', name: '🧠 Mental Health & Reflection', target: 3 },
  { id: 'play-hobbies', name: '🎨 Play & Hobbies', target: 2 }
]

export default function ProgressBars() {
  const { areas, loading } = useGoalSystem()
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({})
  
  // Current progress for today
  const [progress, setProgress] = useState<Record<string, number>>(
    Object.fromEntries(lifeAreas.map(area => [area.id, 0]))
  )

  // Weekly targets for each area
  const [weeklyTargets, setWeeklyTargets] = useState<Record<string, number[]>>(
    Object.fromEntries(lifeAreas.map(area => [area.id, Array(7).fill(area.target)]))
  )

  // Get current day's target (0 = Monday, 6 = Sunday)
  const getCurrentDayTarget = (areaId: string) => {
    const today = new Date().getDay()
    const dayIndex = today === 0 ? 6 : today - 1
    return weeklyTargets[areaId][dayIndex]
  }

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => ({
      ...prev,
      [areaId]: !prev[areaId]
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

  const handleUpdateTargets = (areaId: string, targets: number[]) => {
    setWeeklyTargets(prev => ({
      ...prev,
      [areaId]: targets
    }))
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
                <div className="flex items-center gap-2">
                  <span>{currentProgress}/{currentTarget} pts</span>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => decrementProgress(area.id)}
                      disabled={currentProgress === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => incrementProgress(area.id)}
                      disabled={currentProgress === currentTarget}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Subareas */}
            {isExpanded && subareas.length > 0 && (
              <div className="pl-8 space-y-3 mt-3">
                {subareas.map((subarea) => (
                  <div key={subarea.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{subarea.name}</span>
                      <span>{subarea.goals.length} goals</span>
                    </div>
                    <Progress value={0} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
} 