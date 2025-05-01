'use client';

import { Node } from 'reactflow';

interface TimelinePanelProps {
  nodes: Node[];
}

export default function TimelinePanel({ nodes }: TimelinePanelProps) {
  const activeNodes = nodes.filter(node => node.data.status === 'active');
  const completedNodes = nodes.filter(node => node.data.status === 'completed');

  return (
    <div className="h-full flex items-center px-4 space-x-8">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
        <span className="text-sm font-medium">
          Active ({activeNodes.length})
        </span>
        <div className="ml-4 space-x-2">
          {activeNodes.map(node => (
            <span key={node.id} className="text-sm text-blue-600">
              {node.data.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-sm font-medium">
          Completed ({completedNodes.length})
        </span>
        <div className="ml-4 space-x-2">
          {completedNodes.map(node => (
            <span key={node.id} className="text-sm text-green-600">
              {node.data.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
} 