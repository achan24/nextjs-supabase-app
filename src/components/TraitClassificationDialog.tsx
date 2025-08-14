'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TraitClassificationData {
  taskType: 'scheduled' | 'opportunity'
  highFriction: boolean
  firstTime: boolean
  stakes: 'low' | 'medium' | 'high'
  discomfort: 'low' | 'medium' | 'high'
  selectedTraits: string[]
  firstTinyAction?: string
}

interface TraitClassificationDialogProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  taskTitle: string
}

const CORE_TRAITS = [
  'Initiative',
  'Courage', 
  'Discipline',
  'Adaptability',
  'Endurance',
  'Proactiveness',
  'Determination',
  'Resilience',
  'Perseverance'
]

const TRAIT_DESCRIPTIONS = {
  'Initiative': 'Speed to start relative to plan or opportunity',
  'Courage': 'Doing high-discomfort/high-stakes tasks',
  'Discipline': 'Doing planned tasks when planned, especially after novelty fades',
  'Adaptability': 'Switching approach/location/tool when blocked',
  'Endurance': 'Sustained focus/time on task or consistent return',
  'Proactiveness': 'Acting before being prompted; anticipating needs',
  'Determination': 'Continuing despite resistance within the session',
  'Resilience': 'Returning after interruption, failure, or long absence',
  'Perseverance': 'Repeated sessions across days/weeks to reach completion'
}

