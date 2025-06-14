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
  ReactFlowProvider,
  BezierEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import NodeToolbox from './components/NodeToolbox';
import NodeDetails from './components/NodeDetails';
import TimelinePanel from './components/TimelinePanel';
import { TaskNode } from './nodes/TaskNode';
import { NoteNode } from './nodes/NoteNode';
import { ProcessNode } from './nodes/ProcessNode';
import { SkillNode } from './nodes/SkillNode';
import { TechniqueNode } from './nodes/TechniqueNode';
import { AnalyticsNode } from './nodes/AnalyticsNode';
import CalculationNode from './nodes/CalculationNode';
import FlashcardReview from './components/FlashcardReview';
import LinkNode from './nodes/LinkNode';
import NoteReferenceNode from './nodes/NoteReferenceNode';
import ChecklistNode from './nodes/ChecklistNode';

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
  calculation: CalculationNode,
  link: LinkNode,
  noteRef: NoteReferenceNode,
  checklist: ChecklistNode,
};

const edgeTypes = {
  default: BezierEdge,
  bezier: BezierEdge,
};

interface ProcessFlowEditorProps {
  user: User;
  flowTitle: string;
  setFlowTitle: (title: string) => void;
  onFlowChange?: (flowId: string | null) => void;
}

export default function ProcessFlowEditor({ user, flowTitle, setFlowTitle, onFlowChange }: ProcessFlowEditorProps) {
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const router = useRouter();

  // Handle URL parameters
  useEffect(() => {
    const handleUrlParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const flowId = params.get('flowId');
      const nodeId = params.get('nodeId');
      
      if (!flowId) return;

      // If we're already on the right flow and have a nodeId, just center on it
      if (flowId === currentFlow?.id && nodeId && rf) {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          console.log('[url] Centering on node in current flow:', nodeId);
          rf.setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 800 });
          return;
        }
      }

      // If we need to load a different flow
      if (flowId !== currentFlow?.id) {
        console.log('[url] Loading new flow:', flowId);
        await loadFlowByIdAndJump(flowId);
        
        // After loading the flow, wait a bit and then try to center on the node
        if (nodeId) {
          setTimeout(() => {
            if (!rf) return;
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
              console.log('[url] Centering on node in new flow:', nodeId);
              rf.setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 800 });
            }
          }, 500); // Give time for the flow to load and render
        }
      }
    };
    
    handleUrlParams();
  }, [window.location.search, currentFlow?.id, nodes, rf]);

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
          // Handle style updates separately to preserve existing styles
          const updatedStyle = data.style ? {
            ...(node.style || {}),
            ...data.style
          } : node.style;

          const updatedNode = {
            ...node,
            data: { ...node.data, ...data },
            style: updatedStyle
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

      // Update target node based on type
      const targetNode = nodes.find(n => n.id === params.target);
        const sourceNode = nodes.find(n => n.id === params.source);

      if (targetNode && sourceNode) {
        // Handle analytics nodes
        if (targetNode.type === 'analytics' && sourceNode.type === 'task' && sourceNode.data.completionHistory) {
          updateNode(targetNode.id, {
            completionHistory: sourceNode.data.completionHistory
          });
        }
        
        // Handle calculation nodes
        if (targetNode.type === 'calculation' && sourceNode.type === 'task') {
          // If the source node is completed and has a value, trigger a recalculation
          if (sourceNode.data.status === 'completed' && typeof sourceNode.data.value === 'number') {
            // Get all source nodes connected to the calculation node
            const connectedSourceNodes = edges
              .filter(e => e.target === targetNode.id)
              .map(e => nodes.find(n => n.id === e.source))
              .filter((n): n is Node => n !== undefined);

            // Calculate the sum of completed nodes' values
            const sum = connectedSourceNodes.reduce((total, node) => {
              if (node.data.status === 'completed' && typeof node.data.value === 'number') {
                return total + node.data.value;
              }
              return total;
            }, 0);

            // Update the calculation node with the new sum
            updateNode(targetNode.id, { value: sum });
          }
        }
      }
    },
    [nodes, edges, updateNode]
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

      // Get the viewport info
      if (!rf) return;
      const { x, y, zoom } = rf.getViewport();

      let position;
      if (event.clientX === 0 && event.clientY === 0) {
        // Mobile click - center of viewport
        position = { x: (-x + window.innerWidth/2)/zoom, y: (-y + window.innerHeight/2)/zoom };
      } else {
        // Desktop drag and drop
        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        position = rf.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });
      }

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
        case 'calculation':
          nodeData = {
            ...baseData,
            value: 0,
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
        console.log('Loading flows - User object:', user);
        console.log('Loading flows - User ID:', user.id);
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
        console.log('Number of flows:', flows?.length);
        setFlows(flows);

        // Check URL parameters first
        const params = new URLSearchParams(window.location.search);
        const flowId = params.get('flowId');
        
        if (flowId) {
          console.log('Found flowId in URL, loading flow:', flowId);
          const targetFlow = flows.find(f => f.id === flowId);
          if (targetFlow) {
            console.log('Found target flow:', targetFlow);
            setCurrentFlow(targetFlow);
            setNodes(targetFlow.nodes || []);
            setEdges(targetFlow.edges || []);
            setFlowTitle(targetFlow.title);
            setFlowDescription(targetFlow.description || '');
            
            // Wait for React Flow to be ready
            const checkRf = setInterval(() => {
              if (rf) {
                clearInterval(checkRf);
                // Center the view
                rf.fitView({ duration: 800 });
              }
            }, 100);

            // Clear the interval after 5 seconds to prevent memory leaks
            setTimeout(() => clearInterval(checkRf), 5000);
            
            return;
          } else {
            console.error('Flow not found:', flowId);
          }
        }

        // If no URL parameters or flow not found, load latest flow
        if (flows.length > 0) {
          const latestFlow = flows[0];
          console.log('Setting latest flow:', latestFlow);
          setCurrentFlow(latestFlow);
          setNodes(latestFlow.nodes || []);
          setEdges(latestFlow.edges || []);
          setFlowTitle(latestFlow.title);
          setFlowDescription(latestFlow.description || '');
        }
      } catch (error) {
        console.error('Error in loadFlows:', error);
      }
    };

    if (user?.id) {
      console.log('User ID present, loading flows...');
      loadFlows();
    } else {
      console.error('No user ID available');
    }
  }, [supabase, user.id, rf]);

  const createNewFlow = async () => {
    try {
      const flowData = {
        user_id: user.id,
        title: 'Untitled Flow',
        description: '',
        nodes: [],
        edges: [],
      };

      const { data, error } = await supabase
        .from('process_flows')
        .insert(flowData)
        .select()
        .single();

      if (error) throw error;

      // Update state with the new flow
      setCurrentFlow(data);
    setNodes([]);
    setEdges([]);
    setFlowTitle('Untitled Flow');
    setFlowDescription('');

      // Update URL
      router.push(`/dashboard/process-flow?flowId=${data.id}`);

      // Refresh flows list
      const { data: updatedFlows, error: flowsError } = await supabase
        .from('process_flows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (flowsError) throw flowsError;
      setFlows(updatedFlows || []);

    } catch (error) {
      console.error('Error creating new flow:', error);
      toast.error('Failed to create new flow');
    }
  };

  const loadFlow = async (flow: ProcessFlow) => {
    try {
      const { data, error } = await supabase
        .from('process_flows')
        .select('*')
        .eq('id', flow.id)
        .single();

      if (error) throw error;
      
      // Update URL first
      const url = `/dashboard/process-flow?flowId=${flow.id}`;
      window.history.replaceState({}, '', url);
      
      // Then update state
      setCurrentFlow(data);
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setFlowTitle(data.title);
      setFlowDescription(data.description || '');

      // Center view after a short delay to ensure nodes are rendered
      setTimeout(() => {
        if (rf) {
          rf.fitView({ duration: 800 });
        }
      }, 100);
    } catch (error) {
      console.error('Error loading flow:', error);
    }
  };

  const deleteFlow = async (flowId: string) => {
    if (deleteConfirmText.toLowerCase() !== 'delete map') {
      return;
    }

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
      setShowDeleteModal(false);
      setDeleteConfirmText('');
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
  const jumpToNode = async (flowId: string, nodeId: string) => {
    console.log('[jump][step1] jumpToNode called with', { flowId, nodeId });
    
    // Use router.push instead of window.location.href
    router.push(`/dashboard/process-flow?flowId=${flowId}&nodeId=${nodeId}`);
  };

  // Helper to load a flow (no need to pass nodeId)
  const loadFlowByIdAndJump = async (flowId: string) => {
    console.log('[jump][step2] loadFlowByIdAndJump called with', { flowId });
    try {
      const { data: flow, error } = await supabase
        .from('process_flows')
        .select('*')
        .eq('id', flowId)
        .single();
      
      if (error) throw error;
      
      if (!flow) {
        console.error('[jump][step2] Flow not found');
        return;
      }

      console.log('[jump][step2] Flow loaded, updating state with flow:', flow.id);
      
      // Update all state at once
      setCurrentFlow(flow);
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
      setFlowTitle(flow.title);
      setFlowDescription(flow.description || '');
    } catch (error) {
      console.error('[jump][step2] Error loading flow for jump:', error);
    }
  };

  // Effect to handle initial node centering after flow loads
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nodeId = params.get('nodeId');
    
    if (nodeId && rf && nodes.length > 0) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        console.log('[init] Centering on initial node:', nodeId);
        setTimeout(() => {
          rf.setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 800 });
        }, 100);
      }
    }
  }, [rf, nodes]);

  // Update onFlowChange when currentFlow changes
  useEffect(() => {
    onFlowChange?.(currentFlow?.id || null);
  }, [currentFlow, onFlowChange]);

  // Watch for URL parameter changes
  useEffect(() => {
    const handleUrlChange = async () => {
      const params = new URLSearchParams(window.location.search);
      const flowId = params.get('flowId');
      
      if (!flowId) {
        // If no flowId in URL, load latest flow
        if (flows.length > 0) {
          const latestFlow = flows[0];
          setCurrentFlow(latestFlow);
          setNodes(latestFlow.nodes || []);
          setEdges(latestFlow.edges || []);
          setFlowTitle(latestFlow.title);
          setFlowDescription(latestFlow.description || '');
        }
        return;
      }

      // Don't reload if we're already showing this flow
      if (flowId === currentFlow?.id) {
        return;
      }

      // Find the flow in our loaded flows first
      const targetFlow = flows.find(f => f.id === flowId);
      if (targetFlow) {
        setCurrentFlow(targetFlow);
        setNodes(targetFlow.nodes || []);
        setEdges(targetFlow.edges || []);
        setFlowTitle(targetFlow.title);
        setFlowDescription(targetFlow.description || '');

        // Center view after a short delay
        setTimeout(() => {
          if (rf) {
            rf.fitView({ duration: 800 });
          }
        }, 100);
        return;
      }

      // If not found in loaded flows, try to fetch it
      try {
        const { data, error } = await supabase
          .from('process_flows')
          .select('*')
          .eq('id', flowId)
          .single();

        if (error) {
          console.error('Error loading flow:', error);
          return;
        }

        if (data) {
          setCurrentFlow(data);
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
          setFlowTitle(data.title);
          setFlowDescription(data.description || '');

          // Center view after a short delay
          setTimeout(() => {
            if (rf) {
              rf.fitView({ duration: 800 });
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error in URL change handler:', error);
      }
    };

    handleUrlChange();
  }, [window.location.search, currentFlow?.id, flows, rf, supabase]);

  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex p-0 m-0" onClick={handleBackgroundClick} style={{margin:0,padding:0}}>
        {/* Left Panel - Node Toolbox */}
        <div
          className={`${
            isToolboxOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed w-64 bg-white shadow-md p-4 overflow-y-auto transition-transform duration-300 ease-in-out h-full border-r border-gray-200 flex-shrink-0 z-20 flex flex-col`}
          onClick={(e) => e.stopPropagation()}
          style={{ left: 0, top: 0 }}
        >
          <div className="flex flex-col space-y-4 flex-grow">
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
            <div className="flex flex-col space-y-2">
              {/* Flow Selector */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Select Flow</label>
                <select
                  value={currentFlow?.id || ''}
                  onChange={async (e) => {
                    const flow = flows.find(f => f.id === e.target.value);
                    if (flow) {
                      // Update URL first
                      const url = `/dashboard/process-flow?flowId=${flow.id}`;
                      window.history.replaceState({}, '', url);
                      
                      // Then load the flow
                      setCurrentFlow(flow);
                      setNodes(flow.nodes || []);
                      setEdges(flow.edges || []);
                      setFlowTitle(flow.title);
                      setFlowDescription(flow.description || '');

                      // Center view after a short delay to ensure nodes are rendered
                      setTimeout(() => {
                        if (rf) {
                          rf.fitView({ duration: 800 });
                        }
                      }, 100);
                    }
                  }}
                  className="w-full px-2 py-1 border rounded"
                >
                  <option value="" disabled>Select a flow...</option>
                  {flows.map(flow => (
                    <option key={flow.id} value={flow.id}>
                      {flow.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={flowTitle}
                  onChange={(e) => setFlowTitle(e.target.value)}
                  placeholder="Flow Title"
                  className="w-full px-2 py-1 border rounded"
                />
              </div>
              
              <div>
                <textarea
                  value={flowDescription}
                  onChange={(e) => setFlowDescription(e.target.value)}
                  placeholder="Flow Description"
                  className="w-full px-2 py-1 border rounded"
                  rows={3}
                />
              </div>

              <div className="border-t pt-4">
                <NodeToolbox setNodes={setNodes} reactFlowInstance={reactFlowInstance} />
              </div>
            </div>
          </div>

          {/* Options Menu */}
          {currentFlow && (
            <div className="pt-4 mt-4 border-t">
              <button
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-between"
              >
                <span>Flow Options</span>
                <svg
                  className={`w-4 h-4 transform transition-transform ${showOptionsMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showOptionsMenu && (
                <div className="mt-2 space-y-2">
                  <button
                    onClick={() => {
                      setNodes(nds => 
                        nds.map(node => {
                          if (node.type === 'task') {
                            return {
                              ...node,
                              data: {
                                ...node.data,
                                status: 'ready',
                                timeSpent: 0,
                                isRunning: false
                              }
                            };
                          }
                          return node;
                        })
                      );
                    }}
                    className="w-full px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset All Tasks
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full px-3 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Process Flow
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && currentFlow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-md">
              <h3 className="text-lg font-semibold mb-4">Delete Process Flow</h3>
              <p className="text-gray-600 mb-4">
                This action cannot be undone. To confirm deletion, please type "delete map" below:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type 'delete map' to confirm"
                className="w-full px-3 py-2 border rounded mb-4"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteFlow(currentFlow.id)}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete map'}
                  className={`px-4 py-2 text-white rounded ${
                    deleteConfirmText.toLowerCase() === 'delete map'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

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
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
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
    </ReactFlowProvider>
  );
} 