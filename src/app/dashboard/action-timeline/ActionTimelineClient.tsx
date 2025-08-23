'use client';

import React, { useState, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import GraphEditor from './components/GraphEditor';
import TimelineView from './components/TimelineView';
import { TimelineEngine, Action, DecisionPoint } from './types';
import { Layout, GitBranch, Clock, Save, Upload, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Create a demo workflow
function createDemo(timelineEngine: TimelineEngine) {
  // Create actions
  const wakeUp = new Action({
    id: 'wake-up',
    name: 'Wake Up',
    description: 'Start the day',
    duration: 2000, // 2 seconds - very fast
    x: 100,
    y: 100
  });

  const brushTeeth = new Action({
    id: 'brush-teeth',
    name: 'Brush Teeth',
    description: 'Get ready for the day',
    duration: 8000, // 8 seconds - medium
    x: 100,
    y: 250
  });

  const makeCoffee = new Action({
    id: 'make-coffee',
    name: 'Make Coffee',
    description: 'Brew some coffee',
    duration: 15000, // 15 seconds - slow
    x: 400,
    y: 200
  });

  const makeTea = new Action({
    id: 'make-tea',
    name: 'Make Tea',
    description: 'Brew some tea instead',
    duration: 4000, // 4 seconds - fast
    x: 400,
    y: 350
  });

  const getReady = new Action({
    id: 'get-ready',
    name: 'Get Ready',
    description: 'Final preparations',
    duration: 12000, // 12 seconds - medium-slow
    x: 700,
    y: 275
  });

  // Create decision point
  const beverageChoice = new DecisionPoint({
    id: 'beverage-choice',
    name: 'Choose Beverage',
    description: 'What would you like to drink?',
    x: 100,
    y: 400,
    options: [
      { actionId: 'make-coffee', label: 'Coffee (energizing)' },
      { actionId: 'make-tea', label: 'Tea (relaxing)' }
    ]
  });

  // Set up connections
  wakeUp.connections = ['brush-teeth'];
  brushTeeth.connections = ['beverage-choice'];
  makeCoffee.connections = ['get-ready'];
  makeTea.connections = ['get-ready'];

  // Add to engine
  timelineEngine.addAction(wakeUp);
  timelineEngine.addAction(brushTeeth);
  timelineEngine.addAction(makeCoffee);
  timelineEngine.addAction(makeTea);
  timelineEngine.addAction(getReady);
  timelineEngine.addDecisionPoint(beverageChoice);
}

interface ActionTimelineClientProps {
  user: any;
}

export default function ActionTimelineClient({ user }: ActionTimelineClientProps) {
  const [timelineEngine] = useState(() => {
    const engine = new TimelineEngine();
    // Create demo data
    createDemo(engine);
    return engine;
  });
  const [activeView, setActiveView] = useState('both'); // 'graph', 'timeline', 'both'
  const [updateCounter, setUpdateCounter] = useState(0);

  const handleTimelineUpdate = useCallback(() => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  const handleSaveTimeline = useCallback(() => {
    const data = timelineEngine.toJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [timelineEngine]);

  const handleLoadTimeline = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          timelineEngine.fromJSON(data);
          handleTimelineUpdate();
        } catch (error) {
          alert('Error loading timeline: ' + (error as Error).message);
        }
      };
      reader.readAsText(file);
    }
  }, [timelineEngine, handleTimelineUpdate]);

  const handleLoadDemo = useCallback(() => {
    // Clear existing data
    timelineEngine.actions.clear();
    timelineEngine.decisionPoints.clear();
    timelineEngine.reset();
    
    // Load demo
    createDemo(timelineEngine);
    handleTimelineUpdate();
  }, [timelineEngine, handleTimelineUpdate]);

  const handleClearAll = useCallback(() => {
    timelineEngine.actions.clear();
    timelineEngine.decisionPoints.clear();
    timelineEngine.reset();
    handleTimelineUpdate();
  }, [timelineEngine, handleTimelineUpdate]);

  const getViewClasses = () => {
    switch (activeView) {
      case 'graph':
        return 'grid-cols-1';
      case 'timeline':
        return 'grid-cols-1';
      default:
        return 'grid-cols-2';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Layout className="w-6 h-6 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900">
                Action Timeline Designer
              </h1>
            </div>
          </div>
        </div>

        {/* Description Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>About Action Timelines</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Design and execute structured action sequences with decision points. Create workflows that guide you through 
              complex processes step-by-step, with built-in timing and progress tracking.
            </p>
            <p className="text-gray-700">
              Perfect for morning routines, work processes, learning sequences, and any structured activity where timing and 
              decision-making matter.
            </p>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* View Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={activeView === 'graph' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('graph')}
                    className="flex items-center gap-2"
                  >
                    <GitBranch className="w-4 h-4" />
                    Graph
                  </Button>
                  <Button
                    variant={activeView === 'both' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('both')}
                  >
                    Both
                  </Button>
                  <Button
                    variant={activeView === 'timeline' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('timeline')}
                    className="flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Timeline
                  </Button>
                </div>
              </div>

              {/* File Operations */}
              <div className="flex gap-2">
                <Button
                  onClick={handleLoadDemo}
                  variant="outline"
                  size="sm"
                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                >
                  📋 Demo
                </Button>
                
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  size="sm"
                  className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                >
                  🗑️ Clear
                </Button>
                
                <Button
                  onClick={handleSaveTimeline}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </Button>
                
                <label className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Load
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleLoadTimeline}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className={`grid ${getViewClasses()} gap-4 min-h-0`}>
          {(activeView === 'graph' || activeView === 'both') && (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Graph Editor</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px]">
                  <ReactFlowProvider>
                    <GraphEditor
                      timelineEngine={timelineEngine}
                      onTimelineUpdate={handleTimelineUpdate}
                    />
                  </ReactFlowProvider>
                </div>
              </CardContent>
            </Card>
          )}
          
          {(activeView === 'timeline' || activeView === 'both') && (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Timeline View</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px]">
                  <TimelineView
                    key={updateCounter} // Force re-render on updates
                    timelineEngine={timelineEngine}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
