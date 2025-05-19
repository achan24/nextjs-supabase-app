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
  const { data, id } = props;
  const [currentTime, setCurrentTime] = useState(data.timeSpent || 0);
  
  useEffect(() => {
    // Load persisted state from localStorage
    const persistedState = localStorage.getItem(`timer_${id}`);
    if (persistedState) {
      const { startTime, timeSpent } = JSON.parse(persistedState);
      if (startTime) {
        // If there was a running timer, calculate the elapsed time
        const elapsedTime = Date.now() - startTime;
        setCurrentTime(timeSpent + elapsedTime);
      } else {
        setCurrentTime(timeSpent);
      }
    }
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (data.isRunning && data.startTime) {
      // Update immediately
      setCurrentTime((data.timeSpent || 0) + (Date.now() - data.startTime));
      
      // Then update every second
      interval = setInterval(() => {
        setCurrentTime((data.timeSpent || 0) + (Date.now() - data.startTime!));
      }, 1000);

      // Persist the timer state
      localStorage.setItem(`timer_${id}`, JSON.stringify({
        startTime: data.startTime,
        timeSpent: data.timeSpent || 0
      }));
    } else {
      setCurrentTime(data.timeSpent || 0);
      // Clear persisted state when timer is stopped
      localStorage.removeItem(`timer_${id}`);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [data.isRunning, data.startTime, data.timeSpent, id]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Compute average completion time if there are completions
  let avgTime: number | null = null;
  if (data.completionHistory && data.completionHistory.length > 0) {
    const total = data.completionHistory.reduce((sum, rec) => sum + rec.timeSpent, 0);
    avgTime = total / data.completionHistory.length;
  }

  return (
    <div className="task-node">
      <BaseNode {...props} />
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between w-full">
        <span>⏱ {formatTime(currentTime)}</span>
        <span className="flex-1 text-center text-gray-500">
          {avgTime !== null && (
            <span>{formatTime(avgTime)}</span>
          )}
        </span>
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