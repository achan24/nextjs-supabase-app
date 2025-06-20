import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

// Temporary mock data - will be replaced with real data later
const characterData = {
  name: 'Your Character',
  level: 5,
  xp: 750,
  nextLevelXp: 1000,
  overallScore: 85, // 0-100
  traits: [
    { name: 'Discipline', value: 75 },
    { name: 'Consistency', value: 80 },
    { name: 'Focus', value: 65 },
    { name: 'Energy', value: 90 }
  ]
}

export default function CharacterCard() {
  const xpProgress = (characterData.xp / characterData.nextLevelXp) * 100

  // Determine avatar state based on overall score
  const getAvatarState = (score: number) => {
    if (score >= 80) return '🟢' // Clean, confident, bright
    if (score >= 50) return '🟡' // Neutral, okay
    return '🔴' // Messy, tired, dim
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
          </div>

          {/* XP Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span>XP Progress</span>
              <span>{characterData.xp} / {characterData.nextLevelXp}</span>
            </div>
            <Progress value={xpProgress} className="h-2" />
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
    </Card>
  )
} 