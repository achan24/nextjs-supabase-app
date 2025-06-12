'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import ClozeText from '../components/ClozeText';

interface ClozeStats {
  id: string;
  content: string;
  context: string;
  stats: {
    correctCount: number;
    incorrectCount: number;
    lastReviewed?: number;
  }
}

export interface BaseNodeData {
  label: string;
  description?: string;
  status?: 'ready' | 'active' | 'completed';
  isTestMode?: boolean;
  clozeStats?: Record<string, ClozeStats>;
  tags?: string[];
  value?: number;
  isCalculationNode?: boolean;
}

const nodeTypeStyles = {
  task: {
    icon: '🔨',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    selectedBorderClass: 'border-blue-500',
  },
  note: {
    icon: '📋',
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
    selectedBorderClass: 'border-yellow-500',
  },
  process: {
    icon: '🔄',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    selectedBorderClass: 'border-purple-500',
  },
  calculation: {
    icon: '🧮',
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-200',
    selectedBorderClass: 'border-teal-500',
  },
  skill: {
    icon: '🎯',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    selectedBorderClass: 'border-green-500',
  },
  technique: {
    icon: '⚡',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    selectedBorderClass: 'border-orange-500',
  },
  analytics: {
    icon: '📊',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200',
    selectedBorderClass: 'border-indigo-500',
  },
  checklist: {
    icon: '✅',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    selectedBorderClass: 'border-green-500',
  },
};

const BaseNode = ({
  data,
  isConnectable,
  selected,
  type = 'task',
}: NodeProps<BaseNodeData>) => {
  const styles = nodeTypeStyles[type as keyof typeof nodeTypeStyles] || nodeTypeStyles.task;

  const statusColors = {
    ready: 'bg-yellow-100 border-yellow-400',
    active: 'bg-blue-100 border-blue-400',
    completed: 'bg-green-100 border-green-400',
    default: `${styles.bgClass} ${styles.borderClass}`,
  };

  const borderColor = selected ? styles.selectedBorderClass : styles.borderClass;
  const bgColor = data.status ? statusColors[data.status] : statusColors.default;

  return (
    <div className={`relative px-4 py-2 shadow-md rounded-md border-2 ${borderColor} ${bgColor}`}>
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />
      
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />

      <div className="flex items-center space-x-2">
        <span className="text-xl">{styles.icon}</span>
        <div className="flex flex-col">
          <div className="text-sm font-bold">{data.label}</div>
          {data.description && (
            <div className="text-xs text-black whitespace-pre-wrap">
              <ClozeText 
                text={data.description} 
                isTestMode={!!data.isTestMode}
              />
            </div>
          )}
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tags.map((tag, index) => (
                <span key={index} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />

      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />
    </div>
  );
};

export default memo(BaseNode); 