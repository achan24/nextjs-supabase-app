'use client';

import { DragEvent } from 'react';
import { Node } from 'reactflow';

interface NodeToolboxProps {
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
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
];

export default function NodeToolbox({ setNodes }: NodeToolboxProps) {
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const addNode = (type: string) => {
    // Add node to the center of the viewport
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      // Position will be adjusted by the parent component
      position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
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
    </div>
  );
} 