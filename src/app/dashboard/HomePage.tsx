'use client';

import { User } from '@supabase/auth-helpers-nextjs'
import { useState } from 'react'
import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'
import ProjectManager from './ProjectManager'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BarChart3, FolderKanban, CheckSquare, StickyNote, GitFork, Timer, Calendar, LineChart, Bot, Users, Repeat, Lightbulb, User as UserIcon } from 'lucide-react'

// Mock character data - will be replaced with real data later
const characterData = {
  name: 'Your Character',
  level: 5,
  xp: 750,
  nextLevelXp: 1000,
  traits: [
    { name: 'Discipline', value: 75 },
    { name: 'Focus', value: 65 }
  ]
}

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
          {/* Character Card */}
          <Link href="/dashboard/character" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <UserIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  Character
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-xl">
                    🟢
                  </div>
                  <div>
                    <p className="text-sm font-medium">Level {characterData.level}</p>
                    <div className="w-24">
                      <Progress value={(characterData.xp / characterData.nextLevelXp) * 100} className="h-1" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Level up your character by completing tasks and building good habits. Track your progress and improve your traits.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Overview Card */}
          <Link href="/dashboard/overview" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Track and manage all your targets and their progress in one place. Get a comprehensive view of your goals and achievements.
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
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FolderKanban className="h-6 w-6 text-blue-600" />
                  </div>
                  Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Organize and manage your projects effectively. Break down complex goals into manageable tasks and track progress systematically.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Tasks Card */}
          <Link href="/dashboard/tasks" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckSquare className="h-6 w-6 text-green-600" />
                  </div>
                  Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Create, organize, and track your daily tasks with priority levels and due dates. Stay on top of your to-do list and boost productivity.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Notes Card */}
          <Link href="/dashboard/notes" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <StickyNote className="h-6 w-6 text-yellow-600" />
                  </div>
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Capture and organize your thoughts, ideas, and important information. Keep your notes structured and easily accessible.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Process Flow Card */}
          <Link href="/dashboard/process-flow" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <GitFork className="h-6 w-6 text-indigo-600" />
                  </div>
                  Process Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Visualize and track your learning progress through interactive process flows. Map out your skill development journey and practice sessions.
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
                    <Timer className="h-6 w-6 text-orange-600" />
                  </div>
                  Process Timer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Time and track your process sequences with focused intervals. Execute your process flows with structured timing and measurement.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Calendar Card */}
          <Link href="/dashboard/calendar" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-pink-600" />
                  </div>
                  Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  View and manage your schedule in a clear, organized way. Keep track of important dates, deadlines, and recurring events.
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
                    <LineChart className="h-6 w-6 text-emerald-600" />
                  </div>
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Get detailed analytics and insights about your productivity patterns and progress. Make data-driven decisions to improve your workflow.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* AI Assistant Card */}
          <Link href="/dashboard/ai" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <Bot className="h-6 w-6 text-violet-600" />
                  </div>
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Get intelligent, AI-powered help with your tasks, scheduling, and productivity. Let AI assist you in optimizing your workflow.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Relationship CRM Card */}
          <Link href="/dashboard/crm" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Users className="h-6 w-6 text-red-600" />
                  </div>
                  Relationship CRM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Track and nurture your personal and professional relationships. Manage contacts, track interactions, and grow meaningful connections.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Habits Card */}
          <Link href="/dashboard/habits" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Repeat className="h-6 w-6 text-cyan-600" />
                  </div>
                  Habits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Build and maintain positive habits. Track your progress, set reminders, and develop consistent routines for personal growth.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Recommendations Card */}
          <Link href="/dashboard/recommendations" className="group">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Lightbulb className="h-6 w-6 text-amber-600" />
                  </div>
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Get personalized recommendations for improving your productivity, habits, and workflow based on your usage patterns.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
} 