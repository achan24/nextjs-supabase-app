'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import GraphEditor from './components/GraphEditor';
import TimelineView from './components/TimelineView';
import { TimelineEngine, Action, DecisionPoint } from './types';
import { useTimelineEngine } from '@/contexts/TimelineEngineContext';
import { Layout, GitBranch, Clock, Save, Upload, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimelineSelector, useTimelineAutoSave } from './components/TimelineSelector';
// Define the ActionTimeline type locally to avoid import issues
interface ActionTimeline {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  data: any;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
  execution_count: number;
  total_execution_time: number;
  favorite: boolean;
}

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
  const { engine: timelineEngine, loadFromJSON, resetEngine } = useTimelineEngine();
  const [_, setEngineVersion] = useState(0);
  const [currentTimeline, setCurrentTimeline] = useState<ActionTimeline | null>(null);
  const [activeView, setActiveView] = useState('graph'); // 'graph', 'timeline', 'both'
  const [updateCounter, setUpdateCounter] = useState(0);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'saving' | null; message: string }>({ type: null, message: '' });

  const handleTimelineUpdate = useCallback(() => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  const handleTimelineChange = useCallback((timeline: ActionTimeline | null, engine: TimelineEngine) => {
    setCurrentTimeline(timeline);
    // Ensure our shared engine reflects any incoming state
    if (engine !== timelineEngine) {
      loadFromJSON(engine.toJSON());
      setEngineVersion(v => v + 1);
    }
    handleTimelineUpdate();
  }, [handleTimelineUpdate, loadFromJSON, timelineEngine]);

  // Auto-save functionality
  const autoSave = useTimelineAutoSave(currentTimeline, timelineEngine, setSaveStatus);

  // Auto-save on changes (2 seconds after last change)
  useEffect(() => {
    if (!currentTimeline) return;

    const debounceTimer = setTimeout(() => {
      if (timelineEngine.getAllNodes().length > 0) {
        autoSave(false); // Silent auto-save
      }
    }, 2000);

    return () => clearTimeout(debounceTimer);
  }, [timelineEngine, currentTimeline, autoSave, updateCounter]);

  // Auto-hide save status after 3 seconds
  useEffect(() => {
    if (saveStatus.type) {
      const timer = setTimeout(() => {
        setSaveStatus({ type: null, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

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
          loadFromJSON(data);
          handleTimelineUpdate();
        } catch (error) {
          alert('Error loading timeline: ' + (error as Error).message);
        }
      };
      reader.readAsText(file);
    }
  }, [handleTimelineUpdate, loadFromJSON]);

  const handleLoadDemo = useCallback(() => {
    resetEngine();
    createDemo(timelineEngine);
    handleTimelineUpdate();
  }, [handleTimelineUpdate, resetEngine, timelineEngine]);

  const handleClearAll = useCallback(() => {
    resetEngine();
    handleTimelineUpdate();
  }, [handleTimelineUpdate, resetEngine]);

  const getViewClasses = () => {
    switch (activeView) {
      case 'graph':
        return 'grid-cols-1';
      case 'timeline':
        return 'grid-cols-1';
      default:
        return 'grid-cols-1 lg:grid-cols-2';
    }
  };

  // Render save status
  const renderSaveStatus = () => {
    if (!saveStatus.type) return null;

    const statusColors = {
      saving: 'bg-blue-100 text-blue-800 border-blue-400',
      success: 'bg-green-100 text-green-800 border-green-400',
      error: 'bg-red-100 text-red-800 border-red-400'
    };

    return (
      <div className={`p-3 mb-4 rounded-md border ${statusColors[saveStatus.type]}`}>
        <div className="flex items-center">
          <div className="text-sm font-medium">
            {saveStatus.message}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                Action Timeline Designer
              </h1>
            </div>
          </div>
        </div>

        {/* Description Card */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader>
            <CardTitle>About Action Timelines</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm sm:text-base text-gray-700 mb-4">
              Design and execute structured action sequences with decision points. Create workflows that guide you through 
              complex processes step-by-step, with built-in timing and progress tracking.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              Perfect for morning routines, work processes, learning sequences, and any structured activity where timing and 
              decision-making matter.
            </p>
          </CardContent>
        </Card>

        {/* Save Status */}
        {renderSaveStatus()}

        {/* Timeline Management & Controls */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader>
            <CardTitle>Timeline Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Timeline Selector */}
              <TimelineSelector
                currentTimeline={currentTimeline}
                timelineEngine={timelineEngine}
                onTimelineChange={handleTimelineChange}
                onSaveStatusChange={setSaveStatus}
              />

              {/* View Controls & Utilities */}
              <div className="space-y-4">
                {/* View Toggle */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">View Mode</label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={activeView === 'graph' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('graph')}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                      <GitBranch className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Graph</span>
                      <span className="sm:hidden">G</span>
                    </Button>
                    <Button
                      variant={activeView === 'both' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('both')}
                      className="text-xs sm:text-sm"
                    >
                      Both
                    </Button>
                    <Button
                      variant={activeView === 'timeline' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('timeline')}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Timeline</span>
                      <span className="sm:hidden">T</span>
                    </Button>
                  </div>
                </div>

                {/* Utilities */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">Utilities</label>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 sm:gap-2">
                    <Button
                      onClick={handleLoadDemo}
                      variant="outline"
                      size="sm"
                      className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 text-xs px-2 py-1 h-8"
                    >
                      📋 Demo
                    </Button>
                    
                    <Button
                      onClick={handleClearAll}
                      variant="outline"
                      size="sm"
                      className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 text-xs px-2 py-1 h-8"
                    >
                      🗑️ Clear
                    </Button>
                    
                    <Button
                      onClick={handleSaveTimeline}
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center gap-1 text-xs px-2 py-1 h-8"
                    >
                      <Save className="w-3 h-3" />
                      <span className="hidden sm:inline">Export</span>
                      <span className="sm:hidden">📤</span>
                    </Button>
                    
                    <label className="flex items-center justify-center gap-1 px-2 py-1 h-8 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span className="hidden sm:inline">Import</span>
                      <span className="sm:hidden">📥</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleLoadTimeline}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
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
                <div className="h-[400px] sm:h-[500px] lg:h-[600px]">
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
                <div className="h-[400px] sm:h-[500px] lg:h-[600px]">
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