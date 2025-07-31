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
  const [autoShownNotes, setAutoShownNotes] = useState<Set<string>>(new Set())
  const [showDetailedNotes, setShowDetailedNotes] = useState<boolean>(false)
  const [removeGaps, setRemoveGaps] = useState<boolean>(false)
  const supabase = createClient()

  // Load sessions from database
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const { data: sessionsData, error } = await supabase
          .from('process_mapper_sessions')
          .select(`
            *,
            process_mapper_steps (
              *,
              process_mapper_timeline_notes (*)
            ),
            process_mapper_replay_instances (*)
          `)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading sessions:', error)
          toast.error('Failed to load sessions')
          return
        }

        const parsedSessions = sessionsData.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          startTime: new Date(s.start_time),
          endTime: s.end_time ? new Date(s.end_time) : undefined,
          status: s.status,
          steps: s.process_mapper_steps?.map((step: any) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            startTime: new Date(step.start_time),
            endTime: step.end_time ? new Date(step.end_time) : undefined,
            duration: step.duration,
            orderIndex: step.order_index,
            notes: step.notes,
            timelineNotes: step.process_mapper_timeline_notes?.map((note: any) => ({
              id: note.id,
              timestamp: new Date(note.timestamp),
              note: note.note,
              instanceVersion: note.instance_version
            })) || []
          })) || [],
          replayInstances: s.process_mapper_replay_instances?.map((instance: any) => ({
            id: instance.id,
            instanceNumber: instance.instance_number,
            startTime: new Date(instance.start_time),
            endTime: instance.end_time ? new Date(instance.end_time) : undefined,
            notes: instance.notes || []
          })) || []
        }))

        setSessions(parsedSessions)
      } catch (error) {
        console.error('Error loading sessions:', error)
        toast.error('Failed to load sessions')
      }
    }

    loadSessions()
  }, [])

  // Save session to database
  const saveSession = async (session: ProcessMapperSession) => {
    try {
      // Get current user session
      const { data: authData, error: authError } = await supabase.auth.getSession()
      if (authError) {
        console.error('Error getting session:', authError)
        toast.error('Authentication error')
        return
      }
      if (!authData.session?.user?.id) {
        toast.error('No authenticated user')
        return
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('process_mapper_sessions')
        .insert({
          id: session.id,
          name: session.name,
          description: session.description,
          start_time: session.startTime.toISOString(),
          end_time: session.endTime?.toISOString(),
          status: session.status,
          total_duration: session.endTime ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000) : null,
          user_id: authData.session.user.id
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error saving session:', sessionError)
        toast.error('Failed to save session')
        return
      }

      // Save steps
      for (const step of session.steps) {
        const { error: stepError } = await supabase
          .from('process_mapper_steps')
          .insert({
            id: step.id,
            session_id: session.id,
            title: step.title,
            description: step.description,
            start_time: step.startTime.toISOString(),
            end_time: step.endTime?.toISOString(),
            duration: step.duration,
            order_index: step.orderIndex,
            notes: step.notes
          })

        if (stepError) {
          console.error('Error saving step:', stepError)
          continue
        }

        // Save timeline notes for this step
        for (const note of step.timelineNotes || []) {
          const { error: noteError } = await supabase
            .from('process_mapper_timeline_notes')
            .insert({
              step_id: step.id,
              session_id: session.id,
              timestamp: note.timestamp.toISOString(),
              note: note.note,
              instance_version: note.instanceVersion || 0
            })

          if (noteError) {
            console.error('Error saving timeline note:', noteError)
          }
        }
      }

      // Save replay instances
      for (const instance of session.replayInstances || []) {
        const { error: instanceError } = await supabase
          .from('process_mapper_replay_instances')
          .insert({
            id: instance.id,
            session_id: session.id,
            instance_number: instance.instanceNumber,
            start_time: instance.startTime.toISOString(),
            end_time: instance.endTime?.toISOString(),
            notes: instance.notes
          })

        if (instanceError) {
          console.error('Error saving replay instance:', instanceError)
        }
      }

      toast.success('Session saved successfully!')
    } catch (error) {
      console.error('Error saving session:', error)
      toast.error('Failed to save session')
    }
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

  // Auto-show note popups when time dot passes over them
  useEffect(() => {
    if (!isReplaying || !replaySession) return

    const allNotes = replaySession.steps.flatMap(step => getAllStepNotes(step.id))
    const currentTimePosition = getCurrentTimelinePosition()
    
    allNotes.forEach(note => {
      const notePosition = getTimelinePosition(note.timestamp, replaySession.startTime)
      const noteTime = Math.floor((note.timestamp.getTime() - replaySession.startTime.getTime()) / 1000)
      // Convert note time to compressed time for comparison when gaps are removed
      const effectiveNoteTime = removeGaps ? convertToCompressedTime(noteTime, replaySession) : noteTime
      
      // Check if time dot is within 2% of the note position and the note time has been reached
      const isNearNote = Math.abs(currentTimePosition - notePosition) < 2 && replayTime >= effectiveNoteTime
      
      if (isNearNote && !autoShownNotes.has(note.id)) {
        // Add note to auto-shown set
        setAutoShownNotes(prev => new Set(Array.from(prev).concat(note.id)))
        
        // Remove note from auto-shown set after 7 seconds
        setTimeout(() => {
          setAutoShownNotes(prev => {
            const newSet = new Set(Array.from(prev))
            newSet.delete(note.id)
            return newSet
          })
        }, 7000)
      }
    })
  }, [replayTime, isReplaying, replaySession, autoShownNotes, removeGaps])

  const startNewSession = async () => {
    if (!sessionName.trim()) {
      toast.error('Please enter a session name')
      return
    }

    try {
      // Get current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('Error getting session:', sessionError)
        toast.error('Authentication error')
        return
      }
      if (!sessionData.session?.user?.id) {
        toast.error('No authenticated user')
        return
      }

      // Create session in database first
      const { data: newSessionData, error: createError } = await supabase
        .from('process_mapper_sessions')
        .insert({
          name: sessionName,
          description: sessionDescription,
          status: 'active',
          user_id: sessionData.session.user.id
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating session:', createError)
        toast.error('Failed to start session')
        return
      }

      const newSession: ProcessMapperSession = {
        id: newSessionData.id,
        name: newSessionData.name,
        description: newSessionData.description,
        startTime: new Date(newSessionData.start_time),
        status: newSessionData.status,
        steps: []
      }

      setSession(newSession)
      setSessionTimer(0)
      setStepTimers({})
      setSessionName('')
      setSessionDescription('')
      setView('active')
      toast.success('Session started!')
    } catch (error) {
      console.error('Error starting session:', error)
      toast.error('Failed to start session')
    }
  }

  const addStep = async () => {
    if (!currentStep.trim()) {
      toast.error('Please enter a step title')
      return
    }

    if (!session) {
      toast.error('No active session')
      return
    }

    // Check if there's an active step that needs to be completed first
    const activeStep = session.steps.find(step => step.isActive)
    if (activeStep) {
      toast.error(`Please complete the current step "${activeStep.title}" before adding a new step`)
      return
    }

    try {
      // Create step in database
      const { data: stepData, error: stepError } = await supabase
        .from('process_mapper_steps')
        .insert({
          session_id: session.id,
          title: currentStep,
          description: currentStepNotes,
          order_index: session.steps.length,
          notes: currentStepNotes
        })
        .select()
        .single()

      if (stepError) {
        console.error('Error creating step:', stepError)
        toast.error('Failed to add step')
        return
      }

      const newStep: ProcessMapperStep = {
        id: stepData.id,
        title: stepData.title,
        description: stepData.description,
        startTime: new Date(stepData.start_time),
        orderIndex: stepData.order_index,
        notes: stepData.notes,
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
    } catch (error) {
      console.error('Error adding step:', error)
      toast.error('Failed to add step')
    }
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

  const stopStepTimer = async (stepId: string) => {
    if (!session) return

    const step = session.steps.find(s => s.id === stepId)
    if (!step || !step.isActive) return

    const duration = stepTimers[stepId] * 1000 // Convert seconds to milliseconds
    const endTime = new Date()

    try {
      // Update step in database with duration and end time
      const { error: updateError } = await supabase
        .from('process_mapper_steps')
        .update({
          end_time: endTime.toISOString(),
          duration: duration
        })
        .eq('id', stepId)

      if (updateError) {
        console.error('Error updating step:', updateError)
        toast.error('Failed to save step duration')
        return
      }

      // Update local state
      const updatedSteps = session.steps.map(s => {
        if (s.id === stepId && s.isActive) {
          return {
            ...s,
            isActive: false,
            endTime: endTime,
            duration: duration
          }
        }
        return s
      })

      setSession({
        ...session,
        steps: updatedSteps
      })

      toast.success('Step completed!')
    } catch (error) {
      console.error('Error stopping step timer:', error)
      toast.error('Failed to complete step')
    }
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

  const addStepNote = async (stepId: string) => {
    const noteText = stepNoteInputs[stepId]
    if (!noteText?.trim() || !session) return

    try {
      // Create note in database
      const { data: noteData, error: noteError } = await supabase
        .from('process_mapper_timeline_notes')
        .insert({
          step_id: stepId,
          session_id: session.id,
          note: noteText.trim(),
          instance_version: 0
        })
        .select()
        .single()

      if (noteError) {
        console.error('Error creating note:', noteError)
        toast.error('Failed to add note')
        return
      }

      const newNote = {
        id: noteData.id,
        timestamp: new Date(noteData.timestamp),
        note: noteData.note,
        instanceVersion: noteData.instance_version
      }

      const updatedSteps = session.steps.map(step => {
        if (step.id === stepId) {
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
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error('Failed to add note')
    }
  }

  const endSession = async () => {
    if (!session) return
    const completedSession: ProcessMapperSession = { ...session, status: 'completed', endTime: new Date() }
    setSession(completedSession)
    
    // Save to database
    await saveSession(completedSession)
    
    // Update local state
    setSessions(prev => [...prev, completedSession])
    
    toast.success('Session completed and saved!')
  }

  const deleteSession = async (sessionId: string) => {
    try {
      // Delete from database (cascade will handle related records)
      const { error } = await supabase
        .from('process_mapper_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) {
        console.error('Error deleting session:', error)
        toast.error('Failed to delete session')
        return
      }

      // Remove from local state
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      
      // If this was the current session, clear it
      if (session?.id === sessionId) {
        setSession(null)
      }

      toast.success('Session deleted successfully')
    } catch (error) {
      console.error('Error deleting session:', error)
      toast.error('Failed to delete session')
    }
  }

  const startReplay = (sessionToReplay: ProcessMapperSession) => {
    setReplaySession(sessionToReplay)
    setReplayTime(0)
    setIsReplaying(false)
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
          const maxTime = removeGaps ? getCompressedSessionDuration(replaySession) : getSessionDuration(replaySession)
          if (newTime >= maxTime) {
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
  }, [isReplaying, replaySession, removeGaps])

  // Convert compressed time back to original time for step progress calculations
  const convertFromCompressedTime = (compressedTime: number, session: ProcessMapperSession) => {
    if (!removeGaps) return compressedTime
    
    let remainingTime = compressedTime
    let originalTime = 0
    
    for (const step of session.steps) {
      const stepStart = Math.floor((step.startTime.getTime() - session.startTime.getTime()) / 1000)
      const stepEnd = step.endTime ? Math.floor((step.endTime.getTime() - session.startTime.getTime()) / 1000) : stepStart + (step.duration ? Math.floor(step.duration / 1000) : 0)
      const stepDuration = stepEnd - stepStart
      
      if (remainingTime <= stepDuration) {
        // Time is within this step
        return stepStart + remainingTime
      } else {
        // Time is beyond this step
        remainingTime -= stepDuration
        originalTime = stepEnd
      }
    }
    
    return originalTime
  }

  const getSessionDuration = (session: ProcessMapperSession) => {
    const endTime = session.endTime || new Date()
    return Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000)
  }

  const getCompressedSessionDuration = (session: ProcessMapperSession) => {
    return session.steps.reduce((total, step) => {
      const stepStart = Math.floor((step.startTime.getTime() - session.startTime.getTime()) / 1000)
      const stepEnd = step.endTime ? Math.floor((step.endTime.getTime() - session.startTime.getTime()) / 1000) : stepStart + (step.duration ? Math.floor(step.duration / 1000) : 0)
      return total + (stepEnd - stepStart)
    }, 0)
  }

  const convertToCompressedTime = (originalTime: number, session: ProcessMapperSession) => {
    let compressedTime = 0
    
    for (const step of session.steps) {
      const stepStart = Math.floor((step.startTime.getTime() - session.startTime.getTime()) / 1000)
      const stepEnd = step.endTime ? Math.floor((step.endTime.getTime() - session.startTime.getTime()) / 1000) : stepStart + (step.duration ? Math.floor(step.duration / 1000) : 0)
      const stepDuration = stepEnd - stepStart
      
      if (originalTime >= stepStart && originalTime <= stepEnd) {
        // Time is within this step
        const timeInStep = originalTime - stepStart
        return compressedTime + timeInStep
      } else if (originalTime > stepEnd) {
        // Time is after this step, add full step duration
        compressedTime += stepDuration
      }
    }
    
    return compressedTime
  }

  const getStepProgress = (step: ProcessMapperStep, session: ProcessMapperSession) => {
    const stepStartTime = Math.floor((step.startTime.getTime() - session.startTime.getTime()) / 1000)
    const stepEndTime = step.endTime ? 
      Math.floor((step.endTime.getTime() - session.startTime.getTime()) / 1000) :
      stepStartTime + (step.duration ? Math.floor(step.duration / 1000) : 0)
    
    if (removeGaps) {
      // When gaps are removed, calculate cumulative compressed time up to this step
      let compressedStepStart = 0
      let compressedStepEnd = 0
      
      for (const s of session.steps) {
        const sStart = Math.floor((s.startTime.getTime() - session.startTime.getTime()) / 1000)
        const sEnd = s.endTime ? Math.floor((s.endTime.getTime() - session.startTime.getTime()) / 1000) : sStart + (s.duration ? Math.floor(s.duration / 1000) : 0)
        const sDuration = sEnd - sStart
        
        if (s.id === step.id) {
          // This is our target step
          compressedStepEnd = compressedStepStart + sDuration
          break
        } else {
          // Add this step's duration to cumulative time
          compressedStepStart += sDuration
        }
      }
      
      return {
        startTime: compressedStepStart,
        endTime: compressedStepEnd,
        isActive: replayTime >= compressedStepStart && replayTime <= compressedStepEnd,
        isCompleted: replayTime > compressedStepEnd
      }
    } else {
      // When gaps are not removed, replay time directly corresponds to original timeline
      return {
        startTime: stepStartTime,
        endTime: stepEndTime,
        isActive: replayTime >= stepStartTime && replayTime <= stepEndTime,
        isCompleted: replayTime > stepEndTime
      }
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else if (minutes >= 10) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }

  // Start a new replay instance
  const startNewReplayInstance = async () => {
    if (!replaySession) return

    try {
      const newInstanceNumber = (replaySession.replayInstances?.length || 0) + 1
      
      // Create replay instance in database
      const { data: instanceData, error: instanceError } = await supabase
        .from('process_mapper_replay_instances')
        .insert({
          session_id: replaySession.id,
          instance_number: newInstanceNumber
        })
        .select()
        .single()

      if (instanceError) {
        console.error('Error creating replay instance:', instanceError)
        toast.error('Failed to create replay instance')
        return
      }

      const newInstance = {
        id: instanceData.id,
        instanceNumber: instanceData.instance_number,
        startTime: new Date(instanceData.start_time),
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
      setSessions(prev => prev.map(s => 
        s.id === replaySession.id ? updatedSession : s
      ))
    } catch (error) {
      console.error('Error creating replay instance:', error)
      toast.error('Failed to create replay instance')
    }
  }

  // Add note during replay
  const addReplayNote = async (stepId: string) => {
    const noteText = replayNoteInputs[stepId]
    if (!noteText?.trim() || !replaySession) return

    try {
      // Find the current replay instance
      const currentInstance = replaySession.replayInstances?.find(
        instance => instance.instanceNumber === currentReplayInstance
      )

      if (!currentInstance) {
        toast.error('No active replay instance')
        return
      }

      // Create note in database
      const { data: noteData, error: noteError } = await supabase
        .from('process_mapper_timeline_notes')
        .insert({
          step_id: stepId,
          session_id: replaySession.id,
          replay_instance_id: currentInstance.id,
          note: noteText.trim(),
          instance_version: currentReplayInstance
        })
        .select()
        .single()

      if (noteError) {
        console.error('Error creating replay note:', noteError)
        toast.error('Failed to add note')
        return
      }

      const newNote = {
        id: noteData.id,
        stepId,
        timestamp: new Date(noteData.timestamp),
        note: noteData.note,
        instanceVersion: noteData.instance_version
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
      setSessions(prev => prev.map(s => 
        s.id === replaySession.id ? updatedSession : s
      ))

      toast.success('Note added to replay instance!')
    } catch (error) {
      console.error('Error adding replay note:', error)
      toast.error('Failed to add note')
    }
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
    const originalTime = timeDiff / 1000
    
    if (removeGaps) {
      const compressedTime = convertToCompressedTime(originalTime, replaySession!)
      const compressedDuration = getCompressedSessionDuration(replaySession!)
      return (compressedTime / compressedDuration) * 100
    } else {
      const sessionDuration = getSessionDuration(replaySession!)
      return (originalTime / sessionDuration) * 100
    }
  }

  // Get current timeline position
  const getCurrentTimelinePosition = () => {
    if (!replaySession) return 0
    
    if (removeGaps) {
      // When gaps are removed, replay time directly corresponds to compressed timeline
      const compressedDuration = getCompressedSessionDuration(replaySession)
      return (replayTime / compressedDuration) * 100
    } else {
      const sessionDuration = getSessionDuration(replaySession)
      return (replayTime / sessionDuration) * 100
    }
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
            <Button onClick={() => startNewSession()} className="w-full">
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
                    onClick={() => startNewReplayInstance()}
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
                    {formatDuration(removeGaps ? getCompressedSessionDuration(replaySession) : getSessionDuration(replaySession))}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {Math.round((replayTime / (removeGaps ? getCompressedSessionDuration(replaySession) : getSessionDuration(replaySession))) * 100)}%
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
              <div className="w-full h-2 bg-gray-300 relative rounded-full">
                {replaySession.steps.map((step, idx) => {
                  const sessionDuration = getSessionDuration(replaySession)
                  const stepStart = Math.floor((step.startTime.getTime() - replaySession.startTime.getTime()) / 1000)
                  const stepEnd = step.endTime ? Math.floor((step.endTime.getTime() - replaySession.startTime.getTime()) / 1000) : stepStart + (step.duration ? Math.floor(step.duration / 1000) : 0)
                  const stepDuration = stepEnd - stepStart
                  
                  let left, width
                  if (removeGaps) {
                    // Calculate total step duration for compression
                    const totalStepDuration = replaySession.steps.reduce((total, s) => {
                      const sStart = Math.floor((s.startTime.getTime() - replaySession.startTime.getTime()) / 1000)
                      const sEnd = s.endTime ? Math.floor((s.endTime.getTime() - replaySession.startTime.getTime()) / 1000) : sStart + (s.duration ? Math.floor(s.duration / 1000) : 0)
                      return total + (sEnd - sStart)
                    }, 0)
                    
                    // Calculate cumulative position of previous steps
                    const previousStepsDuration = replaySession.steps.slice(0, idx).reduce((total, s) => {
                      const sStart = Math.floor((s.startTime.getTime() - replaySession.startTime.getTime()) / 1000)
                      const sEnd = s.endTime ? Math.floor((s.endTime.getTime() - replaySession.startTime.getTime()) / 1000) : sStart + (s.duration ? Math.floor(s.duration / 1000) : 0)
                      return total + (sEnd - sStart)
                    }, 0)
                    
                    left = (previousStepsDuration / totalStepDuration) * 100
                    width = (stepDuration / totalStepDuration) * 100
                  } else {
                    left = (stepStart / sessionDuration) * 100
                    width = (stepDuration / sessionDuration) * 100
                  }
                  const colors = [
                    '#3B82F6', // blue
                    '#10B981', // green
                    '#F59E0B', // yellow
                    '#EC4899', // pink
                    '#8B5CF6', // purple
                    '#14B8A6', // teal
                  ]
                  const color = colors[idx % colors.length]
                  return (
                    <div
                      key={step.id}
                      className="group absolute top-0 h-full rounded cursor-pointer"
                      style={{ 
                        left: `${left}%`, 
                        width: `${width}%`,
                        backgroundColor: color
                      }}
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
                      className="absolute top-0 w-2 h-2 rounded-full border-2 border-white shadow-sm"
                      style={{
                        left: `${getCurrentTimelinePosition()}%`,
                        transform: 'translateX(-50%) translateY(-3px)',
                        backgroundColor: '#3B82F6'
                      }}
                    />
                    {/* Time label above the blue dot */}
                    <div
                      className="absolute -top-6 text-white text-xs px-2 py-0.5 rounded font-mono font-semibold z-30"
                      style={{
                        left: `${getCurrentTimelinePosition()}%`,
                        transform: 'translateX(-50%)',
                        backgroundColor: '#3B82F6'
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
                    // Convert note time to compressed time for visibility check when gaps are removed
                    const effectiveNoteTime = removeGaps ? convertToCompressedTime(noteTime, replaySession) : noteTime
                    const isVisible = replayTime >= effectiveNoteTime
                    
                    return (
                      <div
                        key={note.id}
                        className="group absolute top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm cursor-pointer transition-all"
                        style={{ 
                          left: `${notePosition}%`,
                          transform: 'translateX(-50%) translateY(-5px)',
                          backgroundColor: note.instanceVersion === 0 ? '#F59E0B' : '#8B5CF6',
                          opacity: isVisible ? 1 : 0.5
                        }}
                      >
                        {/* Hover popup */}
                        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 text-white text-sm rounded-lg transition-opacity whitespace-nowrap z-50 border border-gray-800 shadow-lg ${
                          autoShownNotes.has(note.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 hover:opacity-100'
                        }`}
                             style={{ backgroundColor: '#111' }}>
                          {showDetailedNotes ? (
                            <>
                              <div className="font-medium mb-1">
                                Step {stepIndex + 1}: {step.title}
                              </div>
                              <div className="text-gray-200">{note.note}</div>
                              <div className="text-gray-400 text-xs mt-1">
                                {formatDuration(effectiveNoteTime)} • {note.instanceVersion === 0 ? 'Original' : `Instance ${note.instanceVersion}`}
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-200">{note.note}</div>
                          )}
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
                {(() => {
                  const sessionDuration = getSessionDuration(replaySession)
                  const minutes = Math.floor(sessionDuration / 60)
                  const timePoints = []
                  
                  // Add minute markers
                  for (let i = 1; i <= minutes; i++) {
                    const minutePosition = (i * 60 / sessionDuration) * 100
                    timePoints.push(
                      <span key={`minute-${i}`} style={{ position: 'absolute', left: `${minutePosition}%`, transform: 'translateX(-50%)' }}>
                        {i}m
                      </span>
                    )
                  }
                  
                  // Add 30-second interval markers for sessions less than 2 minutes
                  if (sessionDuration < 120) {
                    const thirtySecondIntervals = Math.floor(sessionDuration / 30)
                    for (let i = 1; i <= thirtySecondIntervals; i++) {
                      const thirtySecondPosition = (i * 30 / sessionDuration) * 100
                      // Skip if this position is too close to a minute marker (within 5% of timeline)
                      const isNearMinuteMarker = minutes > 0 && Math.abs(thirtySecondPosition - (Math.floor(i * 30 / 60) * 60 / sessionDuration) * 100) < 5
                      if (!isNearMinuteMarker) {
                        timePoints.push(
                          <span key={`thirtysec-${i}`} style={{ position: 'absolute', left: `${thirtySecondPosition}%`, transform: 'translateX(-50%)' }}>
                            {i * 30 >= 60 ? `${Math.floor((i * 30) / 60)}m ${(i * 30) % 60}s` : `${i * 30}s`}
                          </span>
                        )
                      }
                    }
                  }
                  
                  return (
                    <div className="relative w-full">
                      {timePoints}
                      <span className="absolute right-0">{formatDuration(removeGaps ? getCompressedSessionDuration(replaySession) : sessionDuration)}</span>
                    </div>
                  )
                })()}
              </div>
              
              {/* Note display options */}
              <div className="mt-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="detailed-notes"
                    checked={showDetailedNotes}
                    onChange={(e) => setShowDetailedNotes(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="detailed-notes" className="text-sm text-gray-700">
                    Detailed notes
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remove-gaps"
                    checked={removeGaps}
                    onChange={(e) => setRemoveGaps(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="remove-gaps" className="text-sm text-gray-700">
                    Remove gaps
                  </label>
                </div>
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
                          <span>Duration: {formatDuration(step.duration ? Math.floor(step.duration / 1000) : 0)}</span>
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
                      <button 
                        className="px-3 py-1.5 text-sm font-medium rounded border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          backgroundColor: '#000000',
                          color: '#FFFFFF'
                        }}
                        onClick={() => addReplayNote(step.id)}
                        disabled={!replayNoteInputs[step.id]?.trim()}
                      >
                        Add Note
                      </button>
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
              {(() => {
                const activeStep = session.steps.find(step => step.isActive)
                if (activeStep) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                          Complete Current Step First
                        </span>
                      </div>
                      <p className="text-sm text-yellow-700">
                        Please complete the current step "{activeStep.title}" before adding a new step.
                      </p>
                    </div>
                  )
                }
                return (
                  <>
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
                    <Button onClick={() => addStep()} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Step
                    </Button>
                  </>
                )
              })()}
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
                      <button
                        className="px-3 py-1.5 text-sm font-medium rounded border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          backgroundColor: '#000000',
                          color: '#FFFFFF'
                        }}
                        onClick={() => addStepNote(step.id)}
                        disabled={!stepNoteInputs[step.id]?.trim()}
                      >
                        Add
                      </button>
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