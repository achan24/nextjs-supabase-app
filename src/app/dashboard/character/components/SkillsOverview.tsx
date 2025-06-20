import { Progress } from '@/components/ui/progress'

const skills = [
  {
    name: 'Programming',
    level: 2,
    xp: 175,
    nextLevelXp: 250,
    category: 'Technical'
  },
  {
    name: 'Public Speaking',
    level: 1,
    xp: 75,
    nextLevelXp: 100,
    category: 'Social'
  },
  {
    name: 'Time Management',
    level: 3,
    xp: 400,
    nextLevelXp: 500,
    category: 'Life Management'
  }
]

export default function SkillsOverview() {
  return (
    <div className="space-y-6">
      {skills.map((skill) => {
        const progress = (skill.xp / skill.nextLevelXp) * 100
        return (
          <div key={skill.name} className="space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="font-medium">{skill.name}</h3>
                <p className="text-sm text-gray-500">{skill.category}</p>
              </div>
              <span className="text-sm">Level {skill.level}</span>
            </div>
            <div className="space-y-1">
              <Progress value={progress} className="h-1.5" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{skill.xp} XP</span>
                <span>{skill.nextLevelXp} XP</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
} 