'use client';

import { DragEvent, useState, useEffect } from 'react';
import { Node, ReactFlowInstance, useReactFlow } from 'reactflow';

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
    type: 'calculation',
    label: 'Calculation',
    description: 'Sum up values from connected nodes',
    icon: '🧮',
  },
  {
    type: 'link',
    label: 'Node Link',
    description: 'Jump to a node in another map',
    icon: '🔗',
  },
  {
    type: 'checklist',
    label: 'Checklist',
    description: 'Create a list of checkable items',
    icon: '✅',
  },
];

export default function NodeToolbox({ setNodes, reactFlowInstance }: NodeToolboxProps) {
  const { project, getViewport } = useReactFlow();
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

    // Get the current viewport
    const { x, y, zoom } = getViewport();
    
    // Calculate center position
    const centerX = (-x + window.innerWidth / 2) / zoom;
    const centerY = (-y + window.innerHeight / 2) / zoom;

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
        ...(type === 'checklist' && { text: '', items: [] }),
      },
    };

    console.log('Adding node:', { type, position: newNode.position, viewport: { x, y, zoom }});
    setNodes((nds) => [...nds, newNode]);
  };

  const handleCreateLinkNode = () => {
    if (!selectedFlowId || !selectedNodeId) return;

    const { x, y, zoom } = getViewport();
    const centerX = (-x + window.innerWidth / 2) / zoom;
    const centerY = (-y + window.innerHeight / 2) / zoom;

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
        <div className="grid grid-cols-2 gap-2">
          <div
            className="p-3 bg-blue-50 border-2 border-blue-200 rounded-md cursor-pointer hover:bg-blue-100"
            onDragStart={(event) => onDragStart(event, 'task')}
            onClick={() => addNode('task')}
            draggable
          >
            🔨 Task
          </div>
          <div
            className="p-3 bg-yellow-50 border-2 border-yellow-200 rounded-md cursor-pointer hover:bg-yellow-100"
            onDragStart={(event) => onDragStart(event, 'note')}
            onClick={() => addNode('note')}
            draggable
          >
            📋 Note
          </div>
          <div
            className="p-3 bg-purple-50 border-2 border-purple-200 rounded-md cursor-pointer hover:bg-purple-100"
            onDragStart={(event) => onDragStart(event, 'process')}
            onClick={() => addNode('process')}
            draggable
          >
            🔄 Process
          </div>
          <div
            className="p-3 bg-green-50 border-2 border-green-200 rounded-md cursor-pointer hover:bg-green-100"
            onDragStart={(event) => onDragStart(event, 'skill')}
            onClick={() => addNode('skill')}
            draggable
          >
            🎯 Skill
          </div>
          <div
            className="p-3 bg-orange-50 border-2 border-orange-200 rounded-md cursor-pointer hover:bg-orange-100"
            onDragStart={(event) => onDragStart(event, 'technique')}
            onClick={() => addNode('technique')}
            draggable
          >
            ⚡ Technique
          </div>
          <div
            className="p-3 bg-indigo-50 border-2 border-indigo-200 rounded-md cursor-pointer hover:bg-indigo-100"
            onDragStart={(event) => onDragStart(event, 'analytics')}
            onClick={() => addNode('analytics')}
            draggable
          >
            📊 Analytics
          </div>
          <div
            className="p-3 bg-teal-50 border-2 border-teal-200 rounded-md cursor-pointer hover:bg-teal-100"
            onDragStart={(event) => onDragStart(event, 'calculation')}
            onClick={() => addNode('calculation')}
            draggable
          >
            🧮 Calculation
          </div>
          <div
            className="p-3 bg-blue-50 border-2 border-blue-200 rounded-md cursor-pointer hover:bg-blue-100"
            onDragStart={(event) => onDragStart(event, 'link')}
            onClick={() => addNode('link')}
            draggable
          >
            🔗 Link
          </div>
          <div
            className="p-3 bg-purple-50 border-2 border-purple-200 rounded-md cursor-pointer hover:bg-purple-100"
            onDragStart={(event) => onDragStart(event, 'noteRef')}
            onClick={() => addNode('noteRef')}
            draggable
          >
            📝 Note Reference
          </div>
          <div
            className="p-3 bg-green-50 border-2 border-green-200 rounded-md cursor-pointer hover:bg-green-100"
            onDragStart={(event) => onDragStart(event, 'checklist')}
            onClick={() => addNode('checklist')}
            draggable
          >
            ✅ Checklist
          </div>
        </div>
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