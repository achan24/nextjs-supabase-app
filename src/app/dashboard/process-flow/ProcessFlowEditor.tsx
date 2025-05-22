'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
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
  ReactFlowInstance,
  useReactFlow,
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
import { AnalyticsNode } from './nodes/AnalyticsNode';
import FlashcardReview from './components/FlashcardReview';
import LinkNode from './nodes/LinkNode';

interface ProcessFlow {
  id: string;
  title: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  updated_at: string;
  created_at: string;
  user_id: string;
}

const nodeTypes = {
  task: TaskNode,
  note: NoteNode,
  process: ProcessNode,
  skill: SkillNode,
  technique: TechniqueNode,
  analytics: AnalyticsNode,
  link: LinkNode,
};

interface ProcessFlowEditorProps {
  user: User;
  flowTitle: string;
  setFlowTitle: (title: string) => void;
}

export default function ProcessFlowEditor({ user, flowTitle, setFlowTitle }: ProcessFlowEditorProps) {
  const supabase = createClient();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [currentFlow, setCurrentFlow] = useState<ProcessFlow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [flowDescription, setFlowDescription] = useState('');
  const [flows, setFlows] = useState<ProcessFlow[]>([]);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);
  const jumpTargetRef = useRef<{ flowId: string; nodeId: string } | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDetails();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setRf(instance);
  }, []);

  const adjustNodePosition = useCallback((node: Node) => {
    if (!reactFlowInstance) return node;

    // Get the current viewport
    const { x, y, zoom } = reactFlowInstance.getViewport();
    
    // Get the flow bounds
    const flowBounds = reactFlowInstance.getViewport();
    
    // Calculate the center of the viewport in flow coordinates
    const centerX = (-x + window.innerWidth / 2) / zoom;
    const centerY = (-y + window.innerHeight / 2) / zoom;
    
    return {
      ...node,
      position: {
        x: centerX - 75, // Offset by half the node width
        y: centerY - 50, // Offset by half the node height
      },
    };
  }, [reactFlowInstance]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

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

    // If this is a task node being updated, update connected analytics nodes
    const updatedNode = nodes.find(n => n.id === nodeId);
    if (updatedNode?.type === 'task' && updatedNode.data.completionHistory) {
      const connectedAnalyticsNodes = edges
        .filter(e => e.source === nodeId)
        .map(e => nodes.find(n => n.id === e.target))
        .filter(n => n?.type === 'analytics');

      connectedAnalyticsNodes.forEach(analyticsNode => {
        if (analyticsNode) {
          setNodes(nds => 
            nds.map(n => 
              n.id === analyticsNode.id 
                ? { ...n, data: { ...n.data, completionHistory: updatedNode.data.completionHistory } }
                : n
            )
          );
        }
      });
    }
  }, [nodes, edges, selectedNode]);

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

      // Update analytics node if target is an analytics node
      const targetNode = nodes.find(n => n.id === params.target);
      if (targetNode?.type === 'analytics') {
        const sourceNode = nodes.find(n => n.id === params.source);
        if (sourceNode?.type === 'task' && sourceNode.data.completionHistory) {
          updateNode(targetNode.id, {
            completionHistory: sourceNode.data.completionHistory
          });
        }
      }
    },
    [nodes, updateNode]
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

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Only close the details panel if clicking directly on the background
    if (e.target === e.currentTarget) {
      if (isDetailsOpen) {
        closeDetails();
      }
    }
  }, [isDetailsOpen, closeDetails]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    // Only set dropEffect to 'move' if we're dragging from the toolbox
    const isToolboxDrag = event.dataTransfer.types.includes('application/reactflow');
    event.dataTransfer.dropEffect = isToolboxDrag ? 'move' : 'none';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Only handle drops from the toolbox
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      // FIX: Use mouse position for node placement
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = rf?.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      }) || { x: 0, y: 0 };

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
        case 'analytics':
          nodeData = {
            ...baseData,
            data: '',
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
    [rf]
  );

  const defaultEdgeOptions = {
    type: 'bezier',
    style: { 
      strokeWidth: 2,
      stroke: '#555',
    },
  };

  // Load flows on mount
  useEffect(() => {
    const loadFlows = async () => {
      try {
        console.log('Loading flows for user:', user.id);
        const { data: flows, error } = await supabase
          .from('process_flows')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading flows:', error);
          throw error;
        }
        
        console.log('Loaded flows:', flows);
        setFlows(flows);
        if (flows.length > 0) {
          const latestFlow = flows[0];
          setCurrentFlow(latestFlow);
          setNodes(latestFlow.nodes);
          setEdges(latestFlow.edges);
          setFlowTitle(latestFlow.title);
          setFlowDescription(latestFlow.description || '');
        }
      } catch (error) {
        console.error('Error in loadFlows:', error);
      }
    };

    loadFlows();
  }, [supabase, user.id]);

  const createNewFlow = () => {
    setCurrentFlow(null);
    setNodes([]);
    setEdges([]);
    setFlowTitle('Untitled Flow');
    setFlowDescription('');
  };

  const loadFlow = async (flow: ProcessFlow) => {
    try {
      const { data, error } = await supabase
        .from('process_flows')
        .select('*')
        .eq('id', flow.id)
        .single();

      if (error) throw error;
      
      setCurrentFlow(data);
      setNodes(data.nodes);
      setEdges(data.edges);
      setFlowTitle(data.title);
      setFlowDescription(data.description || '');
    } catch (error) {
      console.error('Error loading flow:', error);
    }
  };

  const deleteFlow = async (flowId: string) => {
    if (!confirm('Are you sure you want to delete this flow?')) return;

    try {
      const { error } = await supabase
        .from('process_flows')
        .delete()
        .eq('id', flowId);
      
      if (error) throw error;
      
      setFlows(flows.filter(f => f.id !== flowId));
      if (currentFlow?.id === flowId) {
        createNewFlow();
      }
    } catch (error) {
      console.error('Error deleting flow:', error);
    }
  };

  // Save flow
  const saveFlow = async () => {
    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });
    
    try {
      console.log('Save attempt - User:', user.id, 'Current flow:', currentFlow?.id);
      
      // First, check if there's a newer version in the database
      if (currentFlow?.id) {
        const { data: latestFlow, error: checkError } = await supabase
          .from('process_flows')
          .select('*')  // Changed from just updated_at to get full flow
          .eq('id', currentFlow.id)
          .single();

        if (checkError) throw checkError;

        // Compare timestamps
        const dbTimestamp = new Date(latestFlow.updated_at).getTime();
        const localTimestamp = new Date(currentFlow.updated_at).getTime();

        if (dbTimestamp > localTimestamp) {
          // Load the newer version automatically
          setCurrentFlow(latestFlow);
          setNodes(latestFlow.nodes);
          setEdges(latestFlow.edges);
          setFlowTitle(latestFlow.title);
          setFlowDescription(latestFlow.description || '');
          
          setSaveStatus({
            type: 'success',
            message: 'Updated to latest version from another session'
          });
          setIsSaving(false);
          return;
        }
      }
      
      const flowData = {
        user_id: user.id,
        title: flowTitle || 'Untitled Flow',
        description: flowDescription,
        nodes: nodes || [],
        edges: edges || [],
      };

      console.log('Flow data to save:', {
        ...flowData,
        nodesCount: nodes.length,
        edgesCount: edges.length
      });

      let operation;
      if (currentFlow?.id) {
        console.log('Updating existing flow:', currentFlow.id);
        operation = supabase
          .from('process_flows')
          .update(flowData)
          .eq('id', currentFlow.id)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        console.log('Creating new flow');
        operation = supabase
          .from('process_flows')
          .insert(flowData)
          .select()
          .single();
      }

      const { data, error: dbError } = await operation;

      if (dbError) {
        console.error('Database operation failed:', {
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        });
        throw new Error(`Database error: ${dbError.message} (${dbError.code})`);
      }

      console.log('Flow saved successfully:', data);
      setCurrentFlow(data);

      // Refresh the flows list
      console.log('Refreshing flows list for user:', user.id);
      const { data: updatedFlows, error: flowsError } = await supabase
        .from('process_flows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (flowsError) {
        console.error('Error refreshing flows:', {
          code: flowsError.code,
          message: flowsError.message,
          details: flowsError.details,
          hint: flowsError.hint
        });
        throw new Error(`Failed to refresh flows: ${flowsError.message}`);
      }

      console.log('Updated flows list:', updatedFlows);
      setFlows(updatedFlows);
      
      setSaveStatus({ type: 'success', message: 'Flow saved successfully!' });
    } catch (error) {
      console.error('Save operation failed:', error);
      setSaveStatus({ 
        type: 'error', 
        message: error instanceof Error 
          ? `Save failed: ${error.message}` 
          : 'Failed to save flow. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (saveStatus.type) {
      const timer = setTimeout(() => {
        setSaveStatus({ type: null, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Auto-save on changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (nodes.length > 0) {
        saveFlow();
      }
    }, 2000); // Auto-save 2 seconds after last change

    return () => clearTimeout(debounceTimer);
  }, [nodes, edges, flowTitle, flowDescription]);

  // Make the save status more visible
  const renderSaveStatus = () => {
    if (!saveStatus.type || saveStatus.type === 'success') return null;

    return (
      <div className="p-4 mb-4 bg-red-100 text-red-800 border border-red-400 rounded-md">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{saveStatus.message}</p>
          </div>
        </div>
      </div>
    );
  };

  // Function to jump to a node in a flow
  const jumpToNode = (flowId: string, nodeId: string) => {
    console.log('[jump][step1] jumpToNode called with', { flowId, nodeId });
    jumpTargetRef.current = { flowId, nodeId };
    loadFlowByIdAndJump(flowId); // don't await
  };

  // Helper to load a flow (no need to pass nodeId)
  const loadFlowByIdAndJump = async (flowId: string) => {
    console.log('[jump][step2] loadFlowByIdAndJump called with', { flowId });
    try {
      const { data, error } = await supabase
        .from('process_flows')
        .select('*')
        .eq('id', flowId)
        .single();
      if (error) throw error;
      setCurrentFlow(data);
      setNodes(data.nodes);
      setEdges(data.edges);
      setFlowTitle(data.title);
      setFlowDescription(data.description || '');
      console.log('[jump][step2] loadFlowByIdAndJump finished, flow loaded:', data?.id);
    } catch (error) {
      console.error('[jump][step2] Error loading flow for jump:', error);
    }
  };

  // Single effect for jump-to-link logic
  useEffect(() => {
    const jumpTarget = jumpTargetRef.current;
    console.log('[jump][step3] useEffect triggered', { jumpTarget, currentFlowId: currentFlow?.id, rfReady: !!rf, nodesLength: nodes.length });
    if (!jumpTarget || !rf) {
      console.log('[jump][step3] jumpTarget or rf not ready');
      return;
    }
    if (currentFlow?.id !== jumpTarget.flowId) {
      console.log('[jump][step3] Not on the right flow yet, waiting...');
      return;
    }
    const node = rf.getNodes().find(n => n.id === jumpTarget.nodeId);
    if (!node) {
      console.log('[jump][step3] Node not found yet, waiting...');
      return;
    }
    console.log('[jump][step3] Node found, jumping to', node.id, node.position);
    rf.setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 800 });
    jumpTargetRef.current = null;
    console.log('[jump][step3] Jump complete, jumpTarget cleared');
  }, [currentFlow, rf, nodes]);

  // Fallback timeout for missing node
  useEffect(() => {
    if (!jumpTargetRef.current) return;
    const timer = setTimeout(() => {
      if (jumpTargetRef.current) {
        console.log('[jump][step4] Fallback timeout: node not found in time, showing alert and clearing jumpTarget');
        alert("Sorry, I can't find that node in this flow.");
        jumpTargetRef.current = null;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentFlow, rf, nodes]);

  const onPaneClick = (event: React.MouseEvent) => {
    if (selectedNodeType && reactFlowInstance) {
      // Convert the click position to flow coordinates
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${selectedNodeType}-${Date.now()}`,
        type: selectedNodeType,
        position,
        data: {
          label: `New ${selectedNodeType}`,
          description: '',
          status: 'ready',
          ...(selectedNodeType === 'task' && { timeSpent: 0, isRunning: false }),
          ...(selectedNodeType === 'note' && { content: '' }),
          ...(selectedNodeType === 'process' && { subTasks: [], progress: 0 }),
          ...(selectedNodeType === 'skill' && { level: 1, experience: '' }),
          ...(selectedNodeType === 'technique' && { effectiveness: 0, steps: [] }),
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeType(null);
    }
  };

  const formatDate = (date: string | number) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="h-full w-full flex p-0 m-0" onClick={handleBackgroundClick} style={{margin:0,padding:0}}>
      {/* Left Panel - Node Toolbox */}
      <div
        className={`${
          isToolboxOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed w-64 bg-white shadow-md p-4 overflow-y-auto transition-transform duration-300 ease-in-out h-full border-r border-gray-200 flex-shrink-0 z-20`}
        onClick={(e) => e.stopPropagation()}
        style={{ left: 0, top: 0 }}
      >
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center space-x-2">
            <button
              onClick={createNewFlow}
              className="flex-1 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              New Flow
            </button>
            <button
              onClick={saveFlow}
              disabled={isSaving}
              className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 relative"
            >
              {isSaving ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={() => setIsToolboxOpen(false)}
              className="ml-2 p-1 rounded hover:bg-gray-100"
              title="Hide Sidebar"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {renderSaveStatus()}

          {/* Flow Management */}
          <div>
            <h4 className="text-sm font-medium mb-2">Your Flows</h4>
            <div className="space-y-2">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className={`p-2 rounded-md cursor-pointer ${
                    currentFlow?.id === flow.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => loadFlow(flow)}
                >
                  <div className="font-medium">{flow.title}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(flow.updated_at)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Add Nodes</h4>
              <NodeToolbox 
                setNodes={setNodes} 
                reactFlowInstance={reactFlowInstance}
                onNodeTypeSelect={setSelectedNodeType}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Flow Area */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden p-0 m-0" style={{margin:0,padding:0}}>
        <div className="flex-1 relative w-full h-full p-0 m-0" style={{margin:0,padding:0}}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={onInit}
            onPaneClick={onPaneClick}
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
            connectionMode={ConnectionMode.Strict}
            deleteKeyCode={['Backspace', 'Delete']}
            selectionKeyCode={['Shift']}
            multiSelectionKeyCode={['Meta', 'Ctrl']}
            zoomActivationKeyCode={['Meta', 'Ctrl']}
            panActivationKeyCode={['Space']}
            className="h-full w-full p-0 m-0"
            fitView
            style={{margin:0,padding:0}}
          >
            <Background gap={12} size={1} />
            <Controls showInteractive={true} />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Bottom Panel - Timeline */}
        <div className="h-16 bg-white border-t border-gray-200 flex-shrink-0 p-0 m-0" style={{margin:0,padding:0}}>
          <TimelinePanel nodes={nodes} />
        </div>
      </div>

      {/* Right Panel - Node Details */}
      <div
        className={`${
          isDetailsOpen ? 'translate-x-0' : 'translate-x-full'
        } fixed w-80 bg-white shadow-md overflow-y-auto transition-transform duration-300 ease-in-out h-full border-l border-gray-200 flex-shrink-0 z-20 right-0`}
        onClick={(e) => e.stopPropagation()}
        style={{ top: 0 }}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Node Details</h3>
            <button
              onClick={closeDetails}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Hide Details"
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
              onStartReview={() => setIsReviewMode(true)}
              jumpToNode={jumpToNode}
            />
          ) : (
            <div className="text-gray-500 text-center">
              Select a node to view details
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar Toggle Button */}
      <button
        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
        className="fixed top-4 right-4 z-30 p-2 bg-white rounded-md shadow-md"
        style={{ display: isDetailsOpen ? 'none' : 'block' }}
        title="Show Details"
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

      {/* Flashcard Review Modal */}
      {selectedNode && (
        <FlashcardReview
          node={selectedNode}
          updateNode={updateNode}
          isOpen={isReviewMode}
          onClose={() => setIsReviewMode(false)}
        />
      )}

      {/* Mobile Menu Buttons */}
      <button
        onClick={() => setIsToolboxOpen(!isToolboxOpen)}
        className="fixed top-4 left-4 z-30 p-2 bg-white rounded-md shadow-md"
        style={{ display: isToolboxOpen ? 'none' : 'block' }}
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
    </div>
  );
} 