export default function TraitClassificationDialog({
  isOpen,
  onClose,
  taskId,
  taskTitle
}: TraitClassificationDialogProps) {
  console.log('[TraitClassificationDialog] Props:', { isOpen, taskId, taskTitle });
  const [classification, setClassification] = useState<TraitClassificationData>({
    taskType: 'scheduled',
    highFriction: false,
    firstTime: false,
    stakes: 'low',
    discomfort: 'low',
    selectedTraits: []
  })
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const inferTraits = (data: TraitClassificationData): string[] => {
    const traits: string[] = []

    // Initiative - always included
    traits.push('Initiative')

    // Courage - high discomfort, high stakes, or high friction
    if (data.discomfort === 'high' || data.stakes === 'high' || data.highFriction) {
      traits.push('Courage')
    }

    // Discipline - scheduled tasks
    if (data.taskType === 'scheduled') {
      traits.push('Discipline')
    }

    // Adaptability - will be determined during session
    traits.push('Adaptability')

    // Endurance - will be determined during session
    traits.push('Endurance')

    // Proactiveness - opportunity tasks
    if (data.taskType === 'opportunity') {
      traits.push('Proactiveness')
    }

    // Determination - will be determined during session
    traits.push('Determination')

    // Resilience - will be determined during session
    traits.push('Resilience')

    // Perseverance - will be determined during session
    traits.push('Perseverance')

    return traits
  }

  const handleSave = async () => {
    if (classification.selectedTraits.length === 0) {
      toast.error('Please select at least one trait')
      return
    }

    setIsSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        toast.error('You must be logged in to save trait classification')
        return
      }

      // Save task trait tags
      const { error: tagError } = await supabase
        .from('task_trait_tags')
        .insert({
          task_id: taskId,
          trait_tags: classification.selectedTraits,
          task_metadata: {
            taskType: classification.taskType,
            highFriction: classification.highFriction,
            firstTime: classification.firstTime,
            stakes: classification.stakes,
            discomfort: classification.discomfort,
            firstTinyAction: classification.firstTinyAction
          },
          auto_classified: false
        })

      if (tagError) {
        console.error('[TraitClassification] Error saving trait tags:', tagError)
        toast.error('Failed to save trait classification')
        return
      }

      toast.success('Trait classification saved!')
      onClose()
    } catch (error) {
      console.error('[TraitClassification] Error saving:', error)
      toast.error('Failed to save trait classification')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTraitToggle = (trait: string) => {
    setClassification(prev => ({
      ...prev,
      selectedTraits: prev.selectedTraits.includes(trait)
        ? prev.selectedTraits.filter(t => t !== trait)
        : [...prev.selectedTraits, trait].slice(0, 6) // Max 6 traits
    }))
  }

  const inferredTraits = inferTraits(classification)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Trait Classification</DialogTitle>
          <p className="text-gray-600 text-sm">Help us understand how this task will develop your character traits</p>
          <div className="mt-2 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Task: {taskTitle}</p>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Quick Classification */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quick Classification (≤10 seconds)</h3>
              
              <div>
                <Label className="text-sm font-medium">Task Type</Label>
                <RadioGroup
                  value={classification.taskType}
                  onValueChange={(value: 'scheduled' | 'opportunity') => 
                    setClassification(prev => ({ ...prev, taskType: value }))
                  }
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="scheduled" id="scheduled" />
                    <Label htmlFor="scheduled">Scheduled (planned)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="opportunity" id="opportunity" />
                    <Label htmlFor="opportunity">Opportunity (unplanned chance)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="high-friction"
                    checked={classification.highFriction}
                    onCheckedChange={(checked) => 
                      setClassification(prev => ({ ...prev, highFriction: checked as boolean }))
                    }
                  />
                  <Label htmlFor="high-friction">High-Friction (paperwork, admin, studying, etc.)</Label>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="first-time"
                    checked={classification.firstTime}
                    onCheckedChange={(checked) => 
                      setClassification(prev => ({ ...prev, firstTime: checked as boolean }))
                    }
                  />
                  <Label htmlFor="first-time">First-Time (new task or method)</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Stakes</Label>
                  <RadioGroup
                    value={classification.stakes}
                    onValueChange={(value: 'low' | 'medium' | 'high') => 
                      setClassification(prev => ({ ...prev, stakes: value }))
                    }
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="stakes-low" />
                      <Label htmlFor="stakes-low">Low</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="stakes-medium" />
                      <Label htmlFor="stakes-medium">Medium</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="stakes-high" />
                      <Label htmlFor="stakes-high">High</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium">Discomfort Level</Label>
                  <RadioGroup
                    value={classification.discomfort}
                    onValueChange={(value: 'low' | 'medium' | 'high') => 
                      setClassification(prev => ({ ...prev, discomfort: value }))
                    }
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="discomfort-low" />
                      <Label htmlFor="discomfort-low">Low</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="discomfort-medium" />
                      <Label htmlFor="discomfort-medium">Medium</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="discomfort-high" />
                      <Label htmlFor="discomfort-high">High</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Trait Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Suggested Traits</h3>
              <p className="text-sm text-gray-600">
                Based on your classification, these traits are likely to be developed. 
                You can adjust the selection (max 6 traits).
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CORE_TRAITS.map((trait) => {
                  const isInferred = inferredTraits.includes(trait)
                  const isSelected = classification.selectedTraits.includes(trait)
                  
                  return (
                    <div
                      key={trait}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : isInferred 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleTraitToggle(trait)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleTraitToggle(trait)}
                          />
                          <div>
                            <div className="font-medium">{trait}</div>
                            <div className="text-xs text-gray-600">
                              {TRAIT_DESCRIPTIONS[trait as keyof typeof TRAIT_DESCRIPTIONS]}
                            </div>
                          </div>
                        </div>
                        {isInferred && !isSelected && (
                          <Badge variant="secondary" className="text-xs">
                            Suggested
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* First Tiny Action (Optional) */}
            <div>
              <Label htmlFor="first-tiny-action" className="text-sm font-medium">
                First Tiny Action (optional)
              </Label>
              <input
                id="first-tiny-action"
                type="text"
                value={classification.firstTinyAction || ''}
                onChange={(e) => setClassification(prev => ({ 
                  ...prev, 
                  firstTinyAction: e.target.value 
                }))}
                placeholder="e.g., open the document, write the first sentence..."
                className="w-full mt-2 p-2 border border-gray-300 rounded-md text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                What's the smallest first step you can take?
              </p>
            </div>
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex justify-end gap-3 p-6 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={isSaving || classification.selectedTraits.length === 0}>
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
