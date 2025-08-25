'use client';

import React, { createContext, useContext, useMemo, useRef, useCallback } from 'react';
import { TimelineEngine } from '@/app/dashboard/action-timeline/types';

interface TimelineEngineContextType {
  engine: TimelineEngine;
  loadFromJSON: (data: any) => void;
  resetEngine: () => void;
}

const TimelineEngineContext = createContext<TimelineEngineContextType | undefined>(undefined);

export function TimelineEngineProvider({ children }: { children: React.ReactNode }) {
  // Persist a single engine instance across the app lifecycle
  const engineRef = useRef<TimelineEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new TimelineEngine();
  }

  const loadFromJSON = useCallback((data: any) => {
    engineRef.current?.fromJSON(data);
  }, []);

  const resetEngine = useCallback(() => {
    engineRef.current?.reset();
  }, []);

  const value = useMemo(() => ({
    engine: engineRef.current as TimelineEngine,
    loadFromJSON,
    resetEngine,
  }), [loadFromJSON, resetEngine]);

  return (
    <TimelineEngineContext.Provider value={value}>
      {children}
    </TimelineEngineContext.Provider>
  );
}

export function useTimelineEngine() {
  const ctx = useContext(TimelineEngineContext);
  if (!ctx) throw new Error('useTimelineEngine must be used within a TimelineEngineProvider');
  return ctx;
}


