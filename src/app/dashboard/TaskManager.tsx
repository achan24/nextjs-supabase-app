'use client';

import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import TaskTimer from '@/components/TaskTimer'

interface Task {
  id: string
  title: string
  description: string | null
  priority: number
  status: 'pending' | 'in_progress' | 'completed'
  due_date: string | null
  created_at: string
  user_id: string
  tags?: Tag[]
  time_spent?: number // in seconds
  last_started_at?: string | null
}

interface Tag {
  id: string
  name: string
  color: string
  user_id: string
}

const isInProgress = (status: Task['status']): status is 'in_progress' => status === 'in_progress';

export default function TaskManager({ user }: { user: User }) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [hideCompleted, setHideCompleted] = useState(true)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 3,
    due_date: '',
    tagIds: [] as string[]
  })
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    priority: 3,
    due_date: '',
    tagIds: [] as string[]
  })
  const [newTag, setNewTag] = useState({
    name: '',
    color: '#3B82F6' // Default blue color
  })
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all')
  const [sortBy, setSortBy] = useState<'created' | 'priority'>('created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchTasks()
    fetchTags()
  }, [])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Fetch tags for each task
      const tasksWithTags = await Promise.all(
        (data || []).map(async (task) => {
          const { data: taskTags } = await supabase
            .from('task_tags')
            .select('tag_id')
            .eq('task_id', task.id)
          
          const tagIds = taskTags?.map(t => t.tag_id) || []
          
          // Get tag details
          const { data: tagData } = await supabase
            .from('tags')
            .select('id, name, color')
            .in('id', tagIds)
          
          return {
            ...task,
            tags: tagData || []
          }
        })
      )
      
      setTasks(tasksWithTags)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setError('Failed to fetch tasks')
    }
  }

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

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      // Create the task
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            title: newTask.title,
            description: newTask.description,
            priority: newTask.priority,
            due_date: newTask.due_date || null,
            user_id: user.id
          }
        ])
        .select()

      if (error) throw error
      
      // Add tags to the task
      if (data && data[0] && newTask.tagIds.length > 0) {
        const taskTags = newTask.tagIds.map(tagId => ({
          task_id: data[0].id,
          tag_id: tagId
        }))
        
        const { error: tagError } = await supabase
          .from('task_tags')
          .insert(taskTags)
        
        if (tagError) throw tagError
      }

      setNewTask({ title: '', description: '', priority: 3, due_date: '', tagIds: [] })
      setIsModalOpen(false)
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      setError('Failed to create task')
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
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
      due_date: task.due_date || '',
      tagIds: task.tags?.map(tag => tag.id) || []
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

  const handleEditTask = async () => {
    if (!editingTask) return;
    
    if (!editForm.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('tasks')
        .update({ 
          title: editForm.title, 
          description: editForm.description,
          priority: editForm.priority,
          due_date: editForm.due_date || null
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      // Update task tags
      const { error: tagError } = await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', editingTask.id);

      if (tagError) throw tagError;

      if (editForm.tagIds.length > 0) {
        const taskTags = editForm.tagIds.map(tagId => ({
          task_id: editingTask.id,
          tag_id: tagId
        }));
        
        const { error: insertTagError } = await supabase
          .from('task_tags')
          .insert(taskTags);
        
        if (insertTagError) throw insertTagError;
      }

      fetchTasks();
      setIsEditModalOpen(false);
      setEditingTask(null);
      setEditForm({ title: '', description: '', priority: 3, due_date: '', tagIds: [] });
    } catch (error) {
      console.error('Error updating task:', error);
      setError('Failed to update task');
    } finally {
      setIsLoading(false);
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
          <h2 className="text-2xl font-bold text-gray-900">Your Tasks</h2>
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
          {visibleTasks.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-500">No tasks found. Create a new task to get started.</p>
            </div>
          ) : (
            visibleTasks.map((task) => (
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
                      <p className={`text-gray-600 mt-1 ${
                        task.status === 'completed' ? 'line-through text-gray-400' : ''
                      }`}>
                        {task.description}
                      </p>
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
                        <span className={`text-sm ${
                          task.status === 'completed' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {/* Timer display logic */}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Time spent:</span>
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
                    
                    {/* Task Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {task.tags.map(tag => (
                          <span 
                            key={tag.id}
                            className={`px-2 py-1 rounded text-xs ${
                              task.status === 'completed' ? 'opacity-50' : ''
                            }`}
                            style={{ 
                              backgroundColor: `${tag.color}20`,
                              color: tag.color,
                              border: `1px solid ${tag.color}`
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={task.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value as Task['status']
                        try {
                          // Get the current accumulated time before any status change
                          const currentAccumulatedTime = task.time_spent || 0

                          if (newStatus === 'in_progress') {
                            // Starting or resuming a task
                            await supabase
                              .from('tasks')
                              .update({ 
                                status: newStatus,
                                last_started_at: new Date().toISOString(),
                                time_spent: currentAccumulatedTime // Preserve existing time
                              })
                              .eq('id', task.id)
                          } else {
                            // Moving to completed or pending - always preserve the time
                            await supabase
                              .from('tasks')
                              .update({ 
                                status: newStatus,
                                time_spent: currentAccumulatedTime,
                                last_started_at: null
                              })
                              .eq('id', task.id)
                          }
                          await fetchTasks() // Refresh the task list
                        } catch (error) {
                          console.error('Error updating task status:', error)
                          setError('Failed to update task status')
                        }
                      }}
                      className={`rounded border-gray-300 text-sm ${
                        task.status === 'completed' ? 'text-gray-500' : ''
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button
                      onClick={() => handleEditClick(task)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create New Task</h2>
            <input
              type="text"
              placeholder="Task Title"
              className="w-full mb-4 p-2 border rounded"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <textarea
              placeholder="Task Description (optional)"
              className="w-full mb-4 p-2 border rounded h-32"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                className="w-full p-2 border rounded"
              >
                <option value="1">1 - Highest</option>
                <option value="2">2 - High</option>
                <option value="3">3 - Medium</option>
                <option value="4">4 - Low</option>
                <option value="5">5 - Lowest</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date and Time (optional)
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="flex-1 p-2 border rounded"
                  value={newTask.due_date ? newTask.due_date.split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    const time = newTask.due_date ? newTask.due_date.split('T')[1] : '00:00';
                    setNewTask({ ...newTask, due_date: date ? `${date}T${time}` : '' });
                  }}
                />
                <input
                  type="time"
                  className="w-32 p-2 border rounded"
                  value={newTask.due_date ? newTask.due_date.split('T')[1].substring(0, 5) : '00:00'}
                  onChange={(e) => {
                    const date = newTask.due_date ? newTask.due_date.split('T')[0] : new Date().toISOString().split('T')[0];
                    setNewTask({ ...newTask, due_date: `${date}T${e.target.value}:00` });
                  }}
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <label key={tag.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newTask.tagIds.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewTask({ ...newTask, tagIds: [...newTask.tagIds, tag.id] })
                        } else {
                          setNewTask({ ...newTask, tagIds: newTask.tagIds.filter(id => id !== tag.id) })
                        }
                      }}
                      className="rounded"
                    />
                    <span 
                      className="px-2 py-1 rounded text-xs"
                      style={{ 
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        border: `1px solid ${tag.color}`
                      }}
                    >
                      {tag.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

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
      {isEditModalOpen && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Edit Task</h2>
            <input
              type="text"
              placeholder="Task Title"
              className="w-full mb-4 p-2 border rounded"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
            <textarea
              placeholder="Task Description (optional)"
              className="w-full mb-4 p-2 border rounded h-32"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) })}
                className="w-full p-2 border rounded"
              >
                <option value="1">1 - Highest</option>
                <option value="2">2 - High</option>
                <option value="3">3 - Medium</option>
                <option value="4">4 - Low</option>
                <option value="5">5 - Lowest</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date and Time (optional)
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="flex-1 p-2 border rounded"
                  value={editForm.due_date ? editForm.due_date.split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    const time = editForm.due_date ? editForm.due_date.split('T')[1] : '00:00';
                    setEditForm({ ...editForm, due_date: date ? `${date}T${time}` : '' });
                  }}
                />
                <input
                  type="time"
                  className="w-32 p-2 border rounded"
                  value={editForm.due_date ? editForm.due_date.split('T')[1].substring(0, 5) : '00:00'}
                  onChange={(e) => {
                    const date = editForm.due_date ? editForm.due_date.split('T')[0] : new Date().toISOString().split('T')[0];
                    setEditForm({ ...editForm, due_date: `${date}T${e.target.value}:00` });
                  }}
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <label key={tag.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editForm.tagIds.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditForm({ ...editForm, tagIds: [...editForm.tagIds, tag.id] })
                        } else {
                          setEditForm({ ...editForm, tagIds: editForm.tagIds.filter(id => id !== tag.id) })
                        }
                      }}
                      className="rounded"
                    />
                    <span 
                      className="px-2 py-1 rounded text-xs"
                      style={{ 
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        border: `1px solid ${tag.color}`
                      }}
                    >
                      {tag.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setEditingTask(null)
                  setEditForm({ title: '', description: '', priority: 3, due_date: '', tagIds: [] })
                  setIsEditModalOpen(false)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTask}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 