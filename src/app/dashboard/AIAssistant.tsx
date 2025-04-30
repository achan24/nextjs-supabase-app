'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bot } from 'lucide-react';

interface AIAssistantProps {
  context: {
    tasks: any[];
    completionRate: number;
    focusTime: number;
    commonPatterns: any[];
  };
}

export default function AIAssistant({ context }: AIAssistantProps) {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getRecommendation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendation');
      }

      const data = await response.json();
      setRecommendation(data.recommendation);
    } catch (error) {
      console.error('Error getting recommendation:', error);
      setRecommendation('Sorry, I had trouble generating a recommendation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4">
      {recommendation ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Bot className="w-6 h-6 text-blue-600 mt-1" />
            <p className="text-gray-700">{recommendation}</p>
          </div>
          <Button
            onClick={() => setRecommendation(null)}
            variant="ghost"
            className="text-sm"
          >
            Get Another Recommendation
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <Button
            onClick={getRecommendation}
            disabled={isLoading}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 animate-spin" />
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Get AI Recommendation
              </span>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
} 