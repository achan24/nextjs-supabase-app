'use client';

import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import TaskTimer from '@/components/TaskTimer'
import Modal from '@/components/Modal'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { Reminder } from '@/types/task'
import { Label } from '@/components/ui/label'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Task {
  id?: string;
  title: string;
  description?: string;
  project_id?: string;
  status: 'todo' | 'in_progress' | 'completed';
  created_at?: string;
  updated_at?: string;
  priority: number;
  due_date: string | null;
  user_id: string;
  tags?: Tag[];
  time_spent?: number; // in seconds
  last_started_at?: string | null;
  is_starred?: boolean; // Legacy field
  is_starred_for_today?: boolean; // New field for today's tasks
  starred_at?: string | null;
  project?: {
    id: string;
    title: string;
  };
  reminders?: {
    type: 'before' | 'at';
    minutes_before?: number;
    time?: string;
  }[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
}

interface Project {
  id: string;
  title: string;
  deadline?: string;
  status: 'active' | 'completed';
}

interface TaskFormData {
  title: string;
  description: string;
  priority: number;
  due_date: string;
  tagIds: string[];
  project_id: string;
  status: 'todo' | 'in_progress' | 'completed';
  reminders: {
    type: 'before' | 'at';
    minutes_before?: number;
    time?: string;
  }[];
}

interface LifeGoal {
  id: string;
  title: string;
  description?: string;
  subarea?: {
    id: string;
    name: string;
    area?: {
      id: string;
      name: string;
    }
  }
}

const isInProgress = (status: Task['status']): status is 'in_progress' => status === 'in_progress';

export default function TaskManager({ user }: { user: User }) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task>({
    id: '',
    title: '',
    description: '',
    project_id: undefined,
    status: 'todo',
    priority: 3,
    due_date: null,
    user_id: user.id
  })
  const [hideCompleted, setHideCompleted] = useState(true)
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    priority: number;
    due_date: string;
    tagIds: string[];
    project_id: string;
    status: Task['status'];
    reminders: {
      type: 'before' | 'at';
      minutes_before?: number;
      time?: string;
    }[];
  }>({
    title: '',
    description: '',
    priority: 3,
    due_date: new Date().toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).slice(0, 16),
    tagIds: [],
    project_id: '',
    status: 'todo',
    reminders: []
  })
  const [newTaskForm, setNewTaskForm] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 1,
    due_date: new Date().toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).slice(0, 16),
    tagIds: [],
    project_id: '',
    status: 'todo',
    reminders: []
  })
  const [newTag, setNewTag] = useState({
    name: '',
    color: '#3B82F6' // Default blue color
  })
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all')
  const [sortBy, setSortBy] = useState<'created' | 'priority'>('priority')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isLinkingToLifeGoal, setIsLinkingToLifeGoal] = useState(false)
  const [selectedLifeGoal, setSelectedLifeGoal] = useState<string | null>(null)
  const [selectedTaskForLifeGoal, setSelectedTaskForLifeGoal] = useState<string | null>(null)
  const [selectedTaskTimeWorth, setSelectedTaskTimeWorth] = useState<number>(1)
  const [lifeGoals, setLifeGoals] = useState<LifeGoal[]>([])

  useEffect(() => {
    fetchTasks()
    fetchTags()
    fetchProjects()
    fetchLifeGoals()
  }, [])

  // Listen for task starring events and refresh data
  useEffect(() => {
    const handleTaskStarred = () => {
      console.log('[TaskManager] Task starred event received, refreshing tasks...')
      fetchTasks()
    }

    window.addEventListener('task-starred', handleTaskStarred)
    return () => window.removeEventListener('task-starred', handleTaskStarred)
  }, [])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      setError('Failed to fetch projects')
    }
  }

  const fetchTasks = async () => {
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_tags!left(
            tags(*)
          ),
          task_projects!left(project:projects(id, title)),
          reminders(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the tasks data to include tags and project info
      const transformedTasks = tasks.map(task => ({
        ...task,
        tags: task.task_tags?.map((t: { tags: Tag }) => t.tags) || [],
        project: task.task_projects?.[0]?.project || null,
        project_id: task.task_projects?.[0]?.project?.id || '',
        reminders: task.reminders || []
      }));

      setTasks(transformedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (error) throw error
      setTags(data || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
      setError('Failed to fetch tags')
    }
  }

  const fetchLifeGoals = async () => {
    const { data: goals, error } = await supabase
      .from('life_goals')
      .select(`
        *,
        subarea:life_goal_subareas (
          id,
          name,
          area:life_goal_areas (
            id,
            name
          )
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching life goals:', error);
      return;
    }

    setLifeGoals(goals || []);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert local time to UTC before saving
      const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localDueDate = new Date(newTaskForm.due_date);
      const utcDueDate = new Date(localDueDate.toLocaleString('en-US', { timeZone: 'UTC' }));

      const taskData: Task = {
        title: newTaskForm.title,
        description: newTaskForm.description || '',
        priority: newTaskForm.priority,
        due_date: utcDueDate.toISOString(),
        status: newTaskForm.status,
        user_id: user.id
      };

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;

      // Add reminders if any are set
      if (newTaskForm.reminders.length > 0) {
        const reminderData = newTaskForm.reminders.map(reminder => ({
          task_id: newTask.id,
          type: reminder.type,
          minutes_before: reminder.minutes_before,
          time: reminder.type === 'at' ? newTaskForm.due_date : null
        }));

        const { error: reminderError } = await supabase
          .from('reminders')
          .insert(reminderData);

        if (reminderError) throw reminderError;
      }

      // Add project relationship if a project is selected
      if (newTaskForm.project_id) {
        const { error: projectError } = await supabase
          .from('task_projects')
          .insert([{
            task_id: newTask.id,
            project_id: newTaskForm.project_id
          }]);
        
        if (projectError) throw projectError;
      }

      // Add tags if any are selected
      if (newTaskForm.tagIds.length > 0) {
        const taskTags = newTaskForm.tagIds.map(tagId => ({
          task_id: newTask.id,
          tag_id: tagId
        }));
        
        const { error: tagError } = await supabase
          .from('task_tags')
          .insert(taskTags);
        
        if (tagError) throw tagError;
      }

      setTasks([...tasks, newTask]);
      setNewTaskForm({
        title: '',
        description: '',
        priority: 1,
        due_date: new Date().toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).slice(0, 16),
        tagIds: [],
        project_id: '',
        status: 'todo',
        reminders: []
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTag.name.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([
          {
            name: newTag.name,
            color: newTag.color,
            user_id: user.id
          }
        ])
        .select()

      if (error) throw error

      setNewTag({ name: '', color: '#3B82F6' })
      setIsTagModalOpen(false)
      fetchTags()
    } catch (error) {
      console.error('Error creating tag:', error)
      setError('Failed to create tag')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTaskStatus = async (taskId: string | undefined, newStatus: Task['status']) => {
    if (!taskId) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error updating task status:', error)
      setError('Failed to update task status')
    }
  }

  const handleAddTagToTask = async (taskId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('task_tags')
        .insert([{ task_id: taskId, tag_id: tagId }])

      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error adding tag to task:', error)
      setError('Failed to add tag to task')
    }
  }

  const handleRemoveTagFromTask = async (taskId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', taskId)
        .eq('tag_id', tagId)

      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error removing tag from task:', error)
      setError('Failed to remove tag from task')
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    try {
      // First delete all task_tags relationships
      const { error: relationshipError } = await supabase
        .from('task_tags')
        .delete()
        .eq('tag_id', tagId)

      if (relationshipError) throw relationshipError

      // Then delete the tag
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)

      if (error) throw error
      fetchTags()
      fetchTasks()
    } catch (error) {
      console.error('Error deleting tag:', error)
      setError('Failed to delete tag')
    }
  }

  const handleEditClick = (task: Task) => {
    setEditingTask(task)
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      tagIds: task.tags?.map(tag => tag.id) || [],
      project_id: task.project_id || '',
      status: task.status,
      reminders: task.reminders || []
    })
    setIsEditModalOpen(true)
  }

  const toggleTagFilter = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId))
    } else {
      setSelectedTags([...selectedTags, tagId])
    }
  }

  const filteredTasks = selectedTags.length > 0
    ? tasks.filter(task => 
        task.tags?.some(tag => selectedTags.includes(tag.id))
      )
    : tasks

  // Apply hide completed filter
  const visibleTasks = hideCompleted
    ? filteredTasks.filter(task => task.status !== 'completed')
    : filteredTasks

  // Add sorting logic before the visibleTasks mapping
  const sortedTasks = [...visibleTasks]
    .sort((a, b) => {
      // First sort by starred status
      if (a.is_starred && !b.is_starred) return -1;
      if (!a.is_starred && b.is_starred) return 1;
      
      // Then apply existing sorting logic
      if (sortBy === 'priority') {
        return sortOrder === 'asc' 
          ? a.priority - b.priority
          : b.priority - a.priority;
      } else {
        return sortOrder === 'asc'
          ? new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          : new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    })

  const handleEditTask = async () => {
    if (!editingTask || !editForm.title.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      console.log('Updating task with data:', {
        title: editForm.title,
        description: editForm.description || null,
        priority: editForm.priority,
        due_date: editForm.due_date || null
      });

      // Update the task
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          title: editForm.title,
          description: editForm.description || null,
          priority: editForm.priority,
          due_date: editForm.due_date || null
        })
        .eq('id', editingTask.id)

      if (taskError) {
        console.error('Error updating task:', taskError);
        throw taskError;
      }

      console.log('Updating project relationship:', {
        task_id: editingTask.id,
        project_id: editForm.project_id
      });

      // Update task-project relationship
      // First, remove any existing project relationship
      const { error: deleteProjectError } = await supabase
        .from('task_projects')
        .delete()
        .eq('task_id', editingTask.id)

      if (deleteProjectError) {
        console.error('Error deleting existing project relationship:', deleteProjectError);
        throw deleteProjectError;
      }

      // Then add the new project relationship if a project is selected
      if (editForm.project_id) {
        const { error: projectError } = await supabase
          .from('task_projects')
          .insert([{
            task_id: editingTask.id,
            project_id: editForm.project_id
          }])
        
        if (projectError) {
          console.error('Error adding new project relationship:', projectError);
          throw projectError;
        }
      }

      // Update task tags
      // First, remove all existing tags
      const { error: deleteTagsError } = await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', editingTask.id)

      if (deleteTagsError) {
        console.error('Error deleting existing tags:', deleteTagsError);
        throw deleteTagsError;
      }

      // Then add the new tags
      if (editForm.tagIds.length > 0) {
        const taskTags = editForm.tagIds.map(tagId => ({
          task_id: editingTask.id,
          tag_id: tagId
        }))
        
        const { error: tagError } = await supabase
          .from('task_tags')
          .insert(taskTags)
        
        if (tagError) {
          console.error('Error adding new tags:', tagError);
          throw tagError;
        }
      }

      // Update reminders: remove all, then insert current
      const { error: deleteRemindersError } = await supabase
        .from('reminders')
        .delete()
        .eq('task_id', editingTask.id);
      if (deleteRemindersError) {
        console.error('Error deleting existing reminders:', deleteRemindersError);
        throw deleteRemindersError;
      }
      if (editForm.reminders.length > 0) {
        const reminderData = editForm.reminders.map(reminder => ({
          task_id: editingTask.id,
          type: reminder.type,
          minutes_before: reminder.minutes_before,
          time: reminder.type === 'at' ? editForm.due_date : null
        }));
        const { error: insertRemindersError } = await supabase
          .from('reminders')
          .insert(reminderData);
        if (insertRemindersError) {
          console.error('Error inserting reminders:', insertRemindersError);
          throw insertRemindersError;
        }
      }

      setIsEditModalOpen(false)
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      setError('Failed to update task: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = (value: 'todo' | 'in_progress' | 'completed') => {
    setNewTaskForm(prev => ({
      ...prev,
      status: value
    }));
  };

  const toggleTaskTag = (tagId: string, formSetter: React.Dispatch<React.SetStateAction<TaskFormData>>) => {
    formSetter(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId],
      reminders: prev.reminders // Preserve the reminders array
    }));
  };

  const handleDeleteTask = async (taskId: string | undefined) => {
    if (!taskId) return;
    // Show custom modal instead of confirm()
    setDeleteConfirmId(taskId);
  };

  const confirmDeleteTask = async () => {
    if (!deleteConfirmId) return;
    try {
      // First delete task-tag relationships
      const { error: tagError } = await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', deleteConfirmId);
      if (tagError) throw tagError;
      // Delete task-project relationships
      const { error: projectError } = await supabase
        .from('task_projects')
        .delete()
        .eq('task_id', deleteConfirmId);
      if (projectError) throw projectError;
      // Finally delete the task
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', deleteConfirmId);
      if (error) throw error;
      // Update local state
      setTasks(tasks.filter(t => t.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Failed to delete task');
      setDeleteConfirmId(null);
    }
  };

  const handleLinkToLifeGoal = async () => {
    if (!selectedTaskForLifeGoal || !selectedLifeGoal) return;

    try {
      const { error } = await supabase
        .from('life_goal_tasks')
        .insert({
          task_id: selectedTaskForLifeGoal,
          goal_id: selectedLifeGoal,
          time_worth: selectedTaskTimeWorth
        });

      if (error) throw error;

      setIsLinkingToLifeGoal(false);
      setSelectedTaskForLifeGoal(null);
      setSelectedLifeGoal(null);
      setSelectedTaskTimeWorth(1);
      toast.success('Task linked to goal successfully');
    } catch (error) {
      console.error('Error linking task to goal:', error);
      toast.error('Failed to link task to goal');
    }
  };

  const handleToggleStarred = async (taskId: string | undefined) => {
    if (!taskId) return;
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;

      const newStarredStatus = !taskToUpdate.is_starred_for_today;

      // Use the new database function for starring
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      const { error } = await supabase.rpc('toggle_task_star', {
        task_uuid: taskId,
        user_uuid: user.id,
        star_it: newStarredStatus
      });

      if (error) throw error;

      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, is_starred_for_today: newStarredStatus }
          : task
      ));

      toast.success(newStarredStatus ? 'Task added to today\'s list' : 'Task removed from today\'s list');
    } catch (error) {
      console.error('Error toggling star status:', error);
      toast.error('Failed to update star status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to Guardian Angel
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Task Manager</h1>
            <div className="w-24"></div> {/* Spacer for balance */}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Tasks</h2>
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created' | 'priority')}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="created">Sort by Date</option>
                <option value="priority">Sort by Priority</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 rounded hover:bg-gray-100"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="flex items-center mr-4">
              <input
                type="checkbox"
                id="hideCompleted"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="hideCompleted" className="text-sm text-gray-700">
                Hide Completed
              </label>
            </div>
            <button
              onClick={() => setIsTagModalOpen(true)}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Manage Tags
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Add New Task
            </button>
          </div>
        </div>

        {/* Tag Filters */}
        {tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by tags:</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTagFilter(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedTags.includes(tag.id)
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                  style={{ borderColor: tag.color }}
                >
                  {tag.name}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Apply sorting to visible tasks */}
          {sortedTasks.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-500">No tasks found. Create a new task to get started.</p>
            </div>
          ) : (
            sortedTasks.map((task) => (
              <div 
                key={task.id} 
                className={`bg-white p-4 rounded-lg shadow ${
                  task.status === 'completed' ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className={`text-xl font-semibold ${
                      task.status === 'completed' ? 'line-through text-gray-500' : ''
                    }`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="mt-1 text-gray-600">{task.description}</p>
                    )}
                    <div className="mt-2 flex items-center space-x-4">
                      <span className={`px-2 py-1 rounded text-sm ${
                        task.priority === 1 ? 'bg-red-100 text-red-800' :
                        task.priority === 2 ? 'bg-orange-100 text-orange-800' :
                        task.priority === 3 ? 'bg-yellow-100 text-yellow-800' :
                        task.priority === 4 ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        Priority {task.priority}
                      </span>
                      {task.due_date && (
                        <span className="text-sm text-gray-600">
                          Due: {new Date(task.due_date).toLocaleString('en-US', { 
                            month: 'numeric',
                            day: 'numeric',
                            year: '2-digit',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                          })}
                        </span>
                      )}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Time spent:</span>
                        <TaskTimer 
                          initialTime={task.time_spent || 0}
                          isRunning={task.status === 'in_progress'}
                          onTimeUpdate={async (time) => {
                            try {
                              const { error } = await supabase
                                .from('tasks')
                                .update({ 
                                  time_spent: time,
                                  last_started_at: task.status === 'in_progress' ? new Date().toISOString() : null
                                })
                                .eq('id', task.id)
                              if (error) throw error
                            } catch (error) {
                              console.error('Error updating task time:', error)
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as Task['status'])}
                      className="text-sm border rounded p-1"
                    >
                      <option value="todo">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button
                      onClick={() => handleToggleStarred(task.id)}
                      className={`text-xl focus:outline-none ${
                        task.is_starred_for_today 
                          ? 'text-yellow-400 hover:text-yellow-500' 
                          : 'text-gray-400 hover:text-gray-500'
                      }`}
                      title={task.is_starred_for_today ? 'Remove from today\'s list' : 'Add to today\'s list'}
                    >
                      {task.is_starred_for_today ? '★' : '☆'}
                    </button>
                    <button
                      onClick={() => handleEditClick(task)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (task.id) {
                          setSelectedTaskForLifeGoal(task.id);
                          setIsLinkingToLifeGoal(true);
                        }
                      }}
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Link to Life Goal
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Create New Task</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                placeholder="Task title"
                className="w-full p-2 mb-4 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newTaskForm.description}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                placeholder="Description"
                className="w-full p-2 mb-4 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={newTaskForm.priority}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: Number(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="1">High Priority</option>
                <option value="2">Medium-High Priority</option>
                <option value="3">Medium Priority</option>
                <option value="4">Medium-Low Priority</option>
                <option value="5">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Project</label>
              <select
                value={newTaskForm.project_id || ''}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, project_id: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">No Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date and Time</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={newTaskForm.due_date.split('T')[0]}
                  onChange={(e) => {
                    const currentTime = newTaskForm.due_date.split('T')[1] || '00:00';
                    setNewTaskForm({ 
                      ...newTaskForm, 
                      due_date: `${e.target.value}T${currentTime}` 
                    });
                  }}
                  className="w-full p-2 mb-4 border rounded"
                />
                <input
                  type="time"
                  value={newTaskForm.due_date.split('T')[1] || '00:00'}
                  onChange={(e) => {
                    const currentDate = newTaskForm.due_date.split('T')[0] || new Date().toISOString().split('T')[0];
                    setNewTaskForm({ 
                      ...newTaskForm, 
                      due_date: `${currentDate}T${e.target.value}` 
                    });
                  }}
                  className="w-full p-2 mb-4 border rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Reminders</label>
              <div className="space-y-2">
                {newTaskForm.reminders.map((reminder, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <select
                      value={reminder.type}
                      onChange={(e) => {
                        const updatedReminders = [...newTaskForm.reminders];
                        updatedReminders[index] = {
                          ...reminder,
                          type: e.target.value as 'before' | 'at'
                        };
                        setNewTaskForm({ ...newTaskForm, reminders: updatedReminders });
                      }}
                      className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="before">Before</option>
                      <option value="at">At</option>
                    </select>
                    {reminder.type === 'before' && (
                      <select
                        value={reminder.minutes_before}
                        onChange={(e) => {
                          const updatedReminders = [...newTaskForm.reminders];
                          updatedReminders[index] = {
                            ...reminder,
                            minutes_before: Number(e.target.value)
                          };
                          setNewTaskForm({ ...newTaskForm, reminders: updatedReminders });
                        }}
                        className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="5">5 minutes</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                        <option value="1440">1 day</option>
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const updatedReminders = newTaskForm.reminders.filter((_, i) => i !== index);
                        setNewTaskForm({ ...newTaskForm, reminders: updatedReminders });
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setNewTaskForm({
                      ...newTaskForm,
                      reminders: [...newTaskForm.reminders, { type: 'before', minutes_before: 30, time: '' }]
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Reminder
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <Select
                value={newTaskForm.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tags</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTaskTag(tag.id, setNewTaskForm)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      newTaskForm.tagIds.includes(tag.id)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                    type="button"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Task
            </button>
          </div>
        </div>
      </Modal>

      {/* Manage Tags Modal */}
      {isTagModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Manage Tags</h2>
            
            {/* Create New Tag */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-3">Create New Tag</h3>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  placeholder="Tag Name"
                  className="flex-1 p-2 border rounded"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                />
                <input
                  type="color"
                  value={newTag.color}
                  onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                  className="w-12 h-10 p-1 border rounded"
                />
              </div>
              <button
                onClick={handleCreateTag}
                disabled={isLoading || !newTag.name.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Tag'}
              </button>
            </div>
            
            {/* Existing Tags */}
            <div>
              <h3 className="text-lg font-medium mb-3">Your Tags</h3>
              {tags.length === 0 ? (
                <p className="text-gray-500 text-center py-4">You haven't created any tags yet.</p>
              ) : (
                <div className="space-y-2">
                  {tags.map(tag => (
                    <div key={tag.id} className="flex items-center justify-between p-2 border rounded">
                      <span 
                        className="px-2 py-1 rounded text-sm"
                        style={{ 
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          border: `1px solid ${tag.color}`
                        }}
                      >
                        {tag.name}
                      </span>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsTagModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Edit Task</h2>
          {editForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="1">High Priority</option>
                  <option value="2">Medium-High Priority</option>
                  <option value="3">Medium Priority</option>
                  <option value="4">Medium-Low Priority</option>
                  <option value="5">Low Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Project</label>
                <select
                  value={editForm.project_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">No Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date and Time</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={editForm.due_date.split('T')[0]}
                    onChange={(e) => {
                      const currentTime = editForm.due_date.split('T')[1] || '00:00';
                      setEditForm({ 
                        ...editForm, 
                        due_date: `${e.target.value}T${currentTime}` 
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <input
                    type="time"
                    value={editForm.due_date.split('T')[1] || '00:00'}
                    onChange={(e) => {
                      const currentDate = editForm.due_date.split('T')[0] || new Date().toISOString().split('T')[0];
                      setEditForm({ 
                        ...editForm, 
                        due_date: `${currentDate}T${e.target.value}` 
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Task['status'] })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="todo">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tags</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTaskTag(tag.id, setEditForm)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        editForm.tagIds.includes(tag.id)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      type="button"
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reminders</label>
                <div className="space-y-2">
                  {editForm.reminders.map((reminder, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <select
                        value={reminder.type}
                        onChange={(e) => {
                          const updatedReminders = [...editForm.reminders];
                          updatedReminders[index] = {
                            ...reminder,
                            type: e.target.value as 'before' | 'at'
                          };
                          setEditForm({ ...editForm, reminders: updatedReminders });
                        }}
                        className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="before">Before</option>
                        <option value="at">At</option>
                      </select>
                      {reminder.type === 'before' && (
                        <select
                          value={reminder.minutes_before}
                          onChange={(e) => {
                            const updatedReminders = [...editForm.reminders];
                            updatedReminders[index] = {
                              ...reminder,
                              minutes_before: Number(e.target.value)
                            };
                            setEditForm({ ...editForm, reminders: updatedReminders });
                          }}
                          className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="5">5 minutes</option>
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="60">1 hour</option>
                          <option value="120">2 hours</option>
                          <option value="1440">1 day</option>
                        </select>
                      )}
                      {reminder.type === 'at' && (
                        <input
                          type="time"
                          value={reminder.time ? new Date(reminder.time).toISOString().substring(11, 16) : ''}
                          onChange={(e) => {
                            const updatedReminders = [...editForm.reminders];
                            // Set the time as an ISO string for consistency
                            const date = editForm.due_date.split('T')[0];
                            updatedReminders[index] = {
                              ...reminder,
                              time: `${date}T${e.target.value}`
                            };
                            setEditForm({ ...editForm, reminders: updatedReminders });
                          }}
                          className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const updatedReminders = editForm.reminders.filter((_, i) => i !== index);
                          setEditForm({ ...editForm, reminders: updatedReminders });
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({
                        ...editForm,
                        reminders: [
                          ...editForm.reminders,
                          { type: 'before', minutes_before: 30, time: '' } // Add time property for type safety
                        ]
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Reminder
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEditTask}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Update Task
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Delete Task</h2>
            <p className="mb-4 text-gray-600">Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Link to Life Goal Dialog */}
      <Dialog open={isLinkingToLifeGoal} onOpenChange={setIsLinkingToLifeGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Task to Life Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Goal</Label>
              <Select
                value={selectedLifeGoal || ''}
                onValueChange={(value: string) => {
                  if (value === '') {
                    setSelectedLifeGoal(null);
                  } else {
                    setSelectedLifeGoal(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a goal" />
                </SelectTrigger>
                <SelectContent>
                  {lifeGoals.map(goal => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.subarea?.area?.name} › {goal.subarea?.name} › {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time Worth Multiplier</Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={selectedTaskTimeWorth}
                onChange={(e) => setSelectedTaskTimeWorth(parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                How much should this task count towards the goal's metrics?
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsLinkingToLifeGoal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkToLifeGoal}
              disabled={!selectedLifeGoal}
            >
              Link to Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 