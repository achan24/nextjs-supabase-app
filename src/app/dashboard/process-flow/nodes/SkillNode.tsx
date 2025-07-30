'use client';

import { memo, useEffect, useMemo, useState, useCallback } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode from './BaseNode';
import { createClient } from '@/lib/supabase';
import { useTaskTimer } from '@/contexts/TaskTimerContext';
import { useReactFlow } from 'reactflow';

type CompletionRecord = { timeSpent: number };

interface SkillNodeData {
  timeSpent: number;
  isRunning: boolean;
  startTime?: number;
  label: string;
  targetDuration?: number;
  useTargetDuration?: boolean;
  completionHistory?: CompletionRecord[];
  targetTime?: number;
  activeCueId?: string;
  cues?: Array<{ id: string; text: string; archived?: boolean }>;
  flowId?: string;
}

export const SkillNode = memo(({ id, data, dragHandle, selected, type, zIndex, isConnectable, xPos, yPos, dragging, ...rest }: NodeProps<SkillNodeData>) => {
  const [displayTime, setDisplayTime] = useState(data.timeSpent || 0);
  const [eta, setEta] = useState<string | null>(null);
  const [showCue, setShowCue] = useState(false);
  const supabase = createClient();
  const { startTimer, stopTimer, resetTimer, getCurrentTime, isTimerRunning } = useTaskTimer();
  const { getEdges } = useReactFlow();

  // Calculate average completion time
  const avgTime = useMemo(() => {
    if (data.completionHistory && data.completionHistory.length > 0) {
      const total = data.completionHistory.reduce((sum, rec) => sum + rec.timeSpent, 0);
      return total / data.completionHistory.length;
    }
    return null;
  }, [data.completionHistory]);

  // Update timer state when data changes
  useEffect(() => {
    const running = isTimerRunning(id);
    if (data.isRunning !== running) {
      const currentTime = getCurrentTime(id);
      const updatedData = {
        ...data,
        isRunning: running,
        timeSpent: currentTime
      };

      if (data.flowId) {
        supabase
          .from('process_flows')
          .select('nodes')
          .eq('id', data.flowId)
          .single()
          .then(({ data: flow, error }) => {
            if (error) {
              console.error('Error fetching flow:', error);
              return;
            }

            const updatedNodes = flow.nodes.map((n: any) => {
              if (n.id === id) {
                return {
                  ...n,
                  data: updatedData
                };
              }
              return n;
            });

            supabase
              .from('process_flows')
              .update({ nodes: updatedNodes })
              .eq('id', data.flowId)
              .then(({ error }) => {
                if (error) {
                  console.error('Error updating flow:', error);
                }
              });
        });
      }
    }

    if (data.isRunning) {
      startTimer(id, {
        timeSpent: data.timeSpent || 0,
        label: data.label,
        targetDuration: data.targetDuration,
        useTargetDuration: data.useTargetDuration || false,
        completionHistory: data.completionHistory,
      });
    }
  }, [id, data, startTimer, getCurrentTime, isTimerRunning, supabase]);

  // Handle timer display updates
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const updateDisplay = () => {
      setDisplayTime(getCurrentTime(id));
    };
    updateDisplay();
    if (isTimerRunning(id)) {
      interval = setInterval(updateDisplay, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [id, getCurrentTime, isTimerRunning(id)]);

  // Handle reset
  useEffect(() => {
    if (data.timeSpent === 0 && !data.isRunning) {
      setDisplayTime(0);
    } else {
      const currentTime = getCurrentTime(id);
      setDisplayTime(currentTime);
    }
  }, [id, data.timeSpent, data.isRunning, getCurrentTime]);

  // Update ETA
  useEffect(() => {
    if (!data.isRunning || !avgTime) return;

    const updateEta = () => {
      const currentTime = getCurrentTime(id);
      const etaTime = new Date(Date.now() + (avgTime - (currentTime % avgTime)));
      setEta(etaTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
      }));
    };

    updateEta();
    const interval = setInterval(updateEta, 1000);

    return () => clearInterval(interval);
  }, [id, data.isRunning, avgTime, getCurrentTime]);

  // Show cue when timer starts
  useEffect(() => {
    if (data.isRunning && data.activeCueId && data.cues) {
      const activeCue = data.cues.find(c => c.id === data.activeCueId);
      if (activeCue && !activeCue.archived) {
        setShowCue(true);
      }
    } else {
      setShowCue(false);
    }
  }, [data.isRunning, data.activeCueId, data.cues]);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const activeCue = data.cues?.find(c => c.id === data.activeCueId);

  // Debug state
  const [debugTargets, setDebugTargets] = useState<string[]>([]);
  const [debugEdges, setDebugEdges] = useState<any[]>([]);
  const [debugIncomingEdges, setDebugIncomingEdges] = useState<any[]>([]);
  const [debugIncomingSources, setDebugIncomingSources] = useState<string[]>([]);

  useEffect(() => {
    const allEdges = getEdges();
    setDebugEdges(allEdges.filter((e: any) => e.source === id));
    setDebugTargets(
      allEdges.filter((e: any) => e.source === id).map((e: any) => e.target)
    );
    setDebugIncomingEdges(allEdges.filter((e: any) => e.target === id));
    setDebugIncomingSources(
      allEdges.filter((e: any) => e.target === id).map((e: any) => e.source)
    );
  }, [id, getEdges]);

  return (
    <div className="skill-node relative">
      <BaseNode id={id} data={data} dragHandle={dragHandle} selected={selected} type={type} zIndex={zIndex} isConnectable={isConnectable} xPos={xPos} yPos={yPos} dragging={dragging} {...rest} />
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between w-full">
        <span>⏱ {formatTime(displayTime)}</span>
        <span className="flex-1 text-center text-gray-500">
          {avgTime !== null && (
            <div className="flex flex-col">
              <span>Avg: {formatTime(avgTime)}</span>
              {eta && data.isRunning && (
                <span className="text-blue-500">ETA: {eta}</span>
              )}
              {data.targetTime && !data.isRunning && (
                <span className="text-purple-500">Target: {new Date(data.targetTime).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false 
                })}</span>
              )}
            </div>
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
      {showCue && activeCue && (
        <div className="absolute -right-64 top-0 w-60 p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg">
          <div className="text-sm text-yellow-700">{activeCue.text}</div>
        </div>
      )}
    </div>
  );
});

export default memo(SkillNode); 