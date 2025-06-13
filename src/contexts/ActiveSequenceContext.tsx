'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TimerSequence {
  id: string;
  title: string;
  description: string;
  tasks: any[];
  created_at: string;
  startTime: number | null;
}

interface ActiveSequenceContextType {
  activeSequence: TimerSequence | null;
  currentTaskIndex: number;
  timeSpent: number;
  isRunning: boolean;
  setActiveSequence: (sequence: TimerSequence | null) => void;
  setCurrentTaskIndex: (index: number) => void;
  setTimeSpent: (time: number) => void;
  setIsRunning: (isRunning: boolean) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  completeParallelTask: (taskId: string) => void;
}

const ActiveSequenceContext = createContext<ActiveSequenceContextType | undefined>(undefined);

export function ActiveSequenceProvider({ children }: { children: React.ReactNode }) {
  const [activeSequence, setActiveSequence] = useState<TimerSequence | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completedParallelTasks, setCompletedParallelTasks] = useState<string[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && activeSequence && activeSequence.startTime !== null) {
      const startTime = activeSequence.startTime;
      interval = setInterval(() => {
        setTimeSpent(Date.now() - startTime);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, activeSequence]);

  const getNextTasks = () => {
    if (!activeSequence) return [];
    const tasks = activeSequence.tasks;
    if (currentTaskIndex < 0 || currentTaskIndex >= tasks.length) return [];
    const currentTask = tasks[currentTaskIndex];
    if (currentTask.parallelGroupId) {
      return tasks.filter(t => t.parallelGroupId === currentTask.parallelGroupId);
    } else {
      return [currentTask];
    }
  };

  const startTimer = () => {
    if (activeSequence) {
      setActiveSequence({
        ...activeSequence,
        startTime: Date.now() - timeSpent
      });
      setIsRunning(true);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setTimeSpent(0);
    if (activeSequence) {
      setActiveSequence({
        ...activeSequence,
        startTime: null
      });
    }
    setIsRunning(false);
  };

  const completeParallelTask = (taskId: string) => {
    setCompletedParallelTasks(prev => [...prev, taskId]);
    if (activeSequence) {
      const groupId = activeSequence.tasks.find(t => t.id === taskId)?.parallelGroupId;
      if (groupId) {
        const groupTasks = activeSequence.tasks.filter(t => t.parallelGroupId === groupId);
        const allDone = groupTasks.every(t => completedParallelTasks.includes(t.id) || t.id === taskId);
        if (allDone) {
          const lastIndex = Math.max(...groupTasks.map(t => activeSequence.tasks.findIndex(x => x.id === t.id)));
          setCurrentTaskIndex(lastIndex + 1);
          setCompletedParallelTasks(prev => prev.filter(id => !groupTasks.some(t => t.id === id)));
        }
      } else {
        setCurrentTaskIndex(idx => idx + 1);
      }
    }
  };

  return (
    <ActiveSequenceContext.Provider
      value={{
        activeSequence,
        currentTaskIndex,
        timeSpent,
        isRunning,
        setActiveSequence,
        setCurrentTaskIndex,
        setTimeSpent,
        setIsRunning,
        startTimer,
        pauseTimer,
        resetTimer,
        completeParallelTask,
      }}
    >
      {children}
    </ActiveSequenceContext.Provider>
  );
}

export function useActiveSequence() {
  const context = useContext(ActiveSequenceContext);
  if (context === undefined) {
    throw new Error('useActiveSequence must be used within an ActiveSequenceProvider');
  }
  return context;
} 