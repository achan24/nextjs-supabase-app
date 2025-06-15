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
}

const ActiveSequenceContext = createContext<ActiveSequenceContextType | undefined>(undefined);

export function ActiveSequenceProvider({ children }: { children: React.ReactNode }) {
  const [activeSequence, setActiveSequence] = useState<TimerSequence | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Timer logic
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
    setIsRunning(false);
  };

  // Add effect to sync state when active sequence changes
  useEffect(() => {
    if (!activeSequence) {
      setCurrentTaskIndex(-1);
      setTimeSpent(0);
      setIsRunning(false);
    }
  }, [activeSequence]);

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