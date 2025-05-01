'use client';

import { memo } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';

interface ProcessNodeData extends BaseNodeData {
  subTasks?: string[];
  progress?: number;
}

export const ProcessNode = (props: NodeProps<ProcessNodeData>) => {
  const { data } = props;
  
  return (
    <div className="process-node">
      <BaseNode {...props} />
      {data.subTasks && data.subTasks.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Sub-tasks:</div>
          <ul className="text-xs text-gray-600">
            {data.subTasks.map((task, index) => (
              <li key={index} className="ml-2">• {task}</li>
            ))}
          </ul>
        </div>
      )}
      {data.progress !== undefined && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full" 
              style={{ width: `${data.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ProcessNode); 