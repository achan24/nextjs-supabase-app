'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import * as Tabs from '@radix-ui/react-tabs';
import AreaManager from './components/AreaManager';
import GoalManager from './components/GoalManager';
import MetricManager from './components/MetricManager';

export default function GOALSystem() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('areas');
  const subareaId = searchParams.get('subarea');

  // Switch to goals tab when subarea is selected
  useEffect(() => {
    if (subareaId) {
      setActiveTab('goals');
    }
  }, [subareaId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">GOAL System</h1>
        <p className="text-gray-600">
          Growth, Objectives, Areas, Life-metrics - Track and achieve your goals through measured sequences.
        </p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-500 mb-4">
          <Tabs.Trigger
            value="areas"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
          >
            Areas
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
          <AreaManager />
        </Tabs.Content>

        <Tabs.Content value="goals" className="mt-2">
          <GoalManager selectedSubareaId={subareaId} />
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
                <p className="text-2xl font-bold">7</p>
                <p className="text-sm text-gray-500">Life areas being tracked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-gray-500">Goals in progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">24</p>
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