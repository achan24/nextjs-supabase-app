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
];

export default function NodeToolbox({ setNodes }: NodeToolboxProps) {
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();

    const type = event.dataTransfer.getData('application/reactflow');
    const position = { x: event.clientX, y: event.clientY };

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { label: `New ${type}` },
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
            className="p-3 bg-white rounded-md shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow"
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