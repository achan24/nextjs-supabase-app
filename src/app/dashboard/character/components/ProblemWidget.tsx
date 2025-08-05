'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Plus, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'
// Define the type locally to avoid import issues
type ProblemWidgetType = {
  problemId: string
  title: string
  openCount: number
  totalCount: number
  isBlocked: boolean
  progressPercentage: number
  type: 'problem' | 'experiment'
  priority: 'low' | 'medium' | 'high'
}
import { createClient } from '@/lib/supabase'

export default function ProblemWidget() {
  console.log('[Problem Widget] Component mounting...')
  
  // Use the shared Supabase client (memoized to prevent infinite loops)
  const [supabase] = useState(() => createClient())
  
  const [problems, setProblems] = useState<ProblemWidgetType[]>([])
  const [selectedProblem, setSelectedProblem] = useState<ProblemWidgetType | null>(null)
  const [isProblemDialogOpen, setIsProblemDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState<'problem' | 'experiment'>('problem')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isUpdating, setIsUpdating] = useState(false)
  const [subProblems, setSubProblems] = useState<Array<{
    id: string
    title: string
    type: 'problem' | 'experiment'
    status: 'open' | 'solved' | 'blocked'
    priority: 'low' | 'medium' | 'high'
    tasks?: Array<{
      id: string
      title: string
      status: 'pending' | 'in_progress' | 'completed'
    }>
  }>>([])
  const [isLoadingSubProblems, setIsLoadingSubProblems] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false)
  const [selectedSubProblem, setSelectedSubProblem] = useState<{
    id: string
    title: string
    type: 'problem' | 'experiment'
  } | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [showTaskEditDialog, setShowTaskEditDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<{
    id: string
    title: string
    description: string
    status: 'pending' | 'in_progress' | 'completed'
  } | null>(null)
  const [isUpdatingTask, setIsUpdatingTask] = useState(false)
  const [showAddSubProblem, setShowAddSubProblem] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateNewDialogOpen, setIsCreateNewDialogOpen] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemType, setNewItemType] = useState<'problem' | 'experiment'>('problem')
  const [isCreating, setIsCreating] = useState(false)
  
  // Separate state for create new problem dialog
  const [newProblemTitle, setNewProblemTitle] = useState('')
  const [newProblemType, setNewProblemType] = useState<'problem' | 'experiment'>('problem')
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // Fetch widget data directly from database
  const fetchWidgetData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('[Problem Widget] Fetching widget data...')
      
      // Get current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('[Problem Widget] Session error:', sessionError)
        throw new Error('Authentication error')
      }
      
      if (!sessionData.session?.user?.id) {
        console.log('[Problem Widget] No authenticated user')
        setProblems([])
        return
      }
      
      // Call the database function to get all problems
      const { data: problemsData, error: widgetError } = await supabase
        .rpc('get_all_problems_widget', { user_uuid: sessionData.session.user.id })
      
      if (widgetError) {
        console.error('[Problem Widget] Database error:', widgetError)
        throw new Error('Failed to fetch problem widget data')
      }
      
      console.log('[Problem Widget] Received data:', problemsData)
      
      // If no problems exist, return empty state
      if (!problemsData || problemsData.length === 0) {
        setProblems([])
      } else {
        // Map the data to our expected format
        const mappedProblems = problemsData.map((problem: any) => ({
          problemId: problem.problem_id,
          title: problem.title,
          openCount: problem.open_count,
          totalCount: problem.total_count,
          isBlocked: problem.is_blocked,
          progressPercentage: problem.progress_percentage,
          type: problem.type,
          priority: problem.priority
        }))
        setProblems(mappedProblems)
      }
    } catch (err) {
      console.error('[Problem Widget] Fetch error:', err)
      setError('Failed to load problem data')
    } finally {
      setLoading(false)
    }
  }

  // Create quick child problem/experiment
  const createQuickChild = async () => {
    if (!selectedProblem || !newItemTitle.trim()) return

    try {
      setIsCreating(true)
      
      // Get current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.user?.id) {
        throw new Error('Authentication error')
      }
      
      // Call the database function to create the quick child
      const { data: newProblemId, error: createError } = await supabase
        .rpc('create_quick_child', {
          parent_uuid: selectedProblem.problemId,
          user_uuid: sessionData.session.user.id,
          child_title: newItemTitle.trim(),
          child_type: newItemType
        })

      if (createError) {
        console.error('[Problem Widget] Create child error:', createError)
        throw new Error('Failed to create item')
      }

      console.log('[Problem Widget] Child problem created:', newProblemId)

      // Reset form
      setNewItemTitle('')
      setNewItemType('problem')
      
      // Refresh widget data
      await fetchWidgetData()
    } catch (err) {
      console.error('[Problem Widget] Create error:', err)
      setError('Failed to create item')
    } finally {
      setIsCreating(false)
    }
  }

  // Create first problem (top-level)
  const createFirstProblem = async () => {
    if (!newItemTitle.trim()) return

    try {
      setIsCreating(true)
      
      // Get current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.user?.id) {
        throw new Error('Authentication error')
      }
      
      // Insert the new problem (top-level, no parent_id)
      const { data: newProblem, error: insertError } = await supabase
        .from('problems')
        .insert({
          user_id: sessionData.session.user.id,
          title: newItemTitle.trim(),
          type: newItemType,
          parent_id: null // Top-level problem
        })
        .select()
        .single()

      if (insertError) {
        console.error('[Problem Widget] Insert error:', insertError)
        throw new Error('Failed to create problem')
      }

      console.log('[Problem Widget] Problem created:', newProblem)

      // Reset form and close dialog
      setNewItemTitle('')
      setNewItemType('problem')
      setIsCreateNewDialogOpen(false)
      
      // Refresh widget data
      await fetchWidgetData()
    } catch (err) {
      console.error('[Problem Widget] Create first problem error:', err)
      setError('Failed to create problem')
    } finally {
      setIsCreating(false)
    }
  }

  // Create new problem (for existing problems state)
  const createNewProblem = async () => {
    if (!newProblemTitle.trim()) return

    try {
      setIsCreatingNew(true)
      
      // Get current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.user?.id) {
        throw new Error('Authentication error')
      }
      
      // Insert the new problem (top-level, no parent_id)
      const { data: newProblem, error: insertError } = await supabase
        .from('problems')
        .insert({
          user_id: sessionData.session.user.id,
          title: newProblemTitle.trim(),
          type: newProblemType,
          parent_id: null // Top-level problem
        })
        .select()
        .single()

      if (insertError) {
        console.error('[Problem Widget] Insert error:', insertError)
        throw new Error('Failed to create problem')
      }

      console.log('[Problem Widget] New problem created:', newProblem)

      // Reset form and close dialog
      setNewProblemTitle('')
      setNewProblemType('problem')
      setIsCreateNewDialogOpen(false)
      
      // Refresh widget data
      await fetchWidgetData()
    } catch (err) {
      console.error('[Problem Widget] Create new problem error:', err)
      setError('Failed to create problem')
    } finally {
      setIsCreatingNew(false)
    }
  }

  // Update problem
  const updateProblem = async () => {
    if (!selectedProblem || !editTitle.trim()) return

    try {
      setIsUpdating(true)
      
      // Get current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.user?.id) {
        throw new Error('Authentication error')
      }
      
      // Update the problem
      const { data: updatedProblem, error: updateError } = await supabase
        .from('problems')
        .update({
          title: editTitle.trim(),
          type: editType,
          priority: editPriority
        })
        .eq('id', selectedProblem.problemId)
        .eq('user_id', sessionData.session.user.id)
        .select()
        .single()

      if (updateError) {
        console.error('[Problem Widget] Update error:', updateError)
        throw new Error('Failed to update problem')
      }

      console.log('[Problem Widget] Problem updated:', updatedProblem)

      // Reset edit state
      setIsEditing(false)
      setEditTitle('')
      setEditType('problem')
      setEditPriority('medium')
      
      // Refresh widget data
      await fetchWidgetData()
    } catch (err) {
      console.error('[Problem Widget] Update problem error:', err)
      setError('Failed to update problem')
    } finally {
      setIsUpdating(false)
    }
  }

  // Delete problem
  const deleteProblem = async () => {
    if (!selectedProblem) return

    try {
      setIsUpdating(true)
      
      // Get current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.user?.id) {
        throw new Error('Authentication error')
      }
      
      // Delete the problem (this will cascade delete children due to ON DELETE CASCADE)
      const { error: deleteError } = await supabase
        .from('problems')
        .delete()
        .eq('id', selectedProblem.problemId)
        .eq('user_id', sessionData.session.user.id)

      if (deleteError) {
        console.error('[Problem Widget] Delete error:', deleteError)
        throw new Error('Failed to delete problem')
      }

      console.log('[Problem Widget] Problem deleted:', selectedProblem.problemId)

      // Close dialog and refresh widget data
      setIsProblemDialogOpen(false)
      setSelectedProblem(null)
      await fetchWidgetData()
    } catch (err) {
      console.error('[Problem Widget] Delete problem error:', err)
      setError('Failed to delete problem')
    } finally {
      setIsUpdating(false)
    }
  }

  // Create task for a sub-problem
  const createTask = async () => {
    if (!selectedSubProblem || !newTaskTitle.trim()) return

    try {
      setIsCreatingTask(true)
      
      // Get current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.user?.id) {
        throw new Error('Authentication error')
      }
      
      // Create the task linked to the sub-problem
      const { data: newTask, error: createError } = await supabase
        .from('tasks')
        .insert({
          user_id: sessionData.session.user.id,
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || null,
          problem_id: selectedSubProblem.id,
          status: 'pending',
          priority: 3, // Medium priority
          is_starred_for_today: true // Make it visible in today's tasks
        })
        .select()
        .single()

      if (createError) {
        console.error('[Problem Widget] Create task error:', createError)
        throw new Error('Failed to create task')
      }

      console.log('[Problem Widget] Task created:', newTask)

      // Reset form and close dialog
      setNewTaskTitle('')
      setNewTaskDescription('')
      setShowAddTaskDialog(false)
      setSelectedSubProblem(null)
      
      // Refresh sub-problems to show the new task
      if (selectedProblem) {
        fetchSubProblems(selectedProblem.problemId)
      }
    } catch (err) {
      console.error('[Problem Widget] Create task error:', err)
      setError('Failed to create task')
    } finally {
      setIsCreatingTask(false)
    }
  }

  // Update task status
  const updateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated user')
      }

      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .eq('user_id', session.user.id)

      if (error) throw error

      // Refresh sub-problems to show updated task
      if (selectedProblem) {
        fetchSubProblems(selectedProblem.problemId)
      }
    } catch (err) {
      console.error('[Problem Widget] Update task status error:', err)
      setError('Failed to update task')
    }
  }

  // Update task details
  const updateTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return

    try {
      setIsUpdatingTask(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated user')
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          title: editingTask.title.trim(),
          description: editingTask.description.trim() || null,
          status: editingTask.status
        })
        .eq('id', editingTask.id)
        .eq('user_id', session.user.id)

      if (error) throw error

      // Reset and refresh
      setShowTaskEditDialog(false)
      setEditingTask(null)
      if (selectedProblem) {
        fetchSubProblems(selectedProblem.problemId)
      }
    } catch (err) {
      console.error('[Problem Widget] Update task error:', err)
      setError('Failed to update task')
    } finally {
      setIsUpdatingTask(false)
    }
  }

  // Delete task
  const deleteTask = async (taskId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated user')
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', session.user.id)

      if (error) throw error

      // Refresh sub-problems to show updated list
      if (selectedProblem) {
        fetchSubProblems(selectedProblem.problemId)
      }
    } catch (err) {
      console.error('[Problem Widget] Delete task error:', err)
      setError('Failed to delete task')
    }
  }

  // Load data on mount
  useEffect(() => {
    fetchWidgetData()
  }, [])

  // Fetch sub-problems when a problem is selected
  const fetchSubProblems = async (problemId: string) => {
    setIsLoadingSubProblems(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated user')
      }

      const { data, error } = await supabase
        .from('problems')
        .select('id, title, type, status, priority')
        .eq('parent_id', problemId)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Fetch tasks for each sub-problem
      const subProblemsWithTasks = await Promise.all(
        (data || []).map(async (subProblem) => {
          const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('id, title, status')
            .eq('problem_id', subProblem.id)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: true })

          if (tasksError) {
            console.error('[Problem Widget] Error fetching tasks:', tasksError)
            return { ...subProblem, tasks: [] }
          }

          return { ...subProblem, tasks: tasks || [] }
        })
      )

      setSubProblems(subProblemsWithTasks)
    } catch (err) {
      console.error('[Problem Widget] Error fetching sub-problems:', err)
      setSubProblems([])
    } finally {
      setIsLoadingSubProblems(false)
    }
  }

  // Handle dialog open/close
  const handleCreateNewDialogOpenChange = (open: boolean) => {
    setIsCreateNewDialogOpen(open)
    if (!open) {
      setNewProblemTitle('')
      setNewProblemType('problem')
    }
  }



  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'problem': return '🩺'
      case 'experiment': return '🧪'
      default: return '📋'
    }
  }

  if (loading) {
    return (
      <Card className="p-4 h-[180px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading problems...</div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4 h-[180px] flex items-center justify-center">
        <div className="text-sm text-red-500">{error}</div>
      </Card>
    )
  }

  // Empty state - no problems
  if (!problems.length) {
    return (
      <Card className="p-4 h-[180px]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-sm">Problems</h3>
          <Badge variant="secondary" className="text-xs">No problems</Badge>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center text-sm text-muted-foreground mb-3">
            <div className="mb-2">📋</div>
            <div>No problems yet</div>
            <div className="text-xs mt-1">Start tracking your challenges</div>
          </div>
          <Dialog open={isCreateNewDialogOpen} onOpenChange={handleCreateNewDialogOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-3 w-3 mr-1" />
                Create First Problem
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Your First Problem</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Problem Title</Label>
                  <Input
                    id="title"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder="e.g., Sleep Issues, Work Stress..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newItemTitle.trim()) {
                        createFirstProblem()
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <RadioGroup 
                    value={newItemType} 
                    onValueChange={(value) => setNewItemType(value as 'problem' | 'experiment')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="problem" id="problem" />
                      <Label htmlFor="problem">Problem</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="experiment" id="experiment" />
                      <Label htmlFor="experiment">Experiment</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateNewDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createFirstProblem}
                    disabled={!newItemTitle.trim() || isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create Problem'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 h-[240px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">Problems</h3>
        <Badge variant="secondary" className="text-xs">
          {problems.length} total
        </Badge>
      </div>

      {/* Problems List */}
      <div className="space-y-2 mb-3 max-h-[120px] overflow-y-auto">
        {problems.map((problem, index) => (
          <div 
            key={problem.problemId} 
            className="flex items-center justify-between p-2 bg-muted/50 rounded-md cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => {
              setSelectedProblem(problem)
              setIsProblemDialogOpen(true)
              fetchSubProblems(problem.problemId)
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm">{getTypeIcon(problem.type)}</span>
              <span className="text-xs font-medium truncate">{problem.title}</span>
              {problem.isBlocked && <AlertCircle className="h-3 w-3 text-red-500" />}
              {problem.openCount === 0 && <CheckCircle className="h-3 w-3 text-green-500" />}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {problem.openCount}/{problem.totalCount}
              </span>
              <Badge variant="outline" className="text-xs px-1">
                {problem.priority}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Removed the + button since we now have integrated form in problem dialog */}
      </div>
      
      {/* Create New Problem Button */}
      <div className="mt-2">
        <Dialog open={isCreateNewDialogOpen} onOpenChange={handleCreateNewDialogOpenChange}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Create New Problem
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Problem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-title">Problem Title</Label>
                <Input
                  id="new-title"
                  value={newProblemTitle}
                  onChange={(e) => setNewProblemTitle(e.target.value)}
                  placeholder="e.g., Sleep Issues, Work Stress..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newProblemTitle.trim()) {
                      createNewProblem()
                    }
                  }}
                />
              </div>
              <div>
                <Label>Type</Label>
                <RadioGroup 
                  value={newProblemType} 
                  onValueChange={(value) => setNewProblemType(value as 'problem' | 'experiment')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="problem" id="new-problem" />
                    <Label htmlFor="new-problem">Problem</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="experiment" id="new-experiment" />
                    <Label htmlFor="new-experiment">Experiment</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateNewDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createNewProblem}
                  disabled={!newProblemTitle.trim() || isCreatingNew}
                >
                  {isCreatingNew ? 'Creating...' : 'Create Problem'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Problem Detail Dialog */}
      <Dialog open={isProblemDialogOpen} onOpenChange={setIsProblemDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedProblem && getTypeIcon(selectedProblem.type)}</span>
              {selectedProblem?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedProblem && (
            <div className="space-y-4">
              {/* Problem Details */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedProblem.isBlocked && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {selectedProblem.openCount === 0 && <CheckCircle className="h-4 w-4 text-green-500" />}
                  <span className="text-sm text-muted-foreground">
                    {selectedProblem.openCount} open / {selectedProblem.totalCount} total
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedProblem.priority}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(!isEditing)
                      if (!isEditing) {
                        setEditTitle(selectedProblem.title)
                        setEditType(selectedProblem.type)
                        setEditPriority(selectedProblem.priority)
                      }
                    }}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirmation(true)
                      setDeleteConfirmationText('')
                    }}
                    disabled={isUpdating}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              
              {/* Edit Form */}
              {isEditing && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-3">Edit Problem</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Enter title..."
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <RadioGroup 
                        value={editType} 
                        onValueChange={(value) => setEditType(value as 'problem' | 'experiment')}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="problem" id="edit-problem" />
                          <Label htmlFor="edit-problem">Problem</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="experiment" id="edit-experiment" />
                          <Label htmlFor="edit-experiment">Experiment</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <RadioGroup 
                        value={editPriority} 
                        onValueChange={(value) => setEditPriority(value as 'low' | 'medium' | 'high')}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="low" id="edit-low" />
                          <Label htmlFor="edit-low">Low</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="edit-medium" />
                          <Label htmlFor="edit-medium">Medium</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="high" id="edit-high" />
                          <Label htmlFor="edit-high">High</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={updateProblem}
                        disabled={!editTitle.trim() || isUpdating}
                      >
                        {isUpdating ? 'Updating...' : 'Update'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{selectedProblem.progressPercentage}%</span>
                </div>
                <Progress value={selectedProblem.progressPercentage} className="h-2" />
              </div>

              {/* Sub-problems List */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Sub-problems & Experiments</h4>
                {isLoadingSubProblems ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : subProblems.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {subProblems.map((subProblem) => (
                      <div key={subProblem.id} className="space-y-2">
                        {/* Sub-problem header */}
                        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm">{getTypeIcon(subProblem.type)}</span>
                            <span className="text-sm font-medium truncate">{subProblem.title}</span>
                            {subProblem.status === 'blocked' && <AlertCircle className="h-3 w-3 text-red-500" />}
                            {subProblem.status === 'solved' && <CheckCircle className="h-3 w-3 text-green-500" />}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs px-1">
                              {subProblem.priority}
                            </Badge>
                            <Badge variant={subProblem.status === 'solved' ? 'default' : 'secondary'} className="text-xs">
                              {subProblem.status}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs px-2"
                              onClick={() => {
                                setSelectedSubProblem(subProblem)
                                setShowAddTaskDialog(true)
                              }}
                            >
                              Add Task
                            </Button>
                          </div>
                        </div>
                        
                        {/* Tasks list */}
                        {subProblem.tasks && subProblem.tasks.length > 0 && (
                          <div className="ml-4 space-y-1">
                            {subProblem.tasks.map((task) => (
                              <div key={task.id} className="flex items-center justify-between p-2 bg-background border rounded-md">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <button
                                    onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                                    className="text-xs hover:scale-110 transition-transform"
                                  >
                                    {task.status === 'completed' ? '✅' : '⭕'}
                                  </button>
                                  <span className="text-xs font-medium truncate">{task.title}</span>
                                  {task.status === 'in_progress' && <AlertCircle className="h-3 w-3 text-yellow-500" />}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant={task.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                    {task.status}
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs px-1 h-6"
                                    onClick={() => {
                                      setEditingTask({
                                        id: task.id,
                                        title: task.title,
                                        description: '', // We'll need to fetch this
                                        status: task.status
                                      })
                                      setShowTaskEditDialog(true)
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="text-xs px-1 h-6"
                                    onClick={() => deleteTask(task.id)}
                                  >
                                    ×
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No sub-problems or experiments yet.</div>
                )}
              </div>

              {/* Add Sub-problem/Experiment */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowAddSubProblem(!showAddSubProblem)}
                  className="flex items-center gap-2 w-full text-left font-medium mb-3 hover:text-primary transition-colors"
                >
                  <span>{showAddSubProblem ? '▼' : '▶'}</span>
                  Add Sub-problem or Experiment
                </button>
                {showAddSubProblem && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="problem-title">Title</Label>
                      <Input
                        id="problem-title"
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="Enter title..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newItemTitle.trim()) {
                            createQuickChild()
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <RadioGroup 
                        value={newItemType} 
                        onValueChange={(value) => setNewItemType(value as 'problem' | 'experiment')}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="problem" id="dialog-problem" />
                          <Label htmlFor="dialog-problem">Sub-problem</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="experiment" id="dialog-experiment" />
                          <Label htmlFor="dialog-experiment">Experiment</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        onClick={createQuickChild}
                        disabled={!newItemTitle.trim() || isCreating}
                      >
                        {isCreating ? 'Creating...' : 'Add'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Problem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Are you sure you want to delete "{selectedProblem?.title}"?
            </div>
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <strong>Warning:</strong> This will also delete all {selectedProblem?.totalCount || 0} sub-problems and experiments associated with this problem. This action cannot be undone.
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Type "delete" to confirm deletion:
              </Label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type delete"
                className="border-red-200 focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteConfirmation(false)
                  setDeleteConfirmationText('')
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  setShowDeleteConfirmation(false)
                  setDeleteConfirmationText('')
                  deleteProblem()
                }}
                disabled={isUpdating || deleteConfirmationText !== 'delete'}
              >
                {isUpdating ? 'Deleting...' : 'Delete Problem'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task to "{selectedSubProblem?.title}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTaskTitle.trim()) {
                    createTask()
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description (optional)</Label>
              <textarea
                id="task-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Enter task description..."
                className="w-full min-h-[80px] p-2 border border-input bg-background rounded-md text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddTaskDialog(false)
                  setNewTaskTitle('')
                  setNewTaskDescription('')
                  setSelectedSubProblem(null)
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={createTask}
                disabled={!newTaskTitle.trim() || isCreatingTask}
              >
                {isCreatingTask ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Edit Dialog */}
      <Dialog open={showTaskEditDialog} onOpenChange={setShowTaskEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-task-title">Task Title</Label>
                <Input
                  id="edit-task-title"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  placeholder="Enter task title..."
                />
              </div>
              <div>
                <Label htmlFor="edit-task-description">Description (optional)</Label>
                <textarea
                  id="edit-task-description"
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  placeholder="Enter task description..."
                  className="w-full min-h-[80px] p-2 border border-input bg-background rounded-md text-sm"
                />
              </div>
              <div>
                <Label>Status</Label>
                <RadioGroup 
                  value={editingTask.status} 
                  onValueChange={(value) => setEditingTask({ ...editingTask, status: value as 'pending' | 'in_progress' | 'completed' })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pending" id="edit-pending" />
                    <Label htmlFor="edit-pending">Pending</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="in_progress" id="edit-in-progress" />
                    <Label htmlFor="edit-in-progress">In Progress</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="completed" id="edit-completed" />
                    <Label htmlFor="edit-completed">Completed</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowTaskEditDialog(false)
                    setEditingTask(null)
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={updateTask}
                  disabled={!editingTask.title.trim() || isUpdatingTask}
                >
                  {isUpdatingTask ? 'Updating...' : 'Update Task'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
} 