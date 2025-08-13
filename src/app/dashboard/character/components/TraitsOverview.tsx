'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight, TrendingUp, Award, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface TraitData {
  id: string
  name: string
  value: number
  last_updated: string
  calculation_data: any
}

interface TraitBand {
  name: string
  minXP: number
  maxXP: number
  color: string
  accent: string
}

const TRAIT_BANDS: TraitBand[] = [
  { name: 'Bronze', minXP: 0, maxXP: 150, color: 'bg-amber-600', accent: 'border-amber-400' },
  { name: 'Silver', minXP: 150, maxXP: 400, color: 'bg-gray-400', accent: 'border-gray-300' },
  { name: 'Gold', minXP: 400, maxXP: 800, color: 'bg-yellow-500', accent: 'border-yellow-300' },
  { name: 'Platinum', minXP: 800, maxXP: 1500, color: 'bg-blue-400', accent: 'border-blue-300' },
  { name: 'Diamond', minXP: 1500, maxXP: 2500, color: 'bg-cyan-400', accent: 'border-cyan-300' },
  { name: 'Mythic', minXP: 2500, maxXP: 5000, color: 'bg-purple-500', accent: 'border-purple-300' }
]

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

export default function TraitsOverview() {
  const { user } = useAuth()
  const [traits, setTraits] = useState<TraitData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrait, setSelectedTrait] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (user?.id) {
      loadTraits()
    }
  }, [user?.id])

  const loadTraits = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      console.log('[Traits] Loading traits for user:', user.id)

      // Since character is virtual, use user_id directly for traits
      // For now, we'll create a virtual character_id based on user_id
      const virtualCharacterId = `character-${user.id}`

      // Get character traits
      const { data: traitsData, error: traitsError } = await supabase
        .from('character_traits')
        .select('*')
        .eq('character_id', virtualCharacterId)
        .order('last_updated', { ascending: false })

      if (traitsError) {
        console.error('[Traits] Traits error:', traitsError)
        // If no traits exist yet, that's fine - they'll be created when first used
        setTraits([])
        return
      }

      console.log('[Traits] Loaded traits:', traitsData)
      setTraits(traitsData || [])
    } catch (error) {
      console.error('[Traits] Error loading traits:', error)
      setTraits([])
    } finally {
      setLoading(false)
    }
  }

  const getTraitBand = (value: number): TraitBand => {
    // Convert trait value (0-100) to XP equivalent for band calculation
    // Assuming value is roughly equivalent to XP/50 for display purposes
    const estimatedXP = value * 50
    
    for (let i = TRAIT_BANDS.length - 1; i >= 0; i--) {
      if (estimatedXP >= TRAIT_BANDS[i].minXP) {
        return TRAIT_BANDS[i]
      }
    }
    return TRAIT_BANDS[0]
  }

  const getTraitStep = (value: number): number => {
    const band = getTraitBand(value)
    const estimatedXP = value * 50
    const bandRange = band.maxXP - band.minXP
    const stepSize = bandRange / 5
    const step = Math.floor((estimatedXP - band.minXP) / stepSize) + 1
    return Math.min(Math.max(step, 1), 5)
  }

  const getTraitDisplayName = (traitName: string): string => {
    return traitName.charAt(0).toUpperCase() + traitName.slice(1).toLowerCase()
  }

  const getTraitDescription = (traitName: string): string => {
    const descriptions: Record<string, string> = {
      'initiative': 'Speed to start relative to plan or opportunity',
      'courage': 'Doing high-discomfort/high-stakes tasks',
      'discipline': 'Doing planned tasks when planned, especially after novelty fades',
      'adaptability': 'Switching approach/location/tool when blocked',
      'endurance': 'Sustained focus/time on task or consistent return',
      'proactiveness': 'Acting before being prompted; anticipating needs',
      'determination': 'Continuing despite resistance within the session',
      'resilience': 'Returning after interruption, failure, or long absence',
      'perseverance': 'Repeated sessions across days/weeks to reach completion'
    }
    return descriptions[traitName.toLowerCase()] || 'Character trait development'
  }

  const getTraitIcon = (traitName: string): string => {
    const icons: Record<string, string> = {
      'initiative': '⚡',
      'courage': '🛡️',
      'discipline': '🎯',
      'adaptability': '🔄',
      'endurance': '🏃',
      'proactiveness': '🚀',
      'determination': '💪',
      'resilience': '🌱',
      'perseverance': '🏆'
    }
    return icons[traitName.toLowerCase()] || '⭐'
  }

  if (loading) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Character Traits</h2>
        <div className="space-y-4">
          {CORE_TRAITS.map((trait) => (
            <div key={trait} className="animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Character Traits</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTraits}
          className="text-sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {CORE_TRAITS.map((traitName) => {
          const trait = traits.find(t => t.name.toLowerCase() === traitName.toLowerCase())
          const value = trait?.value || 0
          const band = getTraitBand(value)
          const step = getTraitStep(value)
          const icon = getTraitIcon(traitName)
          const description = getTraitDescription(traitName)

          return (
            <div
              key={traitName}
              className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md cursor-pointer ${
                selectedTrait === traitName 
                  ? `${band.accent} bg-opacity-10` 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTrait(selectedTrait === traitName ? null : traitName)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {getTraitDisplayName(traitName)}
                    </h3>
                    <p className="text-sm text-gray-600">{description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className={`${band.color} text-white font-medium`}
                  >
                    {band.name} {step}
                  </Badge>
                  <span className="text-lg font-bold text-gray-700">
                    {value}
                  </span>
                  <ChevronRight 
                    className={`w-4 h-4 transition-transform ${
                      selectedTrait === traitName ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{value}/100</span>
                </div>
                <Progress 
                  value={value} 
                  className="h-2"
                />
              </div>

              {selectedTrait === traitName && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Last Updated:</span>
                      <div className="font-medium">
                        {trait?.last_updated 
                          ? new Date(trait.last_updated).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Band Progress:</span>
                      <div className="font-medium">
                        {band.name} {step}/5
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex space-x-2">
                    <Button size="sm" variant="outline">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      History
                    </Button>
                    <Button size="sm" variant="outline">
                      <Award className="w-4 h-4 mr-1" />
                      Achievements
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {traits.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">No traits found</p>
          <p className="text-sm">Complete tasks to start developing your character traits!</p>
        </div>
      )}
    </Card>
  )
}
