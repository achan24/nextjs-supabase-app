import { Metadata } from 'next'
import CharacterDashboard from './CharacterDashboard'

export const metadata: Metadata = {
  title: 'Character Dashboard',
  description: 'View and manage your character stats and progress',
}

export default function CharacterPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Character Dashboard</h1>
      <CharacterDashboard />
    </div>
  )
} 