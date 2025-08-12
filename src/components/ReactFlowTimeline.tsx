'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactFlow, { 
  Handle, 
  Position, 
  Background, 
  Node, 
  Edge,
  NodeTypes,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import ELK from 'elkjs/lib/elk.bundled.js';
import { Play, Square } from 'lucide-react';

// Types
export type NodeKind = "action" | "decision";

export interface TimelineNode {
  id: string;
  title: string;
  kind: NodeKind;
  children?: string[];
  defaultDurationMs?: number;
  chosenChildIds?: string[]; // Added for runner
}

interface Graph {
  nodes: Record<string, TimelineNode>;
  rootId: string;
  lastEdited: number;
}

// Constants
const PX_PER_MS = 0.005;
const MIN_ACTION_W = 140;
const ACTION_H = 40;
const DECISION_D = 56;

// ELK instance
const elk = new ELK();

// Measure node size based on type and duration
function measureSize(n: TimelineNode) {
  if (n.kind === "decision") {
    return { width: DECISION_D, height: DECISION_D };
  }
  const width = Math.max(MIN_ACTION_W, (n.defaultDurationMs ?? 0) * PX_PER_MS);
  return { width, height: ACTION_H };
}

// Layout function using ELK
async function layoutWithElk(rootId: string, nodesById: Record<string, TimelineNode>) {
  // Collect reachable nodes/edges from root
  const nodeList: TimelineNode[] = [];
  const edges: Array<{ id: string; sources: string[]; targets: string[] }> = [];
  const seen = new Set<string>();

  function walk(id: string) {
    if (seen.has(id)) return;
    seen.add(id);
    const n = nodesById[id];
    if (!n) return;
    nodeList.push(n);
    for (const child of n.children ?? []) {
      edges.push({ id: `${id}->${child}`, sources: [id], targets: [child] });
      walk(child);
    }
  }
  walk(rootId);

  // Build ELK graph
  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "48",
      "elk.layered.spacing.nodeNodeBetweenLayers": "160",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.portConstraints": "FIXED_SIDE",
    },
    children: nodeList.map((n) => {
      const { width, height } = measureSize(n);
      return {
        id: n.id,
        width,
        height,
        labels: [{ text: n.title }],
      };
    }),
    edges,
  };

  const laidOut = await elk.layout(elkGraph);

  // Map to React Flow
  const rfNodes = laidOut.children!.map((c: any) => {
    const data = { 
      label: nodesById[c.id].title, 
      kind: nodesById[c.id].kind,
      duration: nodesById[c.id].defaultDurationMs 
    };
    const type = data.kind === "decision" ? "decisionNode" : "actionNode";
    return {
      id: c.id,
      type,
      position: { x: c.x, y: c.y },
      data,
      width: c.width,
      height: c.height,
    };
  });

  const rfEdges = laidOut.edges!.map((e: any) => ({
    id: e.id,
    source: e.sources[0],
    target: e.targets[0],
    type: "smoothstep",
    animated: false,
    style: { stroke: "#e5e7eb", strokeWidth: 2 },
  }));

  return { nodes: rfNodes, edges: rfEdges };
}

// Helper functions for runner
const estimateDuration = (n?: TimelineNode) => {
  if (!n || n.kind !== "action") return 5000;
  return n.defaultDurationMs || 5000;
};

const msToHuman = (ms: number | undefined) => {
  if (!ms || ms <= 0) return "--";
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
};

// Custom node components
const ActionNode = ({ data }: any) => (
  <div style={{
    padding: 8, 
    borderRadius: 12, 
    background: "#fff9db", 
    border: "1px solid #fde68a",
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600
  }}>
    <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
    <div style={{ textAlign: 'center' }}>
      <div>{data.label}</div>
      {data.duration && (
        <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
          {msToHuman(data.duration)}
        </div>
      )}
    </div>
    <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
  </div>
);

const DecisionNode = ({ data }: any) => (
  <div style={{ width: DECISION_D, height: DECISION_D, position: "relative" }}>
    <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
    <svg width={DECISION_D} height={DECISION_D}>
      <polygon
        points={`${DECISION_D/2},0 ${DECISION_D},${DECISION_D/2} ${DECISION_D/2},${DECISION_D} 0,${DECISION_D/2}`}
        fill="#fff3c4"
        stroke="#facc15"
        strokeWidth="2"
      />
    </svg>
    <div style={{
      position: "absolute", 
      inset: 0, 
      display: "grid", 
      placeItems: "center",
      fontWeight: 600,
      fontSize: '10px',
      textAlign: 'center',
      padding: '4px'
    }}>
      {data.label}
    </div>
    <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
  </div>
);

const nodeTypes: NodeTypes = { 
  actionNode: ActionNode, 
  decisionNode: DecisionNode 
};

interface ReactFlowTimelineProps {
  graph: Graph;
  isPlaying?: boolean;
  runnerPath?: string[];
  runnerIndex?: number;
  runnerProgressMs?: number;
  hasHydrated?: boolean;
  onNodeClick?: (nodeId: string) => void;
  onStartRunner?: () => void;
  onStopRunner?: () => void;
  onDecisionChoice?: (decisionId: string, childId: string) => void;
}

