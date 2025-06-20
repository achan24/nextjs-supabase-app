'use client'

import { useState } from 'react'
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
import { Settings2 } from 'lucide-react'

interface WeeklyTargetsDialogProps {
  areas: Array<{
    id: string
    name: string
    target: number
  }>
  onUpdateTargets: (areaId: string, targets: number[]) => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function WeeklyTargetsDialog({ areas, onUpdateTargets }: WeeklyTargetsDialogProps) {
  // For each area, store an array of 7 daily targets
  const [weeklyTargets, setWeeklyTargets] = useState<Record<string, number[]>>(
    Object.fromEntries(areas.map(area => [area.id, Array(7).fill(area.target)]))
  )

  const handleTargetChange = (areaId: string, dayIndex: number, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0)
    setWeeklyTargets(prev => ({
      ...prev,
      [areaId]: prev[areaId].map((target, i) => i === dayIndex ? numValue : target)
    }))
  }

  const applyToAllDays = (areaId: string, value: number) => {
    setWeeklyTargets(prev => ({
      ...prev,
      [areaId]: Array(7).fill(value)
    }))
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Set Targets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Weekly Progress Targets</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="daily">Daily View</TabsTrigger>
            <TabsTrigger value="weekly">Weekly View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily">
            <div className="space-y-6">
              {areas.map(area => (
                <div key={area.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{area.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Set for all days:</span>
                      <Input
                        type="number"
                        className="w-20"
                        min={0}
                        value={weeklyTargets[area.id][0]}
                        onChange={(e) => applyToAllDays(area.id, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS.map((day, i) => (
                      <div key={day} className="space-y-1">
                        <label className="text-sm text-gray-500">{day}</label>
                        <Input
                          type="number"
                          min={0}
                          value={weeklyTargets[area.id][i]}
                          onChange={(e) => handleTargetChange(area.id, i, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="weekly">
            <div className="grid grid-cols-8 gap-4 mb-4">
              <div className="font-medium">Area</div>
              {DAYS.map(day => (
                <div key={day} className="font-medium">{day}</div>
              ))}
            </div>
            {areas.map(area => (
              <div key={area.id} className="grid grid-cols-8 gap-4 mb-4">
                <div className="flex items-center">{area.name}</div>
                {weeklyTargets[area.id].map((target, i) => (
                  <Input
                    key={i}
                    type="number"
                    min={0}
                    value={target}
                    onChange={(e) => handleTargetChange(area.id, i, e.target.value)}
                  />
                ))}
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => {
            areas.forEach(area => {
              onUpdateTargets(area.id, weeklyTargets[area.id])
            })
          }}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 