'use client';

import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Notes</h1>
          <button
            onClick={handleSignOut}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Sign Out
          </button>
        </div>
        
        {/* Add Note Button */}
        <button className="mb-8 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Add New Note
        </button>

        {/* Notes Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2 text-xl font-semibold">Welcome {user.email}</h3>
            <p className="text-gray-600">
              This is your private notes dashboard. Only you can see these notes.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Created: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 