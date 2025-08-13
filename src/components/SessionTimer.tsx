'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, RotateCcw, Coffee, Zap, Target, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

interface SessionTimerProps {
  taskId: string;
  taskTitle: string;
  onSessionComplete?: (sessionData: SessionData) => void;
}

interface SessionData {
  taskId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  events: MicroEvent[];
}

interface MicroEvent {
  type: 'break' | 'distraction' | 'method_switch' | 'urge_overcome' | 'location_switch';
  timestamp: Date;
  description?: string;
}

export default function SessionTimer({ taskId, taskTitle, onSessionComplete }: SessionTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [events, setEvents] = useState<MicroEvent[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = () => {
    const now = new Date();
    setSessionStartTime(now);
    setIsRunning(true);
    setIsPaused(false);
    setElapsedTime(0);
    setEvents([]);
  };

  const pauseSession = () => {
    setIsPaused(true);
  };

  const resumeSession = () => {
    setIsPaused(false);
  };

  const stopSession = async () => {
    if (!sessionStartTime) return;

    const endTime = new Date();
    const duration = Math.floor(elapsedTime / 60); // Convert to minutes

    const sessionData: SessionData = {
      taskId,
      startTime: sessionStartTime,
      endTime,
      duration,
      events
    };

    // Save session to database
    try {
      const { error } = await supabase
        .from('trait_sessions')
        .insert({
          task_id: taskId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          start_time: sessionStartTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: duration,
          events: events
        });

      if (error) {
        console.error('Error saving session:', error);
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }

    // Reset state
    setIsRunning(false);
    setIsPaused(false);
    setElapsedTime(0);
    setSessionStartTime(null);
    setEvents([]);

    // Notify parent component
    onSessionComplete?.(sessionData);
  };

  const resetSession = () => {
    setIsRunning(false);
    setIsPaused(false);
    setElapsedTime(0);
    setSessionStartTime(null);
    setEvents([]);
  };

  const addEvent = (type: MicroEvent['type'], description?: string) => {
    const newEvent: MicroEvent = {
      type,
      timestamp: new Date(),
      description
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const getEventIcon = (type: MicroEvent['type']) => {
    switch (type) {
      case 'break': return <Coffee className="w-3 h-3" />;
      case 'distraction': return <AlertCircle className="w-3 h-3" />;
      case 'method_switch': return <Zap className="w-3 h-3" />;
      case 'urge_overcome': return <Target className="w-3 h-3" />;
      case 'location_switch': return <RotateCcw className="w-3 h-3" />;
      default: return null;
    }
  };

  const getEventLabel = (type: MicroEvent['type']) => {
    switch (type) {
      case 'break': return 'Break';
      case 'distraction': return 'Distraction';
      case 'method_switch': return 'Method Switch';
      case 'urge_overcome': return 'Urge Overcome';
      case 'location_switch': return 'Location Switch';
      default: return type;
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Session Timer</h4>
        <span className="text-lg font-mono font-bold text-blue-600">
          {formatTime(elapsedTime)}
        </span>
      </div>

      {/* Timer Controls */}
      <div className="flex gap-2 mb-3">
        {!isRunning ? (
          <Button 
            size="sm" 
            onClick={startSession}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-1" />
            Start Session
          </Button>
        ) : (
          <>
            {isPaused ? (
              <Button 
                size="sm" 
                onClick={resumeSession}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-1" />
                Resume
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                onClick={pauseSession}
                className="flex-1"
              >
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </Button>
            )}
            <Button 
              size="sm" 
              variant="destructive"
              onClick={stopSession}
            >
              <Square className="w-4 h-4 mr-1" />
              End
            </Button>
          </>
        )}
        {!isRunning && elapsedTime > 0 && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={resetSession}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Micro-events (only show when session is running) */}
      {isRunning && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Quick Events:</p>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => addEvent('break')}
              className="text-xs"
            >
              <Coffee className="w-3 h-3 mr-1" />
              Break
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addEvent('distraction')}
              className="text-xs"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              Distraction
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addEvent('method_switch')}
              className="text-xs"
            >
              <Zap className="w-3 h-3 mr-1" />
              Method Switch
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addEvent('urge_overcome')}
              className="text-xs"
            >
              <Target className="w-3 h-3 mr-1" />
              Urge Overcome
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addEvent('location_switch')}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Location
            </Button>
          </div>
        </div>
      )}

      {/* Events List */}
      {events.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-medium text-gray-600 mb-2">Session Events:</p>
          <div className="space-y-1">
            {events.map((event, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {getEventIcon(event.type)}
                <span className="text-gray-700">{getEventLabel(event.type)}</span>
                <span className="text-gray-500">
                  {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Summary (when stopped) */}
      {!isRunning && elapsedTime > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-medium text-gray-600">Session Summary:</p>
          <div className="text-xs text-gray-700 mt-1">
            <p>Duration: {Math.floor(elapsedTime / 60)} minutes</p>
            <p>Events: {events.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
