'use client';

import { memo, useState, useEffect } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';

interface CompletionRecord {
  completedAt: number;
  timeSpent: number;
  note?: string;
}

interface TaskNodeData extends BaseNodeData {
  timeSpent?: number;
  startTime?: number;
  isRunning?: boolean;
  completionHistory?: CompletionRecord[];
  videoUrl?: string;
}

export const TaskNode = (props: NodeProps<TaskNodeData>) => {
  const { data } = props;
  const [currentTime, setCurrentTime] = useState(data.timeSpent || 0);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (data.isRunning && data.startTime) {
      // Update immediately
      setCurrentTime((data.timeSpent || 0) + (Date.now() - data.startTime));
      
      // Then update every second
      interval = setInterval(() => {
        setCurrentTime((data.timeSpent || 0) + (Date.now() - data.startTime!));
      }, 1000);
    } else {
      setCurrentTime(data.timeSpent || 0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [data.isRunning, data.startTime, data.timeSpent]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="task-node">
      <BaseNode {...props} />
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <span>⏱ {formatTime(currentTime)}</span>
        <div className="flex items-center space-x-1">
          {data.isRunning ? (
            <span className="text-green-500">●</span>
          ) : (
            <span className="text-gray-400">○</span>
          )}
          {data.completionHistory && data.completionHistory.length > 0 && (
            <span className="text-blue-500 font-medium">
              {data.completionHistory.length}✓
            </span>
          )}
        </div>
      </div>
      {data.videoUrl && (
        <div className="mt-4">
          <video width="320" height="180" controls style={{ maxWidth: '100%' }}>
            <source src={data.videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default memo(TaskNode); 