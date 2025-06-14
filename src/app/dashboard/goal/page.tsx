'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import AreaManager from './components/AreaManager';
import GoalManager from './components/GoalManager';
import MetricManager from './components/MetricManager';
import SubareaManager from './components/SubareaManager';
import { useGoalSystem } from '@/hooks/useGoalSystem';
import type { LifeGoalArea, LifeGoalSubarea, LifeGoal } from '@/types/goal';

export default function GOALSystem() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab') || 'areas';
  const subareaId = searchParams?.get('subarea') || null;
  const goalId = searchParams?.get('goal') || null;
  const filter = searchParams?.get('filter') || null;
  const { areas } = useGoalSystem();

  const handleTabChange = (newTab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    // Clear filter when switching tabs unless going to subareas with a filter
    if (newTab !== 'subareas' || !filter) {
      url.searchParams.delete('filter');
    }
    router.push(url.toString(), { scroll: false });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">GOAL System</h1>
        <p className="text-gray-600">
          Growth, Objectives, Areas, Life-metrics - Track and achieve your goals through measured sequences.
        </p>
      </div>

      <Tabs.Root value={tab} onValueChange={handleTabChange}>
        <Tabs.List className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-500 mb-4">
          <Tabs.Trigger
            value="areas"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
          >
            Areas
          </Tabs.Trigger>
          <Tabs.Trigger
            value="subareas"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
          >
            Subareas
          </Tabs.Trigger>
          <Tabs.Trigger
            value="goals"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
          >
            Goals
          </Tabs.Trigger>
          <Tabs.Trigger
            value="metrics"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
          >
            Metrics
          </Tabs.Trigger>
          <Tabs.Trigger
            value="overview"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
          >
            Overview
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="areas" className="mt-2">
          <AreaManager selectedAreaId={filter} />
        </Tabs.Content>

        <Tabs.Content value="subareas" className="mt-2">
          <SubareaManager />
        </Tabs.Content>

        <Tabs.Content value="goals" className="mt-2">
          <GoalManager selectedSubareaId={subareaId} selectedGoalId={goalId} />
        </Tabs.Content>

        <Tabs.Content value="metrics" className="mt-2">
          <MetricManager />
        </Tabs.Content>

        <Tabs.Content value="overview" className="mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{areas?.length || 0}</p>
                <p className="text-sm text-gray-500">Life areas being tracked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {areas?.reduce((total: number, area: LifeGoalArea) => 
                    total + area.subareas.reduce((subtotal: number, subarea: LifeGoalSubarea) => 
                      subtotal + (subarea.goals?.length || 0), 0), 0) || 0}
                </p>
                <p className="text-sm text-gray-500">Goals in progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {areas?.reduce((total: number, area: LifeGoalArea) => 
                    total + area.subareas.reduce((subtotal: number, subarea: LifeGoalSubarea) => 
                      subtotal + subarea.goals.reduce((goalTotal: number, goal: LifeGoal) => 
                        goalTotal + (goal.metrics?.length || 0), 0), 0), 0) || 0}
                </p>
                <p className="text-sm text-gray-500">Metrics being tracked</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Recent Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Progress timeline will appear here</p>
            </CardContent>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
} 