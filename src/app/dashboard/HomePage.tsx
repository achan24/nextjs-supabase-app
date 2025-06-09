'use client';

import { User } from '@supabase/auth-helpers-nextjs'
import { useState } from 'react'
import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'
import ProjectManager from './ProjectManager'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

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
          {/* Overview Card */}
          <Link href="/dashboard/overview" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg 
                      className="h-6 w-6 text-purple-600"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Track and manage all your targets and their progress in one place.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* GOAL System Card */}
          <Link href="/dashboard/goal" className="group">
            <Card className="hover:shadow-md transition-shadow border-2 border-blue-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg 
                      className="h-6 w-6 text-blue-600"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" fill="currentColor" />
                    </svg>
                  </div>
                  GOAL System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Growth, Objectives, Areas, Life-metrics - A comprehensive system for tracking and achieving your life goals through measured sequences.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Projects Card */}
          <Link href="/dashboard/projects" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg 
                      className="h-6 w-6 text-green-600"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M3 3h18v18H3z" />
                      <path d="M3 9h18" />
                      <path d="M9 9v12" />
                    </svg>
                  </div>
                  Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Organize and manage your projects with deadlines and priorities.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Tasks Card */}
          <Link href="/dashboard/tasks" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg 
                      className="h-6 w-6 text-yellow-600"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M3 6l2 2 4-4" />
                      <path d="M3 12l2 2 4-4" />
                      <path d="M3 18l2 2 4-4" />
                      <line x1="11" y1="6" x2="20" y2="6" />
                      <line x1="11" y1="12" x2="20" y2="12" />
                      <line x1="11" y1="18" x2="20" y2="18" />
                    </svg>
                  </div>
                  Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Manage your daily tasks and track your progress.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Calendar Card */}
          <Link href="/dashboard/calendar" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg 
                      className="h-6 w-6 text-red-600"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  View your tasks and commitments in a calendar format for better planning.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Notes Card */}
          <Link href="/dashboard/notes" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <svg 
                      className="h-6 w-6 text-indigo-600"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M14 2v6h6" />
                      <path d="M14 2L4 2v20h16V8l-6-6z" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                      <line x1="8" y1="16" x2="16" y2="16" />
                    </svg>
                  </div>
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Keep track of your thoughts, ideas, and important information.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Process Flow Card */}
          <Link href="/dashboard/process-flow" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <svg 
                      className="h-6 w-6 text-cyan-600"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <circle cx="6" cy="6" r="3" />
                      <circle cx="18" cy="6" r="3" />
                      <circle cx="12" cy="18" r="3" />
                      <line x1="6" y1="9" x2="12" y2="15" />
                      <line x1="18" y1="9" x2="12" y2="15" />
                    </svg>
                  </div>
                  Process Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Visualize and track your learning progress, practice sessions, and skill development through interactive process flows.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Process Timer Card */}
          <Link href="/dashboard/process-flow/timer" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg 
                      className="h-6 w-6 text-orange-600"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  Process Timer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Execute your process flows with focused timing. Select tasks from your flow maps and perform them with structured intervals.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* AI Recommendations Card */}
          <Link href="/dashboard/recommendations" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <svg 
                      className="h-6 w-6 text-violet-600"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Get personalized suggestions to improve your productivity.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Habit Tracker Card */}
          <Link href="/dashboard/habits" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <svg 
                      className="h-6 w-6 text-pink-600"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                  </div>
                  Habit Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Build and maintain positive habits with daily tracking and streak monitoring.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Insights Card */}
          <Link href="/dashboard/insights" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <svg 
                      className="h-6 w-6 text-emerald-600"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Get personalized insights about your productivity patterns and progress.
                </p>
              </CardContent>
            </Card>
          </Link>

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