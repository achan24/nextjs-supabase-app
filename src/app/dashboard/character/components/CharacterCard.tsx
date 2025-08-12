import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { RefreshCw, Info } from 'lucide-react'
import { useGoalSystem } from '@/hooks/useGoalSystem'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { getCharacterProgress } from '@/services/characterService'
import { useAuth } from '@/hooks/useAuth'
import XPDetailsDialog from './XPDetailsDialog'

interface CharacterData {
  name: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  overallScore: number;
  traits: Array<{ name: string; value: number }>;
}

interface TopProgress {
  areaName: string;
  subareaName: string;
  goalId: string;
  goalTitle: string;
}

export default function CharacterCard() {
  const router = useRouter()
  const { areas } = useGoalSystem()
  const { user } = useAuth()
  const [characterData, setCharacterData] = useState<CharacterData>({
    name: 'Your Character',
    level: 1,
    xp: 0,
    nextLevelXp: 200,
    overallScore: 85,
    traits: [
      { name: 'Discipline', value: 75 },
      { name: 'Consistency', value: 80 },
      { name: 'Focus', value: 65 },
      { name: 'Energy', value: 90 }
    ]
  })
  const [topProgress, setTopProgress] = useState<TopProgress | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [xpDialogOpen, setXpDialogOpen] = useState(false)

  const refreshCharacterData = useCallback(async () => {
    if (user?.id) {
      setIsRefreshing(true);
      try {
        const data = await getCharacterProgress(user.id);
        setCharacterData(prev => ({
          ...prev,
          level: data.level,
          xp: data.xp,
          nextLevelXp: data.requiredXP
        }));
        console.log('[Character XP] Refreshed character data:', data);
      } catch (error) {
        console.error('Error fetching character data:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    refreshCharacterData();
  }, [refreshCharacterData]);

  useEffect(() => {
    // Find the top daily progress from areas
    if (areas.length > 0) {
      // Look for "Working and Learning" area or the first area
      const workingArea = areas.find(area => area.name.includes('Working')) || areas[0]
      if (workingArea && workingArea.subareas.length > 0) {
        const firstSubarea = workingArea.subareas[0]
        if (firstSubarea && firstSubarea.goals.length > 0) {
          const firstGoal = firstSubarea.goals[0]
          setTopProgress({
            areaName: workingArea.name,
            subareaName: firstSubarea.name,
            goalId: firstGoal.id,
            goalTitle: firstGoal.title
          })
        }
      }
    }
  }, [areas])

  const xpProgress = (characterData.xp / characterData.nextLevelXp) * 100

  // Determine avatar state based on overall score
  const getAvatarState = (score: number) => {
    if (score >= 80) return '🟢' // Clean, confident, bright
    if (score >= 50) return '🟡' // Neutral, okay
    return '🔴' // Messy, tired, dim
  }

  const handleGoalClick = () => {
    if (topProgress) {
      router.push(`/dashboard/goal?tab=goals&goal=${topProgress.goalId}`)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-6">
        {/* Avatar Section */}
        <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-6xl">
          {getAvatarState(characterData.overallScore)}
        </div>

        {/* Stats Section */}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold">{characterData.name}</h2>
              <p className="text-gray-500 dark:text-gray-400">Level {characterData.level}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshCharacterData}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh XP'}
            </Button>
          </div>

          {/* XP Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                XP Progress
                <button
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  onClick={() => setXpDialogOpen(true)}
                  aria-label="View XP details"
                >
                  <Info className="w-3 h-3" /> Details
                </button>
              </span>
              <span>{characterData.xp} / {characterData.nextLevelXp}</span>
            </div>
            <Progress value={xpProgress} className="h-2" />
            <div className="text-xs text-gray-500 mt-1">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Traits Grid */}
          <div className="grid grid-cols-2 gap-4">
            {characterData.traits.map((trait) => (
              <div key={trait.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{trait.name}</span>
                  <span>{trait.value}%</span>
                </div>
                <Progress value={trait.value} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <XPDetailsDialog open={xpDialogOpen} onOpenChange={setXpDialogOpen} />
    </Card>
  )
} 