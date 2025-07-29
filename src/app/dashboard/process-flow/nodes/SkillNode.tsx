'use client';

import { memo } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';

interface SkillNodeData extends BaseNodeData {
  level?: number;        // Current skill level (0-100)
  experience?: string;   // Notes about experience/progress
  effectiveness?: number; // How well you can apply this skill (0-100)
  lastPracticed?: Date;  // When was this skill last used
}

export const SkillNode = (props: NodeProps<SkillNodeData>) => {
  const { data } = props;
  
  return (
    <div className="skill-node">
      <BaseNode {...props} />
      <div className="mt-2 space-y-2">
        {/* Level Progress */}
        {data.level !== undefined && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Level: {data.level}/100</div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-purple-600 h-1.5 rounded-full" 
                style={{ width: `${data.level}%` }}
              />
            </div>
          </div>
        )}

        {/* Effectiveness (if tracked) */}
        {data.effectiveness !== undefined && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Effectiveness: {data.effectiveness}%</div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-green-600 h-1.5 rounded-full" 
                style={{ width: `${data.effectiveness}%` }}
              />
            </div>
          </div>
        )}

        {/* Last practiced date */}
        {data.lastPracticed && (
          <div className="text-xs text-gray-500">
            Last practiced: {new Date(data.lastPracticed).toLocaleDateString()}
          </div>
        )}

        {/* Experience/Notes */}
        {data.experience && (
          <div className="text-xs text-gray-600 mt-2">
            {data.experience}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(SkillNode); 