'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight, TrendingUp, Award, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { generateLevelUpText } from '@/services/questTextService'
import { showQuestToast } from '@/components/QuestToast'

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
      console.log('[Traits] Loading from trait_xp_records for user:', user.id)

      // 1) fetch this user's session ids
      const { data: sessions, error: sessErr } = await supabase
        .from('trait_sessions')
        .select('id, updated_at')
        .eq('user_id', user.id)

      if (sessErr) {
        console.error('[Traits] sessions error:', sessErr)
        setTraits([])
        return
      }

      const sessionIds = (sessions || []).map(s => s.id)
      if (sessionIds.length === 0) {
        setTraits([])
        return
      }

      // 2) fetch xp records for those sessions
      const { data: xpRows, error: xpErr } = await supabase
        .from('trait_xp_records')
        .select('trait_name, final_xp, created_at, session_id')
        .in('session_id', sessionIds)

      if (xpErr) {
        console.error('[Traits] xp error:', xpErr)
        setTraits([])
        return
      }

      // 3) reduce totals per trait
      const totals: Record<string, { xp: number; last: string }> = {}
      ;(xpRows || []).forEach((r: any) => {
        const key = (r.trait_name || '').toString()
        if (!key) return
        if (!totals[key]) totals[key] = { xp: 0, last: r.created_at }
        totals[key].xp += Number(r.final_xp || 0)
        if (r.created_at && (!totals[key].last || new Date(r.created_at) > new Date(totals[key].last))) {
          totals[key].last = r.created_at
        }
      })

      // 4) map to UI structure (value 0-100 using simple scaling: value = min(100, floor(xp/50)))
      const mapped: TraitData[] = Object.entries(totals).map(([name, info]) => ({
        id: name,
        name,
        value: Math.min(100, Math.floor((info.xp || 0) / 50)),
        last_updated: info.last,
        calculation_data: { total_xp: info.xp }
      }))

      // Check for level ups and show quest text
      const previousTraits = traits;
      const newTraits = mapped;
      
      // Compare and detect level ups
      newTraits.forEach(newTrait => {
        const previousTrait = previousTraits.find(t => t.id === newTrait.id);
        if (previousTrait) {
          const previousLevel = Math.floor(previousTrait.value / 20); // Rough level calculation
          const newLevel = Math.floor(newTrait.value / 20);
          
          if (newLevel > previousLevel) {
            // Level up detected!
            const questText = generateLevelUpText(newTrait.name, newLevel);
            showQuestToast(questText);
          }
        }
      });

      setTraits(mapped)
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
