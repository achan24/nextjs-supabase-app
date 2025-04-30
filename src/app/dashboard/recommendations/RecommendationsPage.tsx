'use client';

import { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Brain, Clock, Target, TrendingUp } from 'lucide-react'

interface RecommendationsPageProps {
  user: User
}

interface Recommendation {
  type: 'task' | 'focus' | 'pattern' | 'strategy'
  title: string
  description: string
  icon: JSX.Element
}

export default function RecommendationsPage({ user }: RecommendationsPageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  const getRecommendations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'all',
          context: {
            tasks: [],
            completionRate: 0,
            focusTime: 0,
            commonPatterns: []
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get recommendations')
      }

      const data = await response.json()
      // Transform the AI response into structured recommendations
      setRecommendations([
        {
          type: 'task',
          title: 'Task Prioritization',
          description: data.taskRecommendation || 'No task recommendations available.',
          icon: <Target className="w-6 h-6 text-blue-600" />
        },
        {
          type: 'focus',
          title: 'Focus Time',
          description: data.focusRecommendation || 'No focus recommendations available.',
          icon: <Clock className="w-6 h-6 text-green-600" />
        },
        {
          type: 'pattern',
          title: 'Work Patterns',
          description: data.patternRecommendation || 'No pattern insights available.',
          icon: <TrendingUp className="w-6 h-6 text-purple-600" />
        },
        {
          type: 'strategy',
          title: 'ADHD Strategies',
          description: data.strategyRecommendation || 'No strategy recommendations available.',
          icon: <Brain className="w-6 h-6 text-orange-600" />
        }
      ])
    } catch (error) {
      console.error('Error getting recommendations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Recommendations</h1>
          <p className="text-gray-600">
            Get personalized recommendations based on your work patterns and ADHD needs.
          </p>
        </div>
        <Button
          onClick={getRecommendations}
          disabled={isLoading}
          size="lg"
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Bot className="w-5 h-5 animate-spin" />
              Analyzing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Get New Recommendations
            </span>
          )}
        </Button>
      </div>

      {recommendations.length === 0 ? (
        <Card className="p-8 text-center">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Recommendations Yet</h2>
          <p className="text-gray-600 mb-4">
            Click the button above to get personalized AI recommendations based on your work patterns and needs.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((rec) => (
            <Card key={rec.type} className="p-6">
              <div className="flex items-start gap-4">
                {rec.icon}
                <div>
                  <h3 className="text-xl font-semibold mb-2">{rec.title}</h3>
                  <p className="text-gray-700">{rec.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 