export default function ReactFlowTimeline({ 
  graph, 
  isPlaying = false, 
  runnerPath = [], 
  runnerIndex = 0,
  runnerProgressMs = 0,
  hasHydrated = false,
  onNodeClick,
  onStartRunner,
  onStopRunner,
  onDecisionChoice
}: ReactFlowTimelineProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showDecisionPopup, setShowDecisionPopup] = useState(false);
  const [currentDecisionNode, setCurrentDecisionNode] = useState<TimelineNode | null>(null);

  // Layout the graph when it changes
  useEffect(() => {
    layoutWithElk(graph.rootId, graph.nodes).then(({ nodes: newNodes, edges: newEdges }) => {
      // Add runner styling to nodes
      const styledNodes = newNodes.map(node => {
        const isCurrentNode = isPlaying && runnerPath.length > 0 && runnerIndex < runnerPath.length && runnerPath[runnerIndex] === node.id;
        const isCompletedNode = isPlaying && runnerPath.length > 0 && runnerIndex > 0 && runnerPath.slice(0, runnerIndex).includes(node.id);
        
        return {
          ...node,
          style: {
            ...(isCurrentNode && {
              boxShadow: '0 0 0 3px #10b981',
              border: '2px solid #10b981'
            }),
            ...(isCompletedNode && {
              opacity: 0.7,
              filter: 'grayscale(0.3)'
            })
          }
        };
      });
      
      setNodes(styledNodes);
      setEdges(newEdges);
    });
  }, [graph, setNodes, setEdges, isPlaying, runnerPath, runnerIndex]);

  // Handle node clicks
  const onNodeClickHandler = useCallback((event: any, node: Node) => {
    onNodeClick?.(node.id);
  }, [onNodeClick]);



  const startRunner = () => {
    if (!onStartRunner) return;
    onStartRunner();
  };

  const stopRunner = () => {
    if (!onStopRunner) return;
    onStopRunner();
  };

  const handleDecisionChoice = (childId: string) => {
    if (!currentDecisionNode || !onDecisionChoice) return;
    
    // Record the choice
    onDecisionChoice(currentDecisionNode.id, childId);
    
    // Close popup
    setShowDecisionPopup(false);
    setCurrentDecisionNode(null);
  };

  // Check if we need to show decision popup
  useEffect(() => {
    if (isPlaying && runnerPath.length > 0 && runnerIndex < runnerPath.length) {
      const currentNodeId = runnerPath[runnerIndex];
      const currentNode = graph.nodes[currentNodeId];
      
      if (currentNode && currentNode.kind === "decision") {
        // Check if this decision has a chosen child
        const hasChosenChild = currentNode.chosenChildIds && currentNode.chosenChildIds.length > 0;
        if (!hasChosenChild) {
          setCurrentDecisionNode(currentNode);
          setShowDecisionPopup(true);
        }
      }
    }
  }, [isPlaying, runnerPath, runnerIndex, graph.nodes]);

  return (
    <div style={{ 
      height: 540, 
      borderRadius: 16, 
      overflow: "hidden", 
      border: "1px solid #e5e7eb",
      background: 'white',
      position: 'relative'
    }}>
      {/* Runner Controls - Only render after hydration */}
      {hasHydrated && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          display: 'flex',
          gap: '8px'
                }}>
            {/* Progress Indicator - Only show when we have a meaningful path */}
            {isPlaying && runnerPath.length > 1 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#374151',
                border: '1px solid #e5e7eb',
                marginRight: '8px'
              }}>
                Step {runnerIndex + 1} of {runnerPath.length}
              </div>
            )}
            {/* Current Node Indicator */}
            {isPlaying && runnerPath.length > 0 && runnerIndex < runnerPath.length && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#065f46',
                border: '1px solid #10b981',
                marginRight: '8px'
              }}>
                Current: {graph.nodes[runnerPath[runnerIndex]]?.title || 'Unknown'}
                {graph.nodes[runnerPath[runnerIndex]]?.kind === 'action' && (
                  <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                    ({msToHuman(runnerProgressMs)} / {msToHuman(estimateDuration(graph.nodes[runnerPath[runnerIndex]]))})
                  </span>
                )}
              </div>
            )}
            {!isPlaying ? (
              <button
                onClick={startRunner}
                style={{
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '14px'
                }}
              >
                <Play size={16} />
                Run
              </button>
            ) : (
              <button
                onClick={stopRunner}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '14px'
                }}
              >
                <Square size={16} />
                Stop
              </button>
            )}
          </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        panOnScroll
        zoomOnScroll
        attributionPosition="bottom-left"
      >
        <Background />
      </ReactFlow>

      {/* Decision Popup - Only render after hydration */}
      {hasHydrated && showDecisionPopup && currentDecisionNode && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          zIndex: 1000,
          minWidth: '300px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Decision Point: {currentDecisionNode.title}
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Choose which path to take:
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentDecisionNode.children?.map((childId) => {
              const child = graph.nodes[childId];
              if (!child) return null;
              
              return (
                <button
                  key={childId}
                  onClick={() => handleDecisionChoice(childId)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    textAlign: 'left',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{child.title}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>{child.kind}</div>
                    </div>
                    {child.kind === "action" && (
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {msToHuman(child.defaultDurationMs)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <button
              onClick={() => {
                setShowDecisionPopup(false);
                setCurrentDecisionNode(null);
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                color: '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
