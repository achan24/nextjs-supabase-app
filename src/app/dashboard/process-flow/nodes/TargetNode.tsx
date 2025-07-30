'use client';

import { memo, useEffect, useState } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode from './BaseNode';
import { useReactFlow } from 'reactflow';

interface TargetNodeData {
  label: string;
  type: 'number' | 'boolean';
  targetValue: number | boolean;
  metric: string;
  units?: string;  // Optional units field for number type targets
  isCompleted?: boolean;
  attempts?: Array<{
    date: string;
    value: number | boolean;
    notes?: string;
  }>;
}

export const TargetNode = memo(({ id, data, dragHandle, selected, type, zIndex, isConnectable, xPos, yPos, dragging, ...rest }: NodeProps<TargetNodeData>) => {
  return (
    <div className="target-node relative">
      <BaseNode id={id} data={data} dragHandle={dragHandle} selected={selected} type={type} zIndex={zIndex} isConnectable={isConnectable} xPos={xPos} yPos={yPos} dragging={dragging} {...rest} />
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span>
            {data.type === 'number'
              ? `${data.targetValue} ${data.units || ''} ${data.metric}`
              : `${data.metric} must be ${data.targetValue ? 'Yes' : 'No'}`
            }
          </span>
        </div>
        <div className="flex items-center gap-1">
          {data.isCompleted ? (
            <span className="text-green-500">●</span>
          ) : (
            <span className="text-gray-400">○</span>
          )}
          {data.attempts && data.attempts.length > 0 && (
            <span className="text-blue-500 font-medium">
              {data.attempts.length}⚡
            </span>
          )}
        </div>
      </div>
    </div>
  );
}); 