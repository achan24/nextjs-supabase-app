'use client'

import { Card } from '@/components/ui/card'
import CharacterCard from './components/CharacterCard'
import ProgressBars from './components/ProgressBars'
import SkillsOverview from './components/SkillsOverview'
import RecentActivity from './components/RecentActivity'
import TodayTasksSection from './components/TodayTasksSection'
import ProblemWidget from './components/ProblemWidget'

export default function CharacterDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Character Card with Avatar */}
        <CharacterCard />
        
        {/* Progress Bars */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Daily Progress</h2>
          <ProgressBars />
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Today's Tasks - NEW SECTION */}
        <TodayTasksSection />

        {/* Skills Overview */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Skills</h2>
          <SkillsOverview />
        </Card>

        {/* Problem Widget - NEW SECTION */}
        <ProblemWidget />

        {/* Recent Activity Feed */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
          <RecentActivity />
        </Card>
      </div>
    </div>
  )
} 