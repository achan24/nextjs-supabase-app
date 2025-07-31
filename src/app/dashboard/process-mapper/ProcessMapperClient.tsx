'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Play, Pause, Square, Plus, Clock, CheckCircle, AlertCircle, Timer, List, Eye, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ProcessMapperStep {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime?: Date
  duration?: number
  orderIndex: number
  notes?: string
  isActive?: boolean
  timelineNotes?: Array<{
    id: string
    timestamp: Date
    note: string
    instanceVersion?: number // Track which replay instance this note was added in
  }>
}

interface ProcessMapperSession {
  id: string
  name: string
  description?: string
  startTime: Date
  endTime?: Date
  status: 'active' | 'paused' | 'completed'
  steps: ProcessMapperStep[]
  replayInstances?: Array<{
    id: string
    instanceNumber: number
    startTime: Date
    endTime?: Date
    notes: Array<{
      id: string
      stepId: string
      timestamp: Date
      note: string
      instanceVersion: number
    }>
  }>
}

export default function ProcessMapperClient() {
  const [session, setSession] = useState<ProcessMapperSession | null>(null)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [currentStepNotes, setCurrentStepNotes] = useState<string>('')
  const [sessionName, setSessionName] = useState<string>('')
  const [sessionDescription, setSessionDescription] = useState<string>('')
  const [sessionTimer, setSessionTimer] = useState<number>(0)
  const [stepTimers, setStepTimers] = useState<Record<string, number>>({})
  const [stepNoteInputs, setStepNoteInputs] = useState<Record<string, string>>({})
  const [sessions, setSessions] = useState<ProcessMapperSession[]>([])
  const [view, setView] = useState<'home' | 'active' | 'replay'>('home')
  const [replaySession, setReplaySession] = useState<ProcessMapperSession | null>(null)
  const [replayTime, setReplayTime] = useState<number>(0)
  const [isReplaying, setIsReplaying] = useState<boolean>(false)
  const [currentReplayInstance, setCurrentReplayInstance] = useState<number>(1)
  const [replayNoteInputs, setReplayNoteInputs] = useState<Record<string, string>>({})
  const [timelineWidth, setTimelineWidth] = useState<number>(800)
  const supabase = createClient()

  // Load sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('processMapperSessions')
    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions).map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: s.endTime ? new Date(s.endTime) : undefined,
        steps: s.steps.map((step: any) => ({
          ...step,
          startTime: new Date(step.startTime),
          endTime: step.endTime ? new Date(step.endTime) : undefined,
          timelineNotes: step.timelineNotes?.map((note: any) => ({
            ...note,
            timestamp: new Date(note.timestamp)
          })) || []
        })),
        replayInstances: s.replayInstances?.map((instance: any) => ({
          ...instance,
          startTime: new Date(instance.startTime),
          endTime: instance.endTime ? new Date(instance.endTime) : undefined,
          notes: instance.notes?.map((note: any) => ({
            ...note,
            timestamp: new Date(note.timestamp)
          })) || []
        })) || []
      }))
      setSessions(parsedSessions)
    }
  }, [])

  // Save sessions to localStorage
  const saveSessions = (newSessions: ProcessMapperSession[]) => {
    localStorage.setItem('processMapperSessions', JSON.stringify(newSessions))
    setSessions(newSessions)
  }

  // Session timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (session && session.status === 'active') {
      interval = setInterval(() => {
        setSessionTimer(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [session?.status])

  // Step timers effect
  useEffect(() => {
    const intervals: Record<string, NodeJS.Timeout> = {}
    
    if (session) {
      session.steps.forEach(step => {
        if (step.isActive && session.status === 'active') {
          intervals[step.id] = setInterval(() => {
            setStepTimers(prev => ({
              ...prev,
              [step.id]: (prev[step.id] || 0) + 1
            }))
          }, 1000)
        }
      })
    }

    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval))
    }
  }, [session?.steps, session?.status])

  const startNewSession = () => {
    if (!sessionName.trim()) {
      toast.error('Please enter a session name')
      return
    }

    const newSession: ProcessMapperSession = {
      id: `temp-${Date.now()}`,
      name: sessionName,
      description: sessionDescription,
      startTime: new Date(),
      status: 'active',
      steps: []
    }

    setSession(newSession)
    setSessionTimer(0)
    setStepTimers({})
    setSessionName('')
    setSessionDescription('')
    setView('active')
    toast.success('Session started!')
  }

  const addStep = () => {
    if (!currentStep.trim()) {
      toast.error('Please enter a step title')
      return
    }

    if (!session) {
      toast.error('No active session')
      return
    }

    const newStep: ProcessMapperStep = {
      id: `step-${Date.now()}`,
      title: currentStep,
      description: currentStepNotes,
      startTime: new Date(),
      orderIndex: session.steps.length,
      notes: currentStepNotes,
      isActive: true
    }

    const updatedSession = {
      ...session,
      steps: [...session.steps, newStep]
    }

    setSession(updatedSession)
    setStepTimers(prev => ({ ...prev, [newStep.id]: 0 }))
    setCurrentStep('')
    setCurrentStepNotes('')
    toast.success('Step added!')
  }

  const startStepTimer = (stepId: string) => {
    if (!session) return

    const updatedSteps = session.steps.map(step => ({
      ...step,
      isActive: step.id === stepId ? true : false
    }))

    setSession({
      ...session,
      steps: updatedSteps
    })

    setStepTimers(prev => ({ ...prev, [stepId]: 0 }))
  }

  const stopStepTimer = (stepId: string) => {
    if (!session) return

    const updatedSteps = session.steps.map(step => {
      if (step.id === stepId && step.isActive) {
        return {
          ...step,
          isActive: false,
          endTime: new Date(),
          duration: stepTimers[stepId] * 1000 // Convert seconds to milliseconds
        }
      }
      return step
    })

    setSession({
      ...session,
      steps: updatedSteps
    })
  }

  const pauseSession = () => {
    if (!session) return
    setSession({ ...session, status: 'paused' })
    toast.info('Session paused')
  }

  const resumeSession = () => {
    if (!session) return
    setSession({ ...session, status: 'active' })
    toast.info('Session resumed')
  }

  const addStepNote = (stepId: string) => {
    const noteText = stepNoteInputs[stepId]
    if (!noteText?.trim() || !session) return

    const updatedSteps = session.steps.map(step => {
      if (step.id === stepId) {
        const newNote = {
          id: `note-${Date.now()}`,
          timestamp: new Date(),
          note: noteText.trim()
        }
        return {
          ...step,
          timelineNotes: [...(step.timelineNotes || []), newNote]
        }
      }
      return step
    })

    setSession({
      ...session,
      steps: updatedSteps
    })

    // Clear the input
    setStepNoteInputs(prev => ({ ...prev, [stepId]: '' }))
    toast.success('Note added!')
  }

  const endSession = () => {
    if (!session) return
    const completedSession: ProcessMapperSession = { ...session, status: 'completed', endTime: new Date() }
    setSession(completedSession)
    
    // Save to localStorage
    const updatedSessions = [...sessions, completedSession]
    saveSessions(updatedSessions)
    
    toast.success('Session completed and saved!')
  }

  const startReplay = (sessionToReplay: ProcessMapperSession) => {
    setReplaySession(sessionToReplay)
    setReplayTime(0)
    setIsReplaying(true)
    setCurrentReplayInstance(1)
    setReplayNoteInputs({})
    setView('replay')
  }

  const stopReplay = () => {
    setIsReplaying(false)
    setReplayTime(0)
    setView('home')
  }

  // Replay timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isReplaying && replaySession) {
      interval = setInterval(() => {
        setReplayTime(prev => {
          const newTime = prev + 1
          // Stop replay when we reach the end
          if (newTime >= getSessionDuration(replaySession)) {
            setIsReplaying(false)
            return prev
          }
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isReplaying, replaySession])

  const getSessionDuration = (session: ProcessMapperSession) => {
    const endTime = session.endTime || new Date()
    return Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000)
  }

  const getStepProgress = (step: ProcessMapperStep, session: ProcessMapperSession) => {
    const stepStartTime = Math.floor((step.startTime.getTime() - session.startTime.getTime()) / 1000)
    const stepEndTime = step.endTime ? 
      Math.floor((step.endTime.getTime() - session.startTime.getTime()) / 1000) :
      stepStartTime + (step.duration ? Math.floor(step.duration / 1000) : 0)
    
    return {
      startTime: stepStartTime,
      endTime: stepEndTime,
      isActive: replayTime >= stepStartTime && replayTime <= stepEndTime,
      isCompleted: replayTime > stepEndTime
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Start a new replay instance
  const startNewReplayInstance = () => {
    if (!replaySession) return

    const newInstanceNumber = (replaySession.replayInstances?.length || 0) + 1
    const newInstance = {
      id: `instance-${Date.now()}`,
      instanceNumber: newInstanceNumber,
      startTime: new Date(),
      notes: []
    }

    const updatedSession = {
      ...replaySession,
      replayInstances: [...(replaySession.replayInstances || []), newInstance]
    }

    setReplaySession(updatedSession)
    setCurrentReplayInstance(newInstanceNumber)
    setReplayTime(0)
    setIsReplaying(true)

    // Update sessions list
    const updatedSessions = sessions.map(s => 
      s.id === replaySession.id ? updatedSession : s
    )
    saveSessions(updatedSessions)
  }

  // Add note during replay
  const addReplayNote = (stepId: string) => {
    const noteText = replayNoteInputs[stepId]
    if (!noteText?.trim() || !replaySession) return

    const newNote = {
      id: `note-${Date.now()}`,
      stepId,
      timestamp: new Date(),
      note: noteText.trim(),
      instanceVersion: currentReplayInstance
    }

    const updatedSession = {
      ...replaySession,
      replayInstances: replaySession.replayInstances?.map(instance =>
        instance.instanceNumber === currentReplayInstance
          ? { ...instance, notes: [...instance.notes, newNote] }
          : instance
      ) || []
    }

    setReplaySession(updatedSession)
    setReplayNoteInputs(prev => ({ ...prev, [stepId]: '' }))

    // Update sessions list
    const updatedSessions = sessions.map(s => 
      s.id === replaySession.id ? updatedSession : s
    )
    saveSessions(updatedSessions)

    toast.success('Note added to replay instance!')
  }

  // Get all notes for a step across all instances
  const getAllStepNotes = (stepId: string) => {
    if (!replaySession) return []
    
    const allNotes: Array<{
      id: string
      timestamp: Date
      note: string
      instanceVersion: number
    }> = []

    // Original session notes
    const step = replaySession.steps.find(s => s.id === stepId)
    if (step?.timelineNotes) {
      allNotes.push(...step.timelineNotes.map(note => ({
        ...note,
        instanceVersion: 0 // Original session
      })))
    }

    // Replay instance notes
    replaySession.replayInstances?.forEach(instance => {
      const instanceNotes = instance.notes.filter(note => note.stepId === stepId)
      allNotes.push(...instanceNotes)
    })

    return allNotes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  // Calculate timeline position
  const getTimelinePosition = (timestamp: Date, sessionStartTime: Date) => {
    const timeDiff = timestamp.getTime() - sessionStartTime.getTime()
    const sessionDuration = getSessionDuration(replaySession!)
    return (timeDiff / 1000 / sessionDuration) * 100
  }

  // Get current timeline position
  const getCurrentTimelinePosition = () => {
    if (!replaySession) return 0
    const sessionDuration = getSessionDuration(replaySession)
    return (replayTime / sessionDuration) * 100
  }

  if (view === 'home') {
    return (
      <div className="space-y-6">
        {/* Sessions List */}
        {sessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Previous Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.map((savedSession) => (
                  <div
                    key={savedSession.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <h4 className="font-medium">{savedSession.name}</h4>
                      {savedSession.description && (
                        <p className="text-sm text-gray-600">{savedSession.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{savedSession.startTime.toLocaleDateString()}</span>
                        <span>{formatDuration(getSessionDuration(savedSession))}</span>
                        <span>{savedSession.steps.length} steps</span>
                        {savedSession.replayInstances && savedSession.replayInstances.length > 0 && (
                          <span className="text-blue-600">
                            {savedSession.replayInstances.length} replay instances
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startReplay(savedSession)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Replay
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start New Session */}
        <Card>
          <CardHeader>
            <CardTitle>Start New Process Mapping Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Name *
              </label>
              <Input
                placeholder="e.g., Morning Email Routine, Bug Fix Process"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <Textarea
                placeholder="Describe what you'll be working on..."
                value={sessionDescription}
                onChange={(e) => setSessionDescription(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={startNewSession} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === 'replay' && replaySession) {
    return (
      <div className="space-y-6">
        {/* Replay Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeft 
                    className="h-5 w-5 cursor-pointer" 
                    onClick={() => setView('home')}
                  />
                  Replay: {replaySession.name}
                </CardTitle>
                {replaySession.description && (
                  <p className="text-sm text-gray-600 mt-1">{replaySession.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-sm text-gray-600">
                    Instance: {currentReplayInstance}
                    {replaySession.replayInstances && replaySession.replayInstances.length > 0 && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {replaySession.replayInstances.length} total instances
                      </span>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={startNewReplayInstance}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Instance
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-lg font-semibold">
                    {formatDuration(replayTime)}
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="font-mono">
                    {formatDuration(getSessionDuration(replaySession))}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {Math.round((replayTime / getSessionDuration(replaySession)) * 100)}%
                  </span>
                </div>
                <div className="flex gap-2">
                  {isReplaying ? (
                    <Button variant="outline" onClick={() => setIsReplaying(false)}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setIsReplaying(true)}>
                      <Play className="h-4 w-4 mr-2" />
                      Play
                    </Button>
                  )}
                  <Button variant="outline" onClick={stopReplay}>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Single Unified Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Session Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              {/* Timeline axis */}
              <div className="w-full h-2 bg-gray-300 border-t border-dashed border-gray-400 relative">
                {replaySession.steps.map((step, idx) => {
                  const sessionDuration = getSessionDuration(replaySession)
                  const stepStart = Math.floor((step.startTime.getTime() - replaySession.startTime.getTime()) / 1000)
                  const stepEnd = step.endTime ? Math.floor((step.endTime.getTime() - replaySession.startTime.getTime()) / 1000) : stepStart + (step.duration ? Math.floor(step.duration / 1000) : 0)
                  const left = (stepStart / sessionDuration) * 100
                  const width = ((stepEnd - stepStart) / sessionDuration) * 100
                  const colors = [
                    'bg-blue-400',
                    'bg-green-400',
                    'bg-yellow-400',
                    'bg-pink-400',
                    'bg-purple-400',
                    'bg-teal-400',
                  ]
                  const color = colors[idx % colors.length]
                  return (
                    <div
                      key={step.id}
                      className={`group absolute top-0 h-full ${color} rounded cursor-pointer`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      {/* Step hover popup */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-gray-800 shadow-lg"
                           style={{ backgroundColor: '#111' }}>
                        <div className="font-medium">{step.title}</div>
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent" style={{ borderBottomColor: '#111' }}></div>
                      </div>
                    </div>
                  )
                })}
                {/* Current time indicator */}
                {isReplaying && (
                  <>
                    {/* Blue dot */}
                    <div
                      className="absolute top-0 w-2 h-2 bg-blue-500 rounded-full border-2 border-white shadow-sm"
                      style={{
                        left: `${getCurrentTimelinePosition()}%`,
                        transform: 'translateX(-50%) translateY(-3px)'
                      }}
                    />
                    {/* Time label above the blue dot */}
                    <div
                      className="absolute -top-6 bg-blue-500 text-white text-xs px-2 py-0.5 rounded font-mono font-semibold z-30"
                      style={{
                        left: `${getCurrentTimelinePosition()}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {replayTime < 60 ? `${replayTime}s` : formatDuration(replayTime)}
                    </div>
                  </>
                )}

                {/* All note points from all steps */}
                {replaySession.steps.flatMap((step, stepIndex) => {
                  const allNotes = getAllStepNotes(step.id)
                  return allNotes.map((note, noteIndex) => {
                    const notePosition = getTimelinePosition(note.timestamp, replaySession.startTime)
                    const noteTime = Math.floor((note.timestamp.getTime() - replaySession.startTime.getTime()) / 1000)
                    const isVisible = replayTime >= noteTime
                    
                    return (
                      <div
                        key={note.id}
                        className={`group absolute top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm cursor-pointer transition-all ${
                          note.instanceVersion === 0 ? 'bg-yellow-400' : 'bg-purple-400'
                        } ${isVisible ? 'opacity-100' : 'opacity-50'}`}
                        style={{ 
                          left: `${notePosition}%`,
                          transform: 'translateX(-50%) translateY(-5px)'
                        }}
                      >
                        {/* Hover popup */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-gray-800 shadow-lg"
                             style={{ backgroundColor: '#111' }}>
                          <div className="font-medium mb-1">
                            Step {stepIndex + 1}: {step.title}
                          </div>
                          <div className="text-gray-200">{note.note}</div>
                          <div className="text-gray-400 text-xs mt-1">
                            {formatDuration(noteTime)} • {note.instanceVersion === 0 ? 'Original' : `Instance ${note.instanceVersion}`}
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent" style={{ borderTopColor: '#111' }}></div>
                        </div>
                      </div>
                    )
                  })
                })}
              </div>
              
              {/* Time markers */}
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>0s</span>
                <span>{formatDuration(getSessionDuration(replaySession))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps List */}
        <Card>
          <CardHeader>
            <CardTitle>Process Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {replaySession.steps.map((step, index) => {
                const progress = getStepProgress(step, replaySession)
                const allNotes = getAllStepNotes(step.id)
                
                return (
                  <div
                    key={step.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      progress.isActive ? 'bg-blue-50 border-blue-200' :
                      progress.isCompleted ? 'bg-green-50 border-green-200' :
                      'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                        progress.isActive ? 'bg-blue-100 text-blue-600' :
                        progress.isCompleted ? 'bg-green-100 text-green-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{step.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>Start: {formatDuration(progress.startTime)}</span>
                          <span>Duration: {formatDuration(progress.endTime - progress.startTime)}</span>
                          <span>{allNotes.length} total notes</span>
                        </div>
                      </div>
                    </div>

                    {/* Add Note Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a note for this step..."
                        value={replayNoteInputs[step.id] || ''}
                        onChange={(e) => setReplayNoteInputs(prev => ({ 
                          ...prev, 
                          [step.id]: e.target.value 
                        }))}
                        className="flex-1"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => addReplayNote(step.id)}
                        disabled={!replayNoteInputs[step.id]?.trim()}
                      >
                        Add Note
                      </Button>
                    </div>

                    {/* All Notes List */}
                    {allNotes.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">All Notes:</h5>
                        {allNotes.map((note) => (
                          <div key={note.id} className="bg-white p-3 rounded border text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs px-2 py-1 rounded ${
                                note.instanceVersion === 0 
                                  ? 'bg-yellow-100 text-yellow-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {note.instanceVersion === 0 ? 'Original' : `Instance ${note.instanceVersion}`}
                              </span>
                              <span className="text-xs text-gray-500">
                                {note.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div>{note.note}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{session.name}</CardTitle>
              {session.description && (
                <p className="text-sm text-gray-600 mt-1">{session.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                {formatDuration(sessionTimer)}
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                session.status === 'active' ? 'bg-green-100 text-green-800' :
                session.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {session.status === 'active' ? 'Active' :
                 session.status === 'paused' ? 'Paused' : 'Completed'}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {session.status === 'active' ? (
              <Button variant="outline" onClick={pauseSession}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : session.status === 'paused' ? (
              <Button variant="outline" onClick={resumeSession}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            ) : null}
            <Button variant="outline" onClick={endSession}>
              <Square className="h-4 w-4 mr-2" />
              End Session
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Step */}
      {session.status !== 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>Add Step</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Step Title *
              </label>
              <Input
                placeholder="e.g., Check urgent emails, Review code changes"
                value={currentStep}
                onChange={(e) => setCurrentStep(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <Textarea
                placeholder="Add any notes or context for this step..."
                value={currentStepNotes}
                onChange={(e) => setCurrentStepNotes(e.target.value)}
                rows={2}
              />
            </div>
            <Button onClick={addStep} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Steps List */}
      <Card>
        <CardHeader>
          <CardTitle>Process Steps ({session.steps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {session.steps.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No steps added yet. Start by adding your first step above.
            </p>
          ) : (
            <div className="space-y-3">
              {session.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="p-3 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-medium text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{step.title}</h4>
                        {step.notes && (
                          <p className="text-sm text-gray-600">{step.notes}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Timer className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {step.duration ? 
                              `Duration: ${formatDuration(Math.floor(step.duration / 1000))}` :
                              step.isActive ? 
                                `Running: ${formatDuration(stepTimers[step.id] || 0)}` :
                                'Not started'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {step.duration ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : step.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => stopStepTimer(step.id)}
                        >
                          Stop
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startStepTimer(step.id)}
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Timeline Notes */}
                  {step.timelineNotes && step.timelineNotes.length > 0 && (
                    <div className="ml-11 space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Timeline Notes:</h5>
                      {step.timelineNotes.map((note) => (
                        <div key={note.id} className="bg-gray-50 p-2 rounded text-sm">
                          <div className="text-xs text-gray-500 mb-1">
                            {note.timestamp.toLocaleTimeString()}
                          </div>
                          <div>{note.note}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Note Input */}
                  {session.status !== 'completed' && (
                    <div className="ml-11 flex gap-2">
                      <Input
                        placeholder="Add a note about this step..."
                        value={stepNoteInputs[step.id] || ''}
                        onChange={(e) => setStepNoteInputs(prev => ({ 
                          ...prev, 
                          [step.id]: e.target.value 
                        }))}
                        className="flex-1"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addStepNote(step.id)
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => addStepNote(step.id)}
                        disabled={!stepNoteInputs[step.id]?.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 