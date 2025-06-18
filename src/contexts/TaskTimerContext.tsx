'use client';

import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface TaskTimer {
  taskId: string;
  startTime: number;
  timeSpent: number;
  targetDuration?: number;
  useTargetDuration: boolean;
  label: string;
  completionHistory?: Array<{ timeSpent: number }>;
  lastNotificationTime?: number;
  isRunning: boolean;
}

interface TaskTimerContextType {
  startTimer: (taskId: string, initialData: Omit<TaskTimer, 'taskId' | 'startTime' | 'lastNotificationTime' | 'isRunning'>) => void;
  stopTimer: (taskId: string) => void;
  resetTimer: (taskId: string) => void;
  getCurrentTime: (taskId: string) => number;
  isTimerRunning: (taskId: string) => boolean;
}

const TaskTimerContext = createContext<TaskTimerContextType | undefined>(undefined);

// Store timers in memory but outside of React's state
const globalTimers = new Map<string, TaskTimer>();
let notificationInterval: NodeJS.Timeout | null = null;

export function TaskTimerProvider({ children }: { children: React.ReactNode }) {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context lazily
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playNotificationSound = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }, [getAudioContext]);

  const sendNotification = useCallback((timer: TaskTimer) => {
    const now = Date.now();
    
    // Don't send notifications more frequently than every 30 seconds
    if (timer.lastNotificationTime && now - timer.lastNotificationTime < 30000) {
      return;
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Time to Stop Task', {
        body: `${timer.useTargetDuration ? 'Target duration' : 'Average completion time'} reached for: ${timer.label}`,
        icon: '/favicon.ico',
        tag: `task-${timer.taskId}` // Prevent duplicate notifications
      });
      
      toast.info(`Time to stop: ${timer.label}`, {
        duration: 5000,
      });

      playNotificationSound();
    }

    // Update last notification time
    const timerData = globalTimers.get(timer.taskId);
    if (timerData) {
      globalTimers.set(timer.taskId, { ...timerData, lastNotificationTime: now });
    }
  }, [playNotificationSound]);

  // Request notification permission when the provider mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Start notification check interval if not already running
      if (!notificationInterval) {
        notificationInterval = setInterval(() => {
          const now = Date.now();
          
          globalTimers.forEach((timer) => {
            if (!timer.isRunning) return;

            const currentElapsedTime = timer.timeSpent + (now - timer.startTime);
            let shouldNotify = false;
            let notificationThreshold = 0;

            if (timer.useTargetDuration && timer.targetDuration) {
              notificationThreshold = timer.targetDuration * 1000;
              shouldNotify = currentElapsedTime >= notificationThreshold;
            } else if (!timer.useTargetDuration && timer.completionHistory?.length) {
              const total = timer.completionHistory.reduce((sum, rec) => sum + rec.timeSpent, 0);
              notificationThreshold = total / timer.completionHistory.length;
              shouldNotify = currentElapsedTime >= notificationThreshold;
            }

            if (shouldNotify) {
              sendNotification(timer);
            }
          });
        }, 1000);
      }
    }

    // Cleanup function
    return () => {
      if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
      }
    };
  }, [sendNotification]);

  const startTimer = useCallback((taskId: string, initialData: Omit<TaskTimer, 'taskId' | 'startTime' | 'lastNotificationTime' | 'isRunning'>) => {
    const now = Date.now();
    const existingTimer = globalTimers.get(taskId);
    
    // If timer exists and is running, preserve its state
    if (existingTimer && existingTimer.isRunning) {
      return;
    }
    
    globalTimers.set(taskId, {
      ...initialData,
      taskId,
      startTime: now,
      timeSpent: initialData.timeSpent || 0,
      lastNotificationTime: undefined,
      isRunning: true
    });
  }, []);

  const stopTimer = useCallback((taskId: string) => {
    const timer = globalTimers.get(taskId);
    if (timer && timer.isRunning) {
      const now = Date.now();
      const updatedTimer = {
        ...timer,
        timeSpent: timer.timeSpent + (now - timer.startTime),
        startTime: now,
        isRunning: false
      };
      globalTimers.set(taskId, updatedTimer);
      return updatedTimer.timeSpent;
    }
    return timer?.timeSpent || 0;
  }, []);

  const resetTimer = useCallback((taskId: string) => {
    const existingTimer = globalTimers.get(taskId);
    if (!existingTimer) return;

    // Stop the current timer first
    const currentTimeSpent = stopTimer(taskId);

    // Create a new timer with reset values but keep the configuration
    const now = Date.now();
    globalTimers.set(taskId, {
      ...existingTimer,
      startTime: now,
      timeSpent: 0,
      lastNotificationTime: undefined,
      isRunning: false
    });
    
    return currentTimeSpent;
  }, [stopTimer]);

  const getCurrentTime = useCallback((taskId: string) => {
    const timer = globalTimers.get(taskId);
    if (!timer) return 0;
    if (!timer.isRunning) return timer.timeSpent;
    const now = Date.now();
    return timer.timeSpent + (now - timer.startTime);
  }, []);

  const isTimerRunning = useCallback((taskId: string) => {
    const timer = globalTimers.get(taskId);
    return timer?.isRunning || false;
  }, []);

  return (
    <TaskTimerContext.Provider
      value={{
        startTimer,
        stopTimer,
        resetTimer,
        getCurrentTime,
        isTimerRunning,
      }}
    >
      {children}
    </TaskTimerContext.Provider>
  );
}

export function useTaskTimer() {
  const context = useContext(TaskTimerContext);
  if (context === undefined) {
    throw new Error('useTaskTimer must be used within a TaskTimerProvider');
  }
  return context;
} 