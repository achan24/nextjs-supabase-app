'use client';

import { User } from '@supabase/supabase-js'
import { useState } from 'react'
import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'
import ProjectManager from './ProjectManager'

export default function HomePage({ user }: { user: User }) {
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)

  const getAiSuggestion = async () => {
    setIsLoadingSuggestion(true)
    // This is a placeholder for the actual AI suggestion functionality
    // In the future, this will connect to a real AI service
    setTimeout(() => {
      setAiSuggestion("Based on your current tasks, I recommend focusing on the high-priority project due tomorrow. Your energy levels are typically highest in the morning, so I suggest starting with that task first.")
      setIsLoadingSuggestion(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-gray-900">Guardian Angel</h1>
          <SignOutButton />
        </div>

        {/* App Description */}
        <div className="mb-12 bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">About Guardian Angel</h2>
          <p className="text-gray-700 mb-4">
            Guardian Angel is your 24-hour cognitive prosthetic designed to help you manage time, tasks, and focus. 
            It tackles the two moments that derail productivity most—starting and stopping—by providing gentle guidance 
            and structure to your day.
          </p>
          <p className="text-gray-700">
            This app combines task management, habit tracking, and AI assistance to help you stay on track 
            and make progress on what matters most to you.
          </p>
        </div>

        {/* Feature Cards */}
        <h2 className="text-2xl font-semibold mb-6">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Projects Card */}
          <Link href="/dashboard/projects" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Projects</h3>
              <p className="text-gray-600 mb-4">
                Organize and manage your projects with deadlines and priorities.
              </p>
              <div className="text-blue-600 font-medium">Go to Projects →</div>
            </div>
          </Link>

          {/* Tasks Card */}
          <Link href="/dashboard/tasks" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Tasks</h3>
              <p className="text-gray-600 mb-4">
                Manage your daily tasks and track your progress.
              </p>
              <div className="text-blue-600 font-medium">Go to Tasks →</div>
            </div>
          </Link>

          {/* Calendar Card */}
          <Link href="/dashboard/calendar" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Calendar</h3>
              <p className="text-gray-600 mb-4">
                View your tasks and commitments in a calendar format for better planning.
              </p>
              <div className="text-blue-600 font-medium">Go to Calendar →</div>
            </div>
          </Link>

          {/* Notes Card */}
          <Link href="/dashboard/notes" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Notes</h3>
              <p className="text-gray-600 mb-4">
                Keep track of your thoughts, ideas, and important information.
              </p>
              <div className="text-blue-600 font-medium">Go to Notes →</div>
            </div>
          </Link>

          {/* AI Suggestions Card */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">AI Recommendations</h3>
            <p className="text-gray-600 mb-4">
              Get personalized suggestions to improve your productivity.
            </p>
            <Link
              href="/dashboard/recommendations"
              className="text-blue-600 font-medium hover:text-blue-700 flex items-center gap-2"
            >
              View Recommendations →
            </Link>
          </div>

          {/* Habit Tracker Card (Placeholder) */}
          <div className="bg-white p-6 rounded-lg shadow opacity-75">
            <h3 className="text-xl font-semibold mb-2">Habit Tracker</h3>
            <p className="text-gray-600 mb-4">
              Build and maintain positive habits with daily tracking and streak monitoring.
            </p>
            <div className="text-gray-400 font-medium">Coming Soon</div>
          </div>

          {/* Focus Timer Card (Placeholder) */}
          <div className="bg-white p-6 rounded-lg shadow opacity-75">
            <h3 className="text-xl font-semibold mb-2">Focus Timer</h3>
            <p className="text-gray-600 mb-4">
              Use timed work sessions with breaks to maintain focus and prevent burnout.
            </p>
            <div className="text-gray-400 font-medium">Coming Soon</div>
          </div>

          {/* Insights Card (Placeholder) */}
          <div className="bg-white p-6 rounded-lg shadow opacity-75">
            <h3 className="text-xl font-semibold mb-2">Insights</h3>
            <p className="text-gray-600 mb-4">
              Get personalized insights about your productivity patterns and progress.
            </p>
            <div className="text-gray-400 font-medium">Coming Soon</div>
          </div>

          {/* Settings Card (Placeholder) */}
          <div className="bg-white p-6 rounded-lg shadow opacity-75">
            <h3 className="text-xl font-semibold mb-2">Settings</h3>
            <p className="text-gray-600 mb-4">
              Customize your experience and manage your account settings.
            </p>
            <div className="text-gray-400 font-medium">Coming Soon</div>
          </div>
        </div>
      </div>
    </div>
  )
} 