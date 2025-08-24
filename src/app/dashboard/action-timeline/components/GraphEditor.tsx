import React, { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  useReactFlow,
  Node,
  Edge,
  Connection,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import ActionNode from './ActionNode';
import DecisionNode from './DecisionNode';
import NodeEditModal from './NodeEditModal';
import { Action, DecisionPoint, generateId, TimelineEngine, formatDuration } from '../types';
import { Plus, Play, Pause, Square, RotateCcw, StepForward, Clock, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Define nodeTypes outside component to prevent React Flow warnings
const nodeTypes = {
  action: ActionNode,
  decision: DecisionNode,
};

// Calculate ETA for timeline completion
const calculateTimelineETA = (timelineEngine: TimelineEngine): { eta: Date | null; totalDuration: number; actionCount: number } => {
  const allNodes = timelineEngine.getAllNodes();
  if (allNodes.length === 0) {
    return { eta: null, totalDuration: 0, actionCount: 0 };
  }

  // Find all actions and their durations
  const actions = Array.from(timelineEngine.actions.values());
  const totalDuration = actions.reduce((sum, action) => sum + action.duration, 0);
  const actionCount = actions.length;

  // Calculate ETA from now
  const now = new Date();
  const eta = new Date(now.getTime() + totalDuration);

  return { eta, totalDuration, actionCount };
};

interface GraphEditorProps {
  timelineEngine: TimelineEngine;
  onTimelineUpdate: () => void;
}

const GraphEditor: React.FC<GraphEditorProps> = ({ timelineEngine, onTimelineUpdate }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<'action' | 'decision'>('action');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showHistory, setShowHistory] = useState(false);

  // Update session timer
  React.useEffect(() => {
    if (timelineEngine.isManualMode && timelineEngine.sessionStartTime) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [timelineEngine.isManualMode, timelineEngine.sessionStartTime]);
  
  const { project } = useReactFlow();

  // Sync nodes and edges with timeline engine
  useEffect(() => {
    if (!timelineEngine) return;

    const updateNodesAndEdges = () => {
      const allNodes = timelineEngine.getAllNodes();
      
      // Convert timeline nodes to ReactFlow nodes
      const flowNodes: Node[] = allNodes.map(node => ({
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        data: {
          // Use the correct property name based on node type
          ...(node.type === 'action' ? { action: node } : { decisionPoint: node }),
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
          onMakeDecision: handleMakeDecision,
          onStartFromHere: handleStartFromHere,
          isTimelineRunning: timelineEngine.isRunning, // Pass timeline state
          isManualMode: timelineEngine.isManualMode, // Pass manual mode state
          timelineComplete: timelineEngine.timelineComplete, // Pass timeline completion state
        },
      }));

      // Generate edges from connections
      const flowEdges: Edge[] = [];
      allNodes.forEach(node => {
        if (node.type === 'action' && node.connections) {
          node.connections.forEach(targetId => {
            flowEdges.push({
              id: `${node.id}-${targetId}`,
              source: node.id,
              target: targetId,
              type: 'bezier',
              animated: node.status === 'running',
              style: { 
                stroke: node.status === 'completed' ? '#10b981' : '#6b7280',
                strokeWidth: 2 
              },
            });
          });
        } else if (node.type === 'decision' && node.options) {
          node.options.forEach(option => {
            flowEdges.push({
              id: `${node.id}-${option.actionId}`,
              source: node.id,
              target: option.actionId,
              type: 'bezier',
              label: option.label,
              animated: node.status === 'active',
              style: { 
                stroke: node.selectedOption === option.actionId ? '#10b981' : '#6b7280',
                strokeWidth: node.selectedOption === option.actionId ? 3 : 2 
              },
            });
          });
        }
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
    };

    updateNodesAndEdges();
    timelineEngine.addListener(updateNodesAndEdges);

    return () => {
      timelineEngine.removeListener(updateNodesAndEdges);
    };
  }, [timelineEngine, setNodes, setEdges]);

  const handleNodesChange = useCallback((changes: any) => {
    // Prevent any node changes during timeline execution
    if (timelineEngine.isRunning) {
      return;
    }
    onNodesChange(changes);
  }, [timelineEngine.isRunning, onNodesChange]);

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    
    const sourceNode = timelineEngine.getNode(params.source);
    const targetNode = timelineEngine.getNode(params.target);
    
    if (!sourceNode || !targetNode) return;

    if (sourceNode.type === 'action') {
      // Add connection from action to target
      sourceNode.connections.push(params.target);
    } else if (sourceNode.type === 'decision') {
      // Add option to decision point
      const label = targetNode.name || `Option ${sourceNode.options.length + 1}`;
      sourceNode.addOption(params.target, label);
    }

    // Notify listeners to update the UI immediately
    timelineEngine.notifyListeners();
    onTimelineUpdate();
    
    // Force immediate edge update
    const allNodes = timelineEngine.getAllNodes();
    const flowEdges: Edge[] = [];
    allNodes.forEach(node => {
      if (node.type === 'action' && node.connections) {
        node.connections.forEach(targetId => {
          flowEdges.push({
            id: `${node.id}-${targetId}`,
            source: node.id,
            target: targetId,
            type: 'bezier',
            animated: node.status === 'running',
            style: { 
              stroke: node.status === 'completed' ? '#10b981' : '#6b7280',
              strokeWidth: 2 
            },
          });
        });
      } else if (node.type === 'decision' && node.options) {
        node.options.forEach(option => {
          flowEdges.push({
            id: `${node.id}-${option.actionId}`,
            source: node.id,
            target: option.actionId,
            type: 'bezier',
            label: option.label,
            animated: node.status === 'active',
            style: { 
              stroke: node.selectedOption === option.actionId ? '#10b981' : '#6b7280',
              strokeWidth: node.selectedOption === option.actionId ? 3 : 2 
            },
          });
        });
      }
    });
    setEdges(flowEdges);
  }, [timelineEngine, onTimelineUpdate]);

  const handleAddNode = useCallback((event: React.MouseEvent) => {
    if (!reactFlowInstance || !reactFlowWrapper.current) return;

    // Get the center of the current viewport
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const centerX = reactFlowBounds.width / 2;
    const centerY = reactFlowBounds.height / 2;
    
    const position = project({
      x: centerX,
      y: centerY,
    });

    const id = generateId();
    
    if (selectedNodeType === 'action') {
      const action = new Action({
        id,
        name: `Action ${timelineEngine.actions.size + 1}`,
        description: 'New action',
        duration: 5000, // 5 seconds default
        x: position.x,
        y: position.y,
      });
      timelineEngine.addAction(action);
    } else {
      const decisionPoint = new DecisionPoint({
        id,
        name: `Decision ${timelineEngine.decisionPoints.size + 1}`,
        description: 'Choose next action',
        x: position.x,
        y: position.y,
      });
      timelineEngine.addDecisionPoint(decisionPoint);
    }

    onTimelineUpdate();
  }, [reactFlowInstance, project, selectedNodeType, timelineEngine, onTimelineUpdate]);

  const handleEditNode = useCallback((node: any) => {
    setEditingNode(node);
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    timelineEngine.removeNode(nodeId);
    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  const handleStartFromHere = useCallback((actionId: string) => {
    // Check if this is a manual mode start
    if (actionId.startsWith('manual:')) {
      const actualActionId = actionId.replace('manual:', '');
      // If timeline is already running, just move to the new action
      if (timelineEngine.isRunning) {
        timelineEngine.currentNodeId = actualActionId;
        timelineEngine.executionHistory.push(actualActionId);
        timelineEngine.executeCurrentNodeManual();
      } else {
        // Start manual mode from the specific action
        timelineEngine.currentNodeId = actualActionId;
        timelineEngine.isRunning = true;
        timelineEngine.isManualMode = true;
        timelineEngine.sessionStartTime = Date.now();
        timelineEngine.executionHistory = [actualActionId];
        timelineEngine.executeCurrentNodeManual();
      }
    } else {
      // If timeline is already running, just move to the new action
      if (timelineEngine.isRunning) {
        timelineEngine.currentNodeId = actionId;
        timelineEngine.executionHistory.push(actionId);
        timelineEngine.executeCurrentNode();
      } else {
        timelineEngine.start(actionId);
      }
    }
    
    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  const handleMakeDecision = useCallback((decisionPoint: DecisionPoint, actionId: string) => {
    timelineEngine.makeDecision(decisionPoint, actionId);
    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  const handleSaveNode = useCallback((nodeData: any) => {
    const existingNode = timelineEngine.getNode(nodeData.id);
    if (existingNode) {
      Object.assign(existingNode, nodeData);
      onTimelineUpdate();
    }
    setEditingNode(null);
  }, [timelineEngine, onTimelineUpdate]);

  const handleNodeDrag = useCallback((event: any, node: Node) => {
    const timelineNode = timelineEngine.getNode(node.id);
    if (timelineNode) {
      timelineNode.x = node.position.x;
      timelineNode.y = node.position.y;
      onTimelineUpdate();
    }
  }, [timelineEngine, onTimelineUpdate]);

  const handleStart = useCallback(() => {
    const startNodes = timelineEngine.getAllNodes().filter(node => {
      // Find nodes with no incoming connections
      const allNodes = timelineEngine.getAllNodes();
      const hasIncoming = allNodes.some(n => {
        if (n.type === 'action') {
          return n.connections.includes(node.id);
        } else if (n.type === 'decision') {
          return n.options.some(opt => opt.actionId === node.id);
        }
        return false;
      });
      return !hasIncoming;
    });

    if (startNodes.length > 0) {
      timelineEngine.start(startNodes[0].id);
      onTimelineUpdate();
    }
  }, [timelineEngine, onTimelineUpdate]);

  const handlePause = useCallback(() => {
    timelineEngine.pause();
    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  const handleResume = useCallback(() => {
    timelineEngine.resume();
    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  const handleStop = useCallback(() => {
    timelineEngine.stop();
    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  const handleReset = useCallback(() => {
    timelineEngine.reset();
    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  const handleStartManualMode = useCallback(() => {
    const startNodes = timelineEngine.getAllNodes().filter(node => {
      // Find nodes with no incoming connections
      const allNodes = timelineEngine.getAllNodes();
      const hasIncoming = allNodes.some(n => {
        if (n.type === 'action') {
          return n.connections.includes(node.id);
        } else if (n.type === 'decision') {
          return n.options.some(opt => opt.actionId === node.id);
        }
        return false;
      });
      return !hasIncoming;
    });

    if (startNodes.length > 0) {
      timelineEngine.startManualMode(startNodes[0].id);
      onTimelineUpdate();
    }
  }, [timelineEngine, onTimelineUpdate]);

  const handleNextStep = useCallback(() => {
    timelineEngine.nextStep();
    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  const handleEndManualMode = useCallback(() => {
    const stats = timelineEngine.getSessionStats();
    if (stats) {
      console.log('Session Stats:', stats);
      
      // Build a detailed summary
      const actionDetails = stats.completedActions.map(action => 
        `${action.name}: ${formatDuration(action.actualDuration || 0)} (expected: ${formatDuration(action.expectedDuration)})`
      ).join('\n');
      
      alert(`Session Complete!\n\nTotal Time: ${formatDuration(stats.totalTime)}\nActions Completed: ${stats.completedCount}\n\nAction Details:\n${actionDetails}\n\nCheck console for detailed stats.`);
    }
    timelineEngine.endManualMode();
    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      {/* Execution Mode Overlay */}
      {timelineEngine.isRunning && (
        <div className="absolute top-2 left-2 z-50 bg-blue-100 border border-blue-300 rounded px-3 py-1 text-sm text-blue-700 font-medium">
          ⚡ Timeline Running - Editing Disabled
        </div>
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onNodeDrag={handleNodeDrag}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="top-right"
        nodesDraggable={!timelineEngine.isRunning}
        nodesConnectable={!timelineEngine.isRunning}
        elementsSelectable={true}
        selectNodesOnDrag={!timelineEngine.isRunning}
      >
                         <Panel position="top-left">
          <div className="flex flex-col gap-2">
            {/* Session Info Panel */}
            {timelineEngine.isManualMode && (
              <div className="bg-white p-3 rounded-lg shadow-lg border max-w-xs">
                <div className="text-xs font-medium text-gray-700 mb-2">Session Data:</div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>• Session #{timelineEngine.executionHistory.length}</div>
                  <div>• Start: {timelineEngine.sessionStartTime ? new Date(timelineEngine.sessionStartTime).toLocaleTimeString() : 'N/A'}</div>
                  <div>• Current Step: {timelineEngine.currentNodeId ? timelineEngine.getNode(timelineEngine.currentNodeId)?.name : 'N/A'}</div>
                  <div>• Steps Completed: {timelineEngine.executionHistory.length - 1}</div>
                  {timelineEngine.sessionStartTime && (
                    <div>• Session Time: {formatDuration(currentTime - timelineEngine.sessionStartTime)}</div>
                  )}
                  {/* Show captured time for completed actions */}
                  {(() => {
                    const completedActions = Array.from(timelineEngine.actions.values()).filter(action => 
                      action.actualDuration !== null && action.actualDuration > 0
                    );
                    const totalCaptured = completedActions.reduce((sum, action) => sum + (action.actualDuration || 0), 0);
                    return totalCaptured > 0 ? (
                      <div>• Total Time: {formatDuration(totalCaptured)} ({completedActions.length} actions)</div>
                    ) : null;
                  })()}
                  {timelineEngine.timelineComplete && (
                    <div className="text-orange-600 font-medium">• Timeline Complete - Last task timer running</div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Data saved: timestamps, durations, performance metrics
                </div>
              </div>
            )}

                        {/* Node Type Selector */}
            <div className="flex gap-1 bg-white p-1 rounded-lg shadow-lg border">
              <Button
                variant={selectedNodeType === 'action' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedNodeType('action')}
                className="text-xs px-2 py-1 h-7"
                title="Action"
              >
                A
              </Button>
              <Button
                variant={selectedNodeType === 'decision' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedNodeType('decision')}
                className="text-xs px-2 py-1 h-7"
                title="Decision"
              >
                D
              </Button>
              <Button
                onClick={handleAddNode}
                className="text-xs px-2 py-1 h-7"
                size="sm"
                title={`Add ${selectedNodeType}`}
              >
                +
              </Button>
            </div>

            {/* ETA Information Card */}
            {(() => {
              const { eta, totalDuration, actionCount } = calculateTimelineETA(timelineEngine);
              if (actionCount === 0) return null;
              
              return (
                <div className="bg-white p-2 rounded-lg shadow-lg border max-w-xs">
                  <div className="space-y-1 text-xs text-gray-600">
                    <div>• Duration: {formatDuration(totalDuration)}</div>
                    <div>• Actions: {actionCount}</div>
                    {eta && (
                      <div className="font-medium text-blue-600">
                        • ETA: {eta.toLocaleTimeString()}
                      </div>
                    )}
                    <div className="text-gray-500 italic">
                      If you start now
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </Panel>

        <Panel position="top-right">
          <div className="flex flex-col gap-2">
            {/* Auto mode controls */}
             <div className="flex gap-0.5 bg-white p-1 rounded-lg shadow-lg border">
               {!timelineEngine.isRunning ? (
                 <Button
                   onClick={handleStart}
                   className="text-xs px-1 py-0.5 h-6"
                   size="sm"
                   disabled={timelineEngine.getAllNodes().length === 0}
                   title="Auto"
                 >
                   ▶️
                 </Button>
               ) : (
                 <Button
                   onClick={handlePause}
                   className="text-xs px-1 py-0.5 h-6 bg-yellow-500 hover:bg-yellow-600"
                   size="sm"
                   title="Pause"
                 >
                   ⏸️
                 </Button>
               )}
               
               {timelineEngine.isRunning && (
                 <Button
                   onClick={handleStop}
                   className="text-xs px-1 py-0.5 h-6 bg-red-500 hover:bg-red-600"
                   size="sm"
                   title="Stop"
                 >
                   ⏹️
                 </Button>
               )}
               
               <Button
                 onClick={handleReset}
                 className="text-xs px-1 py-0.5 h-6 bg-gray-500 hover:bg-gray-600"
                 size="sm"
                 title="Reset"
               >
                 🔄
               </Button>
               
               <Button
                 onClick={() => setShowHistory(true)}
                 className="text-xs px-1 py-0.5 h-6 bg-blue-500 hover:bg-blue-600"
                 size="sm"
                 disabled={timelineEngine.actions.size === 0}
                 title="History"
               >
                 📊
               </Button>
             </div>

                         {/* Manual mode controls */}
             <div className="flex gap-0.5 bg-white p-1 rounded-lg shadow-lg border">
               {!timelineEngine.isRunning ? (
                 <Button
                   onClick={handleStartManualMode}
                   className="text-xs px-1 py-0.5 h-6 bg-green-600 hover:bg-green-700"
                   size="sm"
                   disabled={timelineEngine.getAllNodes().length === 0}
                   title="Manual"
                 >
                   ⏱️
                 </Button>
               ) : timelineEngine.isManualMode ? (
                 <>
                   {!timelineEngine.timelineComplete && (
                     <Button
                       onClick={handleNextStep}
                       className="text-xs px-1 py-0.5 h-6 bg-blue-600 hover:bg-blue-700"
                       size="sm"
                       title="Next"
                     >
                       ⏭️
                     </Button>
                   )}
                   <Button
                     onClick={handleEndManualMode}
                     className="text-xs px-1 py-0.5 h-6 bg-orange-600 hover:bg-orange-700"
                     size="sm"
                     title={timelineEngine.timelineComplete ? "End Session" : "End"}
                   >
                     {timelineEngine.timelineComplete ? "🏁" : "🏁"}
                   </Button>
                 </>
               ) : null}
             </div>
          </div>
        </Panel>

        <Controls />
        <MiniMap 
          style={{ width: 100, height: 75 }}
          nodeColor="#6b7280"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>

      {editingNode && (
        <NodeEditModal
          node={editingNode}
          onSave={handleSaveNode}
          onCancel={() => setEditingNode(null)}
        />
      )}

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execution History</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Overall Stats */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Timeline Overview</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Actions:</span>
                  <span className="ml-2 font-medium">{timelineEngine.actions.size}</span>
                </div>
                <div>
                  <span className="text-gray-600">Sessions Run:</span>
                  <span className="ml-2 font-medium">
                    {Math.max(...Array.from(timelineEngine.actions.values()).map(a => a.executionHistory.length), 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Performance History */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Action Performance</h3>
              <div className="space-y-3">
                {Array.from(timelineEngine.actions.values()).map(action => (
                  <div key={action.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{action.name}</h4>
                        <p className="text-sm text-gray-600">
                          Planned: {formatDuration(action.duration)}
                          {action.actualDuration && (
                            <span className="ml-2">
                              | Last: {formatDuration(action.actualDuration)}
                              <span className={action.actualDuration > action.duration ? 'text-red-600 ml-1' : 'text-green-600 ml-1'}>
                                ({action.actualDuration > action.duration ? '+' : ''}{formatDuration(action.actualDuration - action.duration)})
                              </span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {action.executionHistory.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">
                          Execution History ({action.executionHistory.length} runs):
                        </h5>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {action.executionHistory.slice(-5).map((execution, index) => (
                            <div key={index} className="text-xs text-gray-600 flex justify-between">
                              <span>{new Date(execution.timestamp).toLocaleString()}</span>
                              <span className={execution.duration > action.duration ? 'text-red-600' : 'text-green-600'}>
                                {formatDuration(execution.duration)}
                              </span>
                            </div>
                          ))}
                          {action.executionHistory.length > 5 && (
                            <div className="text-xs text-gray-500 italic">
                              ... and {action.executionHistory.length - 5} more runs
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GraphEditor;
