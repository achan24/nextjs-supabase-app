'use client';

import { DragEvent, useState, useEffect } from 'react';
import { Node, ReactFlowInstance } from 'reactflow';

interface NodeToolboxProps {
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  reactFlowInstance: ReactFlowInstance | null;
}

const nodeTypes = [
  {
    type: 'task',
    label: 'Task',
    description: 'A single actionable task',
    icon: '🔨',
  },
  {
    type: 'note',
    label: 'Note',
    description: 'Add context or thoughts',
    icon: '📋',
  },
  {
    type: 'process',
    label: 'Process',
    description: 'Group of related tasks',
    icon: '🔄',
  },
  {
    type: 'skill',
    label: 'Skill',
    description: 'Area of expertise',
    icon: '🎯',
  },
  {
    type: 'technique',
    label: 'Technique',
    description: 'Specific practice method',
    icon: '⚡',
  },
  {
    type: 'analytics',
    label: 'Analytics',
    description: 'Visualize task completion data',
    icon: '📊',
  },
  {
    type: 'link',
    label: 'Node Link',
    description: 'Jump to a node in another map',
    icon: '🔗',
  },
];

export default function NodeToolbox({ setNodes, reactFlowInstance }: NodeToolboxProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [pendingNodeType, setPendingNodeType] = useState<string | null>(null);
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [nodesInFlow, setNodesInFlow] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  // Fetch all flows when modal opens
  useEffect(() => {
    if (showLinkModal) {
      fetch('/api/process-flows')
        .then(res => res.json())
        .then(data => setFlows(data));
    }
  }, [showLinkModal]);

  // Fetch nodes for selected flow
  useEffect(() => {
    if (selectedFlowId) {
      fetch(`/api/process-flows/${selectedFlowId}`)
        .then(res => res.json())
        .then(data => setNodesInFlow(data.nodes || []));
    } else {
      setNodesInFlow([]);
    }
  }, [selectedFlowId]);

  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const addNode = (type: string) => {
    if (type === 'link') {
      setPendingNodeType(type);
      setShowLinkModal(true);
      return;
    }
    if (!reactFlowInstance) return;

    // Get the ReactFlow container element
    const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    // Get the current viewport
    const { x, y, zoom } = reactFlowInstance.getViewport();
    
    // Calculate the center position based on the ReactFlow container bounds
    const centerX = (-x + (reactFlowBounds.width / 2)) / zoom;
    const centerY = (-y + (reactFlowBounds.height / 2)) / zoom;

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: centerX, y: centerY },
      data: {
        label: `New ${type}`,
        description: '',
        status: 'ready',
        ...(type === 'task' && { timeSpent: 0, isRunning: false }),
        ...(type === 'note' && { content: '' }),
        ...(type === 'process' && { subTasks: [], progress: 0 }),
        ...(type === 'skill' && { level: 1, experience: '' }),
        ...(type === 'technique' && { effectiveness: 0, steps: [] }),
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const handleCreateLinkNode = () => {
    if (!reactFlowInstance || !selectedFlowId || !selectedNodeId) return;

    // Get the ReactFlow container element
    const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    const { x, y, zoom } = reactFlowInstance.getViewport();
    const centerX = (-x + (reactFlowBounds.width / 2)) / zoom;
    const centerY = (-y + (reactFlowBounds.height / 2)) / zoom;

    const newNode: Node = {
      id: `link-${Date.now()}`,
      type: 'link',
      position: { x: centerX, y: centerY },
      data: {
        label: 'Node Link',
        linkedFlowId: selectedFlowId,
        linkedNodeId: selectedNodeId,
      },
    };
    setNodes(nds => [...nds, newNode]);
    setShowLinkModal(false);
    setSelectedFlowId('');
    setSelectedNodeId('');
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Add Nodes</h3>
      <div className="space-y-2">
        {nodeTypes.map((nodeType) => (
          <div
            key={nodeType.type}
            draggable
            onDragStart={(event) => onDragStart(event, nodeType.type)}
            onClick={() => addNode(nodeType.type)}
            className="p-3 bg-white rounded-md shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow active:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              <span className="text-xl">{nodeType.icon}</span>
              <div>
                <div className="font-medium">{nodeType.label}</div>
                <div className="text-xs text-gray-500">{nodeType.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg min-w-[320px]">
            <h2 className="text-lg font-semibold mb-4">Link to Node</h2>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Select Flow</label>
              <select className="w-full border rounded px-2 py-1" value={selectedFlowId} onChange={e => setSelectedFlowId(e.target.value)}>
                <option value="">-- Choose a flow --</option>
                {flows.map(flow => (
                  <option key={flow.id} value={flow.id}>{flow.title}</option>
                ))}
              </select>
            </div>
            {selectedFlowId && (
              <div className="mb-4">
                <label className="block mb-1 font-medium">Select Node</label>
                <select className="w-full border rounded px-2 py-1" value={selectedNodeId} onChange={e => setSelectedNodeId(e.target.value)}>
                  <option value="">-- Choose a node --</option>
                  {nodesInFlow.map(node => (
                    <option key={node.id} value={node.id}>{node.data?.label || node.id}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowLinkModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={!selectedFlowId || !selectedNodeId} onClick={handleCreateLinkNode}>Create Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 