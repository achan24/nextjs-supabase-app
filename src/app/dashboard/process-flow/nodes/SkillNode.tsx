'use client';

import { memo } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';

interface SkillNodeData extends BaseNodeData {
  level?: number;
  experience?: string;
}

export const SkillNode = (props: NodeProps<SkillNodeData>) => {
  const { data } = props;
  
  return (
    <div className="skill-node">
      <BaseNode {...props} />
      {data.level !== undefined && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Level: {data.level}/10</div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-purple-600 h-1.5 rounded-full" 
              style={{ width: `${data.level * 10}%` }}
            />
          </div>
        </div>
      )}
      {data.experience && (
        <div className="mt-2 text-xs text-gray-600">
          {data.experience}
        </div>
      )}
    </div>
  );
};

export default memo(SkillNode); 