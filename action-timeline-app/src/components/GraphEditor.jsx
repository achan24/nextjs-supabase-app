import React, { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import ActionNode from './ActionNode';
import DecisionNode from './DecisionNode';
import NodeEditModal from './NodeEditModal';
import { Action, DecisionPoint, generateId } from '../types';
import { Plus, Play, Pause, Square, RotateCcw } from 'lucide-react';

// Define nodeTypes outside component to prevent React Flow warnings
const nodeTypes = {
  action: ActionNode,
  decision: DecisionNode,
};

const GraphEditor = ({ timelineEngine, onTimelineUpdate }) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [selectedNodeType, setSelectedNodeType] = useState('action');
  
  const { project } = useReactFlow();

  // Sync nodes and edges with timeline engine
  useEffect(() => {
    if (!timelineEngine) return;

    const updateNodesAndEdges = () => {
      const allNodes = timelineEngine.getAllNodes();
      
      // Convert timeline nodes to ReactFlow nodes
      const flowNodes = allNodes.map(node => ({
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        data: {
          // Use the correct property name based on node type
          ...(node.type === 'action' ? { action: node } : { decisionPoint: node }),
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
          onMakeDecision: handleMakeDecision,
          isTimelineRunning: timelineEngine.isRunning, // Pass timeline state
        },
      }));

      // Generate edges from connections
      const flowEdges = [];
      allNodes.forEach(node => {
        if (node.type === 'action' && node.connections) {
          node.connections.forEach(targetId => {
            flowEdges.push({
              id: `${node.id}-${targetId}`,
              source: node.id,
              target: targetId,
              type: 'default',
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
              type: 'default',
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

  const handleNodesChange = useCallback((changes) => {
    // Prevent any node changes during timeline execution
    if (timelineEngine.isRunning) {
      return;
    }
    onNodesChange(changes);
  }, [timelineEngine.isRunning, onNodesChange]);

  const onConnect = useCallback((params) => {
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

    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  const handleAddNode = useCallback((event) => {
    if (!reactFlowInstance) return;

    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = project({
      x: event.clientX - reactFlowBounds.left - 100,
      y: event.clientY - reactFlowBounds.top - 50,
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

  const handleEditNode = useCallback((node) => {
    setEditingNode(node);
  }, []);

  const handleDeleteNode = useCallback((nodeId) => {
    timelineEngine.removeNode(nodeId);
    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  const handleMakeDecision = useCallback((decisionPoint, actionId) => {
    timelineEngine.makeDecision(decisionPoint, actionId);
    onTimelineUpdate();
  }, [timelineEngine, onTimelineUpdate]);

  const handleSaveNode = useCallback((nodeData) => {
    const existingNode = timelineEngine.getNode(nodeData.id);
    if (existingNode) {
      Object.assign(existingNode, nodeData);
      onTimelineUpdate();
    }
    setEditingNode(null);
  }, [timelineEngine, onTimelineUpdate]);

  const handleNodeDrag = useCallback((event, node) => {
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
        elementsSelectable={!timelineEngine.isRunning}
        selectNodesOnDrag={!timelineEngine.isRunning}
      >
        <Panel position="top-left">
          <div className="flex flex-col gap-2 bg-white p-3 rounded-lg shadow-lg border">
            <div className="text-sm font-medium text-gray-700 mb-2">Add Node:</div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedNodeType('action')}
                className={`px-3 py-1 text-xs rounded ${
                  selectedNodeType === 'action'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Action
              </button>
              <button
                onClick={() => setSelectedNodeType('decision')}
                className={`px-3 py-1 text-xs rounded ${
                  selectedNodeType === 'decision'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Decision
              </button>
            </div>
            <button
              onClick={handleAddNode}
              className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add {selectedNodeType}
            </button>
          </div>
        </Panel>

        <Panel position="top-right">
          <div className="flex gap-2 bg-white p-3 rounded-lg shadow-lg border">
            {!timelineEngine.isRunning ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                disabled={timelineEngine.getAllNodes().length === 0}
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            )}
            
            {timelineEngine.isRunning && (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            )}
            
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </Panel>

        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      {editingNode && (
        <NodeEditModal
          node={editingNode}
          onSave={handleSaveNode}
          onCancel={() => setEditingNode(null)}
        />
      )}
    </div>
  );
};

export default GraphEditor;