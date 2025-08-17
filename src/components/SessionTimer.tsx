'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Play, Pause, Square, RotateCcw, Zap, Target, AlertCircle, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
 

interface SessionTimerProps {
  taskId: string;
  taskTitle: string;
  taskStatus?: 'todo' | 'completed';
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
  type: 'distraction' | 'method_switch' | 'urge_overcome' | 'approach_change';
  timestamp: Date;
  description?: string;
}

export default function SessionTimer({ taskId, taskTitle, taskStatus = 'todo', onSessionComplete }: SessionTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [isClient, setIsClient] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [events, setEvents] = useState<MicroEvent[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();
  const [recentTraitGain, setRecentTraitGain] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [urgeLevel, setUrgeLevel] = useState<'none' | 'low' | 'medium' | 'high'>('none');
  const [startTiming, setStartTiming] = useState<'early' | 'on_time' | 'delayed'>('on_time');
  const [prompted, setPrompted] = useState<'no' | 'yes'>('no');
  const [switchUnblocked, setSwitchUnblocked] = useState<'no' | 'yes'>('no');
  const [returnGap, setReturnGap] = useState<'0' | '1-2' | '3-6' | '7+'>('0');

  // Set client-side rendering flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check for active session and completed sessions on mount
  useEffect(() => {
    const checkSessions = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        // Check for active session for this task
        const { data: activeSessions, error: activeError } = await supabase
          .from('trait_sessions')
          .select('*')
          .eq('task_id', taskId)
          .eq('user_id', user.user.id)
          .is('t_end', null)
          .order('t_start', { ascending: false })
          .limit(1);

        if (activeError) {
          console.error('Error checking for active session:', activeError);
          return;
        }

        if (activeSessions && activeSessions.length > 0) {
          const session = activeSessions[0];
          const startTime = new Date(session.t_start);
          const now = new Date();
          const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          
          // Resume the session
          setActiveSessionId(session.id);
          setSessionStartTime(startTime);
          setElapsedTime(elapsedSeconds);
          setEvents(session.events || []);
          setIsRunning(!session.paused_at);
          setIsPaused(!!session.paused_at);
        } else {
          // Check for completed sessions for this task
          const { data: completedSessions, error: completedError } = await supabase
            .from('trait_sessions')
            .select('*')
            .eq('task_id', taskId)
            .eq('user_id', user.user.id)
            .not('t_end', 'is', null)
            .order('t_end', { ascending: false })
            .limit(1);

          if (completedError) {
            console.error('Error checking for completed sessions:', completedError);
            return;
          }

          if (completedSessions && completedSessions.length > 0) {
            const session = completedSessions[0];
            const durationMinutes = session.duration_min || 0;
            
            // Show completed session time
            setElapsedTime(durationMinutes * 60);
            setIsRunning(false);
            setIsPaused(false);
          }
        }
      } catch (error) {
        console.error('Error checking sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSessions();
  }, [taskId, supabase]);

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

  // Watch for task status changes and stop active sessions if task is completed
  useEffect(() => {
    if (taskStatus === 'completed' && activeSessionId && isRunning) {
      console.log('[SessionTimer] Task completed, stopping active session automatically');
      
      // Stop the timer immediately
      setIsRunning(false);
      setIsPaused(false);
      
      // Update the database to end the session
      const endSession = async () => {
        const endTime = new Date();
        const duration = Math.floor(elapsedTime / 60); // Convert to minutes

        try {
          const { error } = await supabase
            .from('trait_sessions')
            .update({
              t_end: endTime.toISOString(),
              duration_min: duration,
              paused_at: null
            })
            .eq('id', activeSessionId);

          if (error) {
            console.error('Error auto-stopping session on task completion:', error);
          } else {
            console.log('[SessionTimer] Session auto-stopped on task completion');
            toast.success('Session saved - task completed!');
          }
        } catch (error) {
          console.error('Error auto-stopping session on task completion:', error);
        }
      };
      
      endSession();
    }
  }, [taskStatus, activeSessionId, isRunning, elapsedTime, supabase]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    const now = new Date();
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Save session start to database immediately
      const { data: session, error } = await supabase
        .from('trait_sessions')
        .insert({
          task_id: taskId,
          user_id: user.user.id,
          t_start: now.toISOString(),
          events: [],
          paused_at: null
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting session:', error);
        return;
      }

      // Set local state
      setActiveSessionId(session.id);
      setSessionStartTime(now);
      setIsRunning(true);
      setIsPaused(false);
      setElapsedTime(0);
      setEvents([]);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const pauseSession = async () => {
    if (!activeSessionId) return;
    
    try {
      const { error } = await supabase
        .from('trait_sessions')
        .update({ paused_at: new Date().toISOString() })
        .eq('id', activeSessionId);

      if (error) {
        console.error('Error pausing session:', error);
        return;
      }

      setIsPaused(true);
      setIsRunning(false); // Stop the timer when paused
    } catch (error) {
      console.error('Error pausing session:', error);
    }
  };

  const resumeSession = async () => {
    if (!activeSessionId) return;
    
    try {
      const { error } = await supabase
        .from('trait_sessions')
        .update({ paused_at: null })
        .eq('id', activeSessionId);

      if (error) {
        console.error('Error resuming session:', error);
        return;
      }

      setIsPaused(false);
      setIsRunning(true); // Resume the timer when unpaused
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  };

  const stopSession = async () => {
    if (!sessionStartTime || !activeSessionId) return;

    const endTime = new Date();
    const duration = Math.floor(elapsedTime / 60); // Convert to minutes

    const sessionData: SessionData = {
      taskId,
      startTime: sessionStartTime,
      endTime,
      duration,
      events
    };

    // Update existing session in database with end time
    try {
      const { error } = await supabase
        .from('trait_sessions')
        .update({
          t_end: endTime.toISOString(),
          duration_min: duration,
          events: events,
          paused_at: null
        })
        .eq('id', activeSessionId);

      if (error) {
        console.error('Error stopping session:', error);
      }
    } catch (error) {
      console.error('Error stopping session:', error);
    }

    // Do not award XP/tokens on stop; only on task completion
    toast.success('Session saved');
    setRecentTraitGain('Saved');

    // Reset state
    setIsRunning(false);
    setIsPaused(false);
    setElapsedTime(0);
    setSessionStartTime(null);
    setEvents([]);
    // keep a reference to update self-report
    setLastSessionId(activeSessionId);
    setActiveSessionId(null);

    // Notify parent component
    onSessionComplete?.(sessionData);

    // Open post-session reflection modal
    setShowPostModal(true);
  };

  const resetSession = () => {
    setIsRunning(false);
    setIsPaused(false);
    setElapsedTime(0);
    setSessionStartTime(null);
    setEvents([]);
  };

  const addEvent = async (type: MicroEvent['type'], description?: string) => {
    const newEvent: MicroEvent = {
      type,
      timestamp: new Date(),
      description
    };
    
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);

    // Save events to database immediately
    if (activeSessionId) {
      try {
        const { error } = await supabase
          .from('trait_sessions')
          .update({ events: updatedEvents })
          .eq('id', activeSessionId);

        if (error) {
          console.error('Error saving event:', error);
        }
      } catch (error) {
        console.error('Error saving event:', error);
      }
    }
  };

  const getEventIcon = (type: MicroEvent['type']) => {
    switch (type) {
      case 'distraction': return <AlertCircle className="w-3 h-3" />;
      case 'method_switch': return <Zap className="w-3 h-3" />;
      case 'urge_overcome': return <Target className="w-3 h-3" />;
      case 'approach_change': return <RotateCcw className="w-3 h-3" />;
      default: return null;
    }
  };

  const getEventLabel = (type: MicroEvent['type']) => {
    switch (type) {
      case 'distraction': return 'Distraction';
      case 'method_switch': return 'Method Switch';
      case 'urge_overcome': return 'Urge Overcome';
      case 'approach_change': return 'Approach Change';
      default: return type;
    }
  };

    // Show loading state on server, wait for client hydration
  if (!isClient) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Timer className="w-3 h-3 text-gray-300" />
          <span className="font-mono text-gray-300 min-w-[50px]">--:--</span>
        </div>
      </div>
    );
  }

  // Don't show anything until database check is complete
  if (isLoading) {
    return null;
  }

  return (
    <>
    <div className="flex items-center gap-2 text-xs">
      {/* Timer Display */}
      <div className="flex items-center gap-1">
        <Timer className="w-3 h-3 text-gray-500" />
        <span className="font-mono text-gray-600 min-w-[50px]">
          {formatTime(elapsedTime)}
        </span>
      </div>

      {/* Timer Controls */}
      {!isRunning ? (
        // Don't show start button for completed tasks
        taskStatus === 'completed' ? null : (
          <Button
            size="sm"
            variant="outline"
            onClick={startSession}
            className="h-6 px-2 text-xs"
            title="Start work session"
          >
            <Play className="w-3 h-3 mr-1" />
            Start
          </Button>
        )
      ) : (
        <div className="flex gap-1">
          {isPaused ? (
            <Button
              size="sm"
              variant="outline"
              onClick={resumeSession}
              className="h-6 px-2 text-xs"
              title="Resume session"
            >
              <Play className="w-3 h-3" />
            </Button>
          ) : (
                      <Button
            size="sm"
            variant="outline"
            onClick={pauseSession}
            className="h-6 px-2 text-xs"
            title="Pause session"
          >
            <Pause className="w-3 h-3" />
          </Button>
        )}
          <Button
            size="sm"
            variant="outline"
            onClick={stopSession}
            className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
            title="Complete session"
          >
            Complete
          </Button>
        </div>
      )}

      {/* Event count indicator when session is running */}
      {isRunning && events.length > 0 && (
        <span className="text-xs text-gray-500">
          {events.length} events
        </span>
      )}

      {/* Quick event buttons (only show when running and space allows) */}
      {isRunning && (
        <div className="hidden md:flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addEvent('distraction')}
            className="h-5 w-5 p-0"
            title="Log distraction - I got distracted by something"
          >
            <AlertCircle className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addEvent('urge_overcome')}
            className="h-5 w-5 p-0"
            title="Log urge overcome - I resisted the urge to procrastinate or quit"
          >
            <Target className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addEvent('approach_change')}
            className="h-5 w-5 p-0"
            title="Log approach change - I switched methods or adapted my approach"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Session summary when stopped or completed */}
      {!isRunning && elapsedTime > 0 && (
        <span className="text-xs text-green-600 flex items-center gap-2">
          ✓ {Math.floor(elapsedTime / 60)}min session
          {recentTraitGain && (
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5">
              {recentTraitGain}
            </span>
          )}
        </span>
      )}

      {/* Completed task indicator */}
      {taskStatus === 'completed' && elapsedTime === 0 && (
        <span className="text-xs text-gray-500 flex items-center gap-2">
          ✓ Completed
        </span>
      )}
    </div>
    {/* Post-session modal */}
    <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Quick reflection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <div className="text-gray-700">When did you act relative to your plan?</div>
            <Select value={startTiming} onValueChange={(v: any) => setStartTiming(v)}>
              <SelectTrigger className="h-8 w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="early">Early</SelectItem>
                <SelectItem value="on_time">On time</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="text-gray-700">Urge to quit during this session?</div>
            <Select value={urgeLevel} onValueChange={(v: any) => setUrgeLevel(v)}>
              <SelectTrigger className="h-8 w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-gray-700">Did switching approach unblock progress?</div>
            <div className="flex gap-2">
              <Button size="sm" variant={switchUnblocked==='yes'?'default':'outline'} onClick={() => setSwitchUnblocked('yes')}>Yes</Button>
              <Button size="sm" variant={switchUnblocked==='no'?'default':'outline'} onClick={() => setSwitchUnblocked('no')}>No</Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-gray-700">Return after a gap?</div>
            <Select value={returnGap} onValueChange={(v: any) => setReturnGap(v)}>
              <SelectTrigger className="h-8 w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No gap</SelectItem>
                <SelectItem value="1-2">1–2 days</SelectItem>
                <SelectItem value="3-6">3–6 days</SelectItem>
                <SelectItem value="7+">7+ days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-gray-700">Did you need to be prompted?</div>
            <div className="flex gap-2">
              <Button size="sm" variant={prompted==='no'?'default':'outline'} onClick={() => setPrompted('no')}>No</Button>
              <Button size="sm" variant={prompted==='yes'?'default':'outline'} onClick={() => setPrompted('yes')}>Yes</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            size="sm"
            onClick={async () => {
              try {
                if (!lastSessionId) { setShowPostModal(false); return; }
                const gapNum = returnGap === '7+' ? 7 : returnGap === '3-6' ? 3 : returnGap === '1-2' ? 1 : 0;
                const { error } = await supabase
                  .from('trait_sessions')
                  .update({ self_report: {
                    urgeLevel,
                    switchUnblocked: switchUnblocked === 'yes',
                    returnGapDays: gapNum,
                    startTiming,
                    prompted: prompted === 'yes'
                  }})
                  .eq('id', lastSessionId);
                if (error) throw error;
                toast.success('Reflection saved');
              } catch (e) {
                console.error('[SessionTimer] save reflection', e);
                toast.error('Failed to save reflection');
              } finally {
                setShowPostModal(false);
              }
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
