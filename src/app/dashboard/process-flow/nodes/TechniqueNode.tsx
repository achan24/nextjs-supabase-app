'use client';

import { memo } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';

interface TechniqueNodeData extends BaseNodeData {
  effectiveness?: number;
  steps?: string[];
}

export const TechniqueNode = (props: NodeProps<TechniqueNodeData>) => {
  const { data } = props;
  
  return (
    <div className="technique-node">
      <BaseNode {...props} />
      {data.effectiveness !== undefined && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Effectiveness: {data.effectiveness}%</div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-green-600 h-1.5 rounded-full" 
              style={{ width: `${data.effectiveness}%` }}
            />
          </div>
        </div>
      )}
      {data.steps && data.steps.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Steps:</div>
          <ol className="text-xs text-gray-600 list-decimal list-inside">
            {data.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default memo(TechniqueNode); 