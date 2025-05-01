'use client';

import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  ConnectionMode,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import NodeToolbox from './components/NodeToolbox';
import NodeDetails from './components/NodeDetails';
import TimelinePanel from './components/TimelinePanel';
import { TaskNode } from './nodes/TaskNode';
import { NoteNode } from './nodes/NoteNode';
import { ProcessNode } from './nodes/ProcessNode';
import { SkillNode } from './nodes/SkillNode';
import { TechniqueNode } from './nodes/TechniqueNode';

const nodeTypes = {
  task: TaskNode,
  note: NoteNode,
  process: ProcessNode,
  skill: SkillNode,
  technique: TechniqueNode,
};

export default function ProcessFlowEditor() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDetails();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      console.table({
        source: params.source,
        sourceHandle: params.sourceHandle,
        target: params.target,
        targetHandle: params.targetHandle
      });

      setEdges((eds) => 
        addEdge({
          ...params,
          id: `edge-${params.source}-${params.target}-${Date.now()}`,
          type: 'bezier',
          animated: false,
          style: { 
            strokeWidth: 2,
            stroke: '#555',
          },
        }, eds)
      );
    },
    []
  );

  const isValidConnection = useCallback((connection: Connection) => {
    // Allow connections between any handles
    return true;
  }, []);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNode(node);
    setIsDetailsOpen(true);
  }, []);

  const closeDetails = useCallback(() => {
    setIsDetailsOpen(false);
    setSelectedNode(null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    if (isDetailsOpen) {
      closeDetails();
    }
  }, [isDetailsOpen, closeDetails]);

  const updateNode = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: { ...node.data, ...data },
          };
          if (selectedNode?.id === nodeId) {
            setSelectedNode(updatedNode);
          }
          return updatedNode;
        }
        return node;
      })
    );
  }, [selectedNode]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      // Default data for all node types
      const baseData = {
        label: `New ${type}`,
        description: '',
        status: 'ready',
      };

      // Add type-specific properties
      let nodeData;
      switch (type) {
        case 'task':
          nodeData = {
            ...baseData,
            timeSpent: 0,
            isRunning: false,
          };
          break;
        case 'note':
          nodeData = {
            ...baseData,
            content: '',
          };
          break;
        case 'process':
          nodeData = {
            ...baseData,
            subTasks: [],
            progress: 0,
          };
          break;
        case 'skill':
          nodeData = {
            ...baseData,
            level: 1,
            experience: '',
          };
          break;
        case 'technique':
          nodeData = {
            ...baseData,
            effectiveness: 0,
            steps: [],
          };
          break;
        default:
          nodeData = baseData;
      }

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: nodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    []
  );

  const defaultEdgeOptions = {
    type: 'bezier',
    style: { 
      strokeWidth: 2,
      stroke: '#555',
    },
  };

  return (
    <div className="h-full w-full flex" onClick={handleBackgroundClick}>
      {/* Left Panel - Node Toolbox */}
      <div
        className={`${
          isToolboxOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static w-64 bg-white shadow-md p-4 overflow-y-auto transition-transform duration-300 ease-in-out h-full border-r border-gray-200 flex-shrink-0 z-20`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Nodes</h3>
        </div>
        <NodeToolbox setNodes={setNodes} />
      </div>

      {/* Main Flow Area */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 relative w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            minZoom={0.1}
            maxZoom={10}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            translateExtent={[
              [-10000, -10000],
              [10000, 10000]
            ]}
            proOptions={{ hideAttribution: true }}
            snapToGrid={true}
            snapGrid={[15, 15]}
            isValidConnection={isValidConnection}
            connectionMode={ConnectionMode.Loose}
            connectionLineType={ConnectionLineType.Straight}
            className="h-full w-full"
          >
            <Background gap={12} size={1} />
            <Controls showInteractive={true} />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Bottom Panel - Timeline */}
        <div className="h-16 bg-white border-t border-gray-200 flex-shrink-0">
          <TimelinePanel nodes={nodes} />
        </div>
      </div>

      {/* Right Panel - Node Details */}
      <div
        className={`${
          isDetailsOpen ? 'translate-x-0' : 'translate-x-full'
        } fixed md:static w-80 bg-white shadow-md overflow-y-auto transition-transform duration-300 ease-in-out h-full border-l border-gray-200 flex-shrink-0 z-20 right-0 md:right-auto`}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Node Details</h3>
            <button
              onClick={closeDetails}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {selectedNode ? (
            <NodeDetails 
              node={selectedNode} 
              setNodes={setNodes}
              updateNode={updateNode}
            />
          ) : (
            <div className="text-gray-500 text-center">
              Select a node to view details
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Buttons */}
      <button
        onClick={() => setIsToolboxOpen(!isToolboxOpen)}
        className="md:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-md shadow-md"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <button
        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
        className="md:hidden fixed top-4 right-4 z-30 p-2 bg-white rounded-md shadow-md"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </div>
  );
} 