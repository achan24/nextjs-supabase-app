import React, { useState, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import GraphEditor from './components/GraphEditor';
import TimelineView from './components/TimelineView';
import { TimelineEngine, Action, DecisionPoint } from './types';
import { Layout, GitBranch, Clock, Save, Upload } from 'lucide-react';
import './App.css';

// Create a demo workflow
function createDemo(timelineEngine) {
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

function App() {
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

  const handleLoadTimeline = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          timelineEngine.fromJSON(data);
          handleTimelineUpdate();
        } catch (error) {
          alert('Error loading timeline: ' + error.message);
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
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layout className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-semibold text-gray-900">
              Action Timeline Designer
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('graph')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeView === 'graph'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <GitBranch className="w-4 h-4 inline mr-1" />
                Graph
              </button>
              <button
                onClick={() => setActiveView('both')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeView === 'both'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Both
              </button>
              <button
                onClick={() => setActiveView('timeline')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeView === 'timeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-1" />
                Timeline
              </button>
            </div>

            {/* File Operations */}
            <div className="flex gap-2">
              <button
                onClick={handleLoadDemo}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              >
                📋 Demo
              </button>
              
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                🗑️ Clear
              </button>
              
              <button
                onClick={handleSaveTimeline}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              
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
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 grid ${getViewClasses()} gap-4 p-4 min-h-0`}>
        {(activeView === 'graph' || activeView === 'both') && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-full">
              <ReactFlowProvider>
                <GraphEditor
                  timelineEngine={timelineEngine}
                  onTimelineUpdate={handleTimelineUpdate}
                />
              </ReactFlowProvider>
            </div>
          </div>
        )}
        
        {(activeView === 'timeline' || activeView === 'both') && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <TimelineView
              key={updateCounter} // Force re-render on updates
              timelineEngine={timelineEngine}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
