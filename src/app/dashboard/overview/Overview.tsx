'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Target } from './types';

interface OverviewProps {
  initialTargets: Target[];
}

const Overview = ({ initialTargets }: OverviewProps) => {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [targets] = useState<Target[]>(initialTargets);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Calculate target progress
  const getProgress = (target: Target) => {
    return (target.current_value / target.target_value) * 100;
  };

  // Get status color based on progress
  const getStatusColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-100 text-green-800';
    if (progress >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const toggleCard = (targetId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(targetId)) {
        newSet.delete(targetId);
      } else {
        newSet.add(targetId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Add Target */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
          <Select
            value=""
            onValueChange={(value) => {
              if (value && !selectedTargets.includes(value)) {
                setSelectedTargets(prev => [...prev, value]);
              }
            }}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Add target to overview..." />
            </SelectTrigger>
            <SelectContent>
              {targets
                .filter(t => !selectedTargets.includes(t.id))
                .map(target => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.title} {target.project && `(${target.project.title})`}
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>

        {/* Target Cards Grid */}
        <div className="grid grid-cols-1 gap-4">
          {selectedTargets.map(targetId => {
            const target = targets.find(t => t.id === targetId);
            if (!target) return null;

            const goalTitle = target.goal_target_links?.[0]?.goal?.title;
            const projectInfo = target.project;
            const isExpanded = expandedCards.has(target.id);

            return (
              <Card key={target.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <div className="flex items-center gap-4 mb-1">
                      <h2 className="text-xl font-semibold text-gray-900">{target.title}</h2>
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(getProgress(target))}`}>
                        {Math.round(getProgress(target))}%
                      </span>
                    </div>
                    {projectInfo && (
                      <p className="text-sm text-gray-500">
                        <Link href={`/dashboard/projects/${projectInfo.id}`} className="hover:text-blue-600 hover:underline">
                          {projectInfo.title}
                        </Link>
                        {goalTitle && (
                          <> • {goalTitle}</>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggleCard(target.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedTargets(prev => prev.filter(id => id !== target.id))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {/* Progress Section - Always visible */}
                <div className="mt-4">
                  <Progress value={getProgress(target)} className="h-2" />
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>Current: {target.current_value} {target.unit}</span>
                    <span>Target: {target.target_value} {target.unit}</span>
                  </div>
                </div>

                {/* Expandable Content */}
                {isExpanded && (
                  <div className="mt-6 space-y-6">
                    {/* Chart */}
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { date: '2024-01', value: target.current_value * 0.2 },
                          { date: '2024-02', value: target.current_value * 0.4 },
                          { date: '2024-03', value: target.current_value * 0.6 },
                          { date: '2024-04', value: target.current_value * 0.8 },
                          { date: '2024-05', value: target.current_value }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke="#3b82f6" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Linked Tasks */}
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Linked Tasks</h3>
                      <div className="space-y-2">
                        {target.target_tasks.map(({ task, contribution_value }) => (
                          <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={task.status === 'completed'}
                                className="h-4 w-4 rounded border-gray-300"
                                readOnly
                              />
                              <div>
                                <p className="font-medium text-gray-900">{task.title}</p>
                                <p className="text-sm text-gray-600">Contribution: {contribution_value} {target.unit}</p>
                              </div>
                            </div>
                            <span className="text-sm text-gray-500">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Overview; 