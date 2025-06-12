'use client';

import { memo, useState, useEffect, useMemo } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';
import { createClient } from '@/lib/supabase';

interface CompletionRecord {
  completedAt: number;
  timeSpent: number;
  note?: string;
}

interface CueRecord {
  id: string;
  text: string;
  createdAt: number;
  lastUsed?: number;
  useCount: number;
  archived: boolean;
}

interface Reminder {
  id?: string;
  type: 'before' | 'at';
  minutes_before?: number;
  time?: string;
  sent_at?: string;
}

interface TaskNodeData extends BaseNodeData {
  timeSpent?: number;
  startTime?: number;
  isRunning?: boolean;
  completionHistory?: CompletionRecord[];
  videoUrl?: string;
  cues?: CueRecord[];
  activeCueId?: string;
  targetTime?: string;
  targetDuration?: number;
  eta?: string;
  reminders?: Reminder[];
  useTargetDuration?: boolean;
  value?: number;
  dueDate?: string;
}

export const TaskNode = memo(({ id, data, dragHandle, selected, type, zIndex, isConnectable, xPos, yPos, dragging }: NodeProps<TaskNodeData>) => {
  const [currentTime, setCurrentTime] = useState(data.timeSpent || 0);
  const [eta, setEta] = useState<string | null>(null);
  const [showCue, setShowCue] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState<number | null>(null);
  const supabase = createClient();
  const [audioContext] = useState(() => new (window.AudioContext || (window as any).webkitAudioContext)());
  
  // Parse and store value if it's in the label
  useEffect(() => {
    if (data.label) {
      const valueMatch = data.label.match(/VALUE:\s*(-?\d+)/);
      if (valueMatch && data.value !== Number(valueMatch[1])) {
        data.value = Number(valueMatch[1]);
      }
    }
  }, [data.label]);

  // Calculate average completion time
  const avgTime = useMemo(() => {
    if (data.completionHistory && data.completionHistory.length > 0) {
      const total = data.completionHistory.reduce((sum, rec) => sum + rec.timeSpent, 0);
      return total / data.completionHistory.length;
    }
    return null;
  }, [data.completionHistory]);

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

  // Handle target time setting
  useEffect(() => {
    if (data.targetTime) {
      // Create or update reminder for target time
      const targetDate = new Date(data.targetTime);
      const reminder = {
        type: 'at' as const,
        time: targetDate.toISOString()
      };

      // Check if we already have a target time reminder
      const existingTargetReminder = data.reminders?.find(r => 
        r.type === 'at' && r.time === data.targetTime
      );

      if (!existingTargetReminder) {
        // Save reminder to database
        supabase.from('reminders').insert([{
          task_id: id,
          type: 'at',
          time: targetDate.toISOString()
        }]).then(({ error }) => {
          if (error) console.error('Error saving target time reminder:', error);
          else {
            // Update local state
            data.reminders = [...(data.reminders || []), reminder];
          }
        });
      }
    }
  }, [data.targetTime, id, data.reminders]);

  // Handle timer state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let lastNotificationCheck = 0;
    
    if (data.isRunning && data.startTime) {
      // Calculate ETA when timer starts
      if (data.completionHistory && data.completionHistory.length > 0) {
        const total = data.completionHistory.reduce((sum, rec) => sum + rec.timeSpent, 0);
        const avgTime = total / data.completionHistory.length;
        const etaTime = new Date(data.startTime + avgTime);
        setEta(etaTime.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: false 
        }));
      }

      // Update timer and check notifications
      const updateTimer = () => {
        if (!data.startTime) return;
        const currentElapsedTime = (data.timeSpent || 0) + (Date.now() - data.startTime);
        setCurrentTime(currentElapsedTime);

        // Check notifications every 30 seconds
        const now = Date.now();
        if (now - lastNotificationCheck >= 30000) {
          // Only check notifications if we have either target duration (and it's enabled) or completion history
          if ((data.useTargetDuration && data.targetDuration) || 
              (!data.useTargetDuration && data.completionHistory?.length)) {
            
            let shouldNotify = false;
            let notificationTime = 0;

            if (data.useTargetDuration && data.targetDuration) {
              // Use target duration for notification
              notificationTime = data.targetDuration * 1000;
              shouldNotify = currentElapsedTime >= notificationTime;
            } else if (!data.useTargetDuration && data.completionHistory?.length) {
              // Use average completion time for notification
              const total = data.completionHistory.reduce((sum, rec) => sum + rec.timeSpent, 0);
              const avgTime = total / data.completionHistory.length;
              shouldNotify = currentElapsedTime >= avgTime;
              notificationTime = avgTime;
            }

            if (shouldNotify) {
              // Show notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Time to Stop Task', {
                  body: `${data.useTargetDuration ? 'Target duration' : 'Average completion time'} reached for: ${data.label}`,
                  icon: '/favicon.ico'
                });
              }
              // Play a sound
              playNotificationSound();
            }
          }
          // Update last notification check time
          lastNotificationCheck = now;
        }
      };

      // Update immediately and then every second
      updateTimer();
      interval = setInterval(updateTimer, 1000);

      // Persist the timer state
      localStorage.setItem(`timer_${id}`, JSON.stringify({
        startTime: data.startTime,
        timeSpent: data.timeSpent || 0
      }));
    } else {
      setCurrentTime(data.timeSpent || 0);
      setEta(null); // Clear ETA when timer stops
      // Clear persisted state when timer is stopped
      localStorage.removeItem(`timer_${id}`);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [data.isRunning, data.startTime, data.timeSpent, id, data.completionHistory, data.reminders, data.targetDuration, data.label, data.useTargetDuration]);

  // Request notification permission when component mounts
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Show cue when timer starts
    if (data.isRunning && data.activeCueId && data.cues) {
      const activeCue = data.cues.find(c => c.id === data.activeCueId);
      if (activeCue && !activeCue.archived) {
        setShowCue(true);
      }
    } else {
      setShowCue(false);
    }
  }, [data.isRunning, data.activeCueId, data.cues]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const activeCue = data.cues?.find(c => c.id === data.activeCueId);

  const playNotificationSound = () => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  return (
    <div className="task-node relative">
      <BaseNode id={id} data={data} dragHandle={dragHandle} selected={selected} type={type} zIndex={zIndex} isConnectable={isConnectable} xPos={xPos} yPos={yPos} dragging={dragging} />
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between w-full">
        <span>⏱ {formatTime(currentTime)}</span>
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
          {data.reminders && data.reminders.length > 0 && (
            <span className="text-yellow-500" title="Has reminders">⏰</span>
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
      {showCue && activeCue && (
        <div className="absolute -right-64 top-0 w-60 p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg">
          <div className="text-sm text-yellow-700">{activeCue.text}</div>
        </div>
      )}
      <div className="mt-2 space-y-1">
        {data.value !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Value:</span>
            <span className={`font-medium ${data.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.value > 0 ? '+' : ''}{data.value}
            </span>
          </div>
        )}
        {data.dueDate && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Due:</span>
            <span className="text-gray-600">{new Date(data.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default memo(TaskNode); 