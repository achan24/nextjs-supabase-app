'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { User } from '@supabase/auth-helpers-nextjs';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import * as Tabs from '@radix-ui/react-tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { 
  Project, 
  Task, 
  Goal, 
  Target, 
  ProjectTargetLink, 
  ProjectNodeLink, 
  ProjectNoteLink, 
  Note,
  NewTask,
  ProcessFlow,
  EditedGoalData,
  ProcessFlowNode
} from './types';

interface ProjectViewProps {
  project: Project;
  user: User;
}

export default function ProjectView({ project: initialProject, user }: ProjectViewProps) {
  console.log('Initial Project Data:', initialProject);
  console.log('Initial Project Notes:', initialProject.project_notes);
  
  // Move state initialization to useEffect
  const [project, setProject] = useState<Project>(() => ({
    ...initialProject,
    project_targets: initialProject.project_targets || []
  }));

  const [tasks, setTasks] = useState<Task[]>(initialProject.tasks || []);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isLinkingNode, setIsLinkingNode] = useState(false);
  const [availableNodes, setAvailableNodes] = useState<Node[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [linkDescription, setLinkDescription] = useState('');
  const [newTask, setNewTask] = useState<NewTask>({
    title: '',
    description: '',
    status: 'todo',
    priority: 2,
    due_date: new Date().toISOString().slice(0, 16)
  });
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    title: '',
    description: '',
    status: 'not_started',
    target_date: new Date().toISOString().slice(0, 16),
    goal_target_links: []
  });
  const [activeTab, setActiveTab] = useState('kanban');
  const [timeData, setTimeData] = useState<any[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [flows, setFlows] = useState<ProcessFlow[]>([]);
  const [nodesInFlow, setNodesInFlow] = useState<any[]>([]);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [selectedGoalForTask, setSelectedGoalForTask] = useState<string | null>(null);
  const [selectedTaskTimeWorth, setSelectedTaskTimeWorth] = useState<number>(1);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [isAttachingTask, setIsAttachingTask] = useState(false);

  // Add new state for note linking
  const [isLinkingNote, setIsLinkingNote] = useState(false);
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');

  // Add new state for note content preview
  const [showFullContent, setShowFullContent] = useState<string | null>(null);

  const [noteOrder, setNoteOrder] = useState<string[]>([]);  // Add this state for note order

  // Add nodeOrder state
  const [nodeOrder, setNodeOrder] = useState<string[]>([]);

  const [editedGoalData, setEditedGoalData] = useState<EditedGoalData | null>(null);

  // Add new state for metric management
  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [newTarget, setNewTarget] = useState<{
    title: string;
    description: string;
    target_value: number;
    unit: string;
    target_type: 'count' | 'percentage' | 'time' | 'custom';
  }>({
    title: '',
    description: '',
    target_value: 0,
    unit: 'count',
    target_type: 'count'
  });

  // Add new state for task selection
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Add new state for linking goals
  const [isLinkingGoal, setIsLinkingGoal] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchTimeData();
  }, []);

  const fetchTimeData = async () => {
    // Get the last 7 days of time data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Only proceed if we have tasks
    if (!tasks?.length) {
      setTimeData([]);
      return;
    }

    const taskIds = tasks.map(t => t?.id).filter(Boolean);
    if (!taskIds.length) {
      setTimeData([]);
      return;
    }

    const { data, error } = await supabase
      .from('task_time_entries')
      .select('duration, created_at')
      .in('task_id', taskIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      console.error('Error fetching time data:', error);
      return;
    }

    // Group by day
    const timeByDay = (data || []).reduce((acc: any, entry: any) => {
      const date = new Date(entry.created_at).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date] += entry.duration;
      return acc;
    }, {});

    // Convert to chart data
    const chartData = Object.entries(timeByDay).map(([date, duration]) => ({
      date,
      hours: Number(duration) / (60 * 60) // Convert seconds to hours
    }));

    setTimeData(chartData);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    // Update task status in state
    const newTasks = [...tasks];
    const task = newTasks.find(t => t.id === draggableId);
    if (task) {
      task.status = destination.droppableId as 'todo' | 'in_progress' | 'completed';
      setTasks(newTasks);

      // Update in database
      await supabase
        .from('tasks')
        .update({ status: task.status })
        .eq('id', task.id);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title) return;

    try {
      // Create the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          priority: newTask.priority,
          due_date: newTask.due_date,
          user_id: user.id
        }])
        .select()
        .single();

      if (taskError) {
        console.error('Error creating task:', taskError);
        return;
      }

      // Link the task to the project
      const { error: linkError } = await supabase
        .from('task_projects')
        .insert([{
          task_id: task.id,
          project_id: project.id
        }]);

      if (linkError) {
        console.error('Error linking task to project:', linkError);
        return;
      }

      // Add the new task to the state
      setTasks([...tasks, task]);
      
      // Reset form and close dialog
      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 2,
        due_date: new Date().toISOString().slice(0, 16)
      });
      setIsAddingTask(false);
    } catch (error) {
      console.error('Error in handleAddTask:', error);
    }
  };

  const handleAddGoal = async () => {
    if (!newGoal.title || !newGoal.target_date) return;

    try {
      const { data: goal, error } = await supabase
        .from('goals')
        .insert([{
          title: newGoal.title,
          description: newGoal.description || '',
          target_date: newGoal.target_date,
          status: newGoal.status || 'not_started',
          project_id: project.id,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding goal:', error);
        return;
      }

      // Update the project state with the new goal
      setProject({
        ...project,
        goals: [...project.goals, { ...goal, goal_target_links: [] }]
      });

      // Reset the form
      setNewGoal({
        title: '',
        description: '',
        status: 'not_started',
        target_date: new Date().toISOString().slice(0, 16),
        goal_target_links: []
      });
      
      // Close the dialog
      setIsAddingGoal(false);
    } catch (error) {
      console.error('Error in handleAddGoal:', error);
    }
  };

  const getTasksByStatus = (status: Task['status']) => {
    if (!tasks?.length) return [];
    return tasks.filter(task => task && task.status === status);
  };

  const getTargetProgress = (target: Target) => {
    return (target.current_value / target.target_value) * 100;
  };

  const fetchAvailableNodes = async () => {
    const { data: nodes, error } = await supabase
      .from('nodes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching nodes:', error);
      return;
    }

    setAvailableNodes(nodes || []);
  };

  const handleLinkNode = async () => {
    if (!selectedFlowId || !selectedNodeId) return;

    try {
      // Get the current max display_order
      const currentMaxOrder = project.project_node_links.reduce((max, link) => 
        Math.max(max, link.display_order || 0), -1);

      // Try to insert the link with the next display_order
      const { data: newLink, error: insertError } = await supabase
        .from('project_node_links')
        .insert([{
          project_id: project.id,
          linked_flow_id: selectedFlowId,
          linked_node_id: selectedNodeId,
          description: linkDescription,
          user_id: user.id,
          display_order: currentMaxOrder + 1
        }])
        .select(`
          id,
          project_id,
          linked_flow_id,
          linked_node_id,
          description,
          created_at,
          user_id,
          display_order,
          flow:process_flows(
            id,
            title,
            nodes
          )
        `)
        .single();

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          console.error('This node is already linked to this project');
        } else {
          console.error('Error linking node:', insertError);
        }
        return;
      }

      // Update the project state with the new link
      if (newLink && newLink.flow?.[0]) {
        const linkedNode = newLink.flow[0].nodes.find((n: any) => n.id === newLink.linked_node_id);
        if (!linkedNode) {
          console.error('Could not find linked node in flow');
          return;
        }

        const formattedLink: ProjectNodeLink = {
          id: newLink.id,
          project_id: newLink.project_id,
          linked_flow_id: newLink.linked_flow_id,
          linked_node_id: newLink.linked_node_id,
          description: newLink.description || undefined,
          created_at: newLink.created_at,
          user_id: newLink.user_id,
          display_order: newLink.display_order,
          flow: {
            id: newLink.flow[0].id,
            title: newLink.flow[0].title
          },
          node: {
            id: linkedNode.id,
            data: linkedNode.data
          }
        };

        setProject(prev => ({
          ...prev,
          project_node_links: [...(prev.project_node_links || []), formattedLink]
        }));

        // Update nodeOrder state
        setNodeOrder(prev => [...prev, formattedLink.id]);
      }

      setIsLinkingNode(false);
      setSelectedFlowId('');
      setSelectedNodeId('');
      setLinkDescription('');
    } catch (error) {
      console.error('Error in handleLinkNode:', error);
    }
  };

  const handleUnlinkNode = async (linkId: string) => {
    const { error } = await supabase
      .from('project_node_links')
      .delete()
      .eq('id', linkId);

    if (error) {
      console.error('Error unlinking node:', error);
      return;
    }

    setProject({
      ...project,
      project_node_links: project.project_node_links.filter(link => link.id !== linkId)
    });
  };

  // Fetch flows when dialog opens
  useEffect(() => {
    if (isLinkingNode) {
      supabase
        .from('process_flows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching flows:', error);
            return;
          }
          setFlows(data || []);
        });
    }
  }, [isLinkingNode, user.id]);

  // Fetch nodes when flow is selected
  useEffect(() => {
    if (selectedFlowId) {
      supabase
        .from('process_flows')
        .select(`
          id,
          title,
          nodes
        `)
        .eq('id', selectedFlowId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching flow nodes:', error);
            return;
          }
          setNodesInFlow(data?.nodes || []);
        });
    } else {
      setNodesInFlow([]);
    }
  }, [selectedFlowId]);

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleEditGoal = async (goalId: string, updatedGoal: Partial<Goal>) => {
    try {
      const { data: goal, error } = await supabase
        .from('goals')
        .update(updatedGoal)
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;

      setProject({
        ...project,
        goals: project.goals.map(g => g.id === goalId ? { ...g, ...goal } : g)
      });
      setEditingGoal(null);
      setEditedGoalData(null);
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const handleAttachTaskToGoal = async (taskId: string, goalId: string, timeWorth: number) => {
    try {
      const { data: goalTask, error } = await supabase
        .from('goal_tasks')
        .insert([{
          task_id: taskId,
          goal_id: goalId,
          time_worth: timeWorth
        }])
        .select()
        .single();

      if (error) throw error;

      // Update the project state with the new goal task
      setProject({
        ...project,
        goals: project.goals.map(g => {
          if (g.id === goalId) {
            return {
              ...g,
              goal_tasks: [...(g.goal_tasks || []), goalTask]
            };
          }
          return g;
        })
      });
    } catch (error) {
      console.error('Error attaching task to goal:', error);
    }
  };

  const handleEditTask = async (taskId: string, updates: Partial<Task>) => {
    setProject((prev: Project) => ({
      ...prev,
      tasks: prev.tasks.map(t => 
        t.id === taskId ? { ...t, ...updates } : t
      )
    }));

    // Update in database
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task:', error);
    }
  };

  // Add fetchAvailableNotes function
  const fetchAvailableNotes = async () => {
    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    setAvailableNotes(notes || []);
  };

  // Update handleLinkNote function
  const handleLinkNote = async () => {
    if (!selectedNoteId) return;

    try {
      const { data: link, error } = await supabase
        .from('project_note_links')
        .insert([{
          project_id: project.id,
          note_id: selectedNoteId,
          user_id: user.id
        }])
        .select(`
          id,
          project_id,
          note_id,
          created_at,
          user_id,
          note:notes(
            id,
            title,
            content,
            created_at,
            updated_at,
            tags,
            user_id
          )
        `)
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          console.error('This note is already linked to this project');
        } else {
          console.error('Error linking note:', error);
        }
        return;
      }

      if (link && link.note) {
        const noteData = Array.isArray(link.note) ? link.note[0] : link.note;
        if (noteData) {
          const formattedLink: ProjectNoteLink = {
            id: link.id,
            project_id: link.project_id,
            note_id: link.note_id,
            note: noteData,
            created_at: link.created_at,
            user_id: link.user_id,
            display_order: project.project_notes.length
          };

          setProject(prev => ({
            ...prev,
            project_notes: [...(prev.project_notes || []), formattedLink]
          }));
        }
      }

      setIsLinkingNote(false);
      setSelectedNoteId('');
    } catch (error) {
      console.error('Error in handleLinkNote:', error);
    }
  };

  // Add handleUnlinkNote function
  const handleUnlinkNote = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('project_note_links')
        .delete()
        .eq('id', linkId);

      if (error) {
        console.error('Error unlinking note:', error);
        return;
      }

      setProject(prev => ({
        ...prev,
        project_notes: prev.project_notes.filter(link => link.id !== linkId)
      }));
    } catch (error) {
      console.error('Error in handleUnlinkNote:', error);
    }
  };

  // Initialize note order when project changes
  useEffect(() => {
    if (project.project_notes) {
      // Sort notes by display_order
      const sortedNotes = [...project.project_notes].sort((a, b) => {
        const orderA = a.display_order || 0;
        const orderB = b.display_order || 0;
        return orderA - orderB;
      });
      setNoteOrder(sortedNotes.map(note => note.id));
    }
  }, [project.project_notes]);

  // Update handleNoteReorder function to persist the order
  const handleNoteReorder = async (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const newOrder = Array.from(noteOrder);
    const [removed] = newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, removed);

    // Update the state
    setNoteOrder(newOrder);

    // Update the project state
    setProject((prev: Project) => ({
      ...prev,
      project_notes: newOrder.map((id, index) => {
        const note = prev.project_notes.find(n => n.id === id);
        return note ? { ...note, display_order: index } : note!;
      }).filter(Boolean)
    }));

    // Update in database
    try {
      await Promise.all(
        newOrder.map((id, index) =>
          supabase
            .from('project_note_links')
            .update({ display_order: index })
            .eq('id', id)
        )
      );
    } catch (error) {
      console.error('Error updating note order:', error);
    }
  };

  // Initialize node order when project changes
  useEffect(() => {
    if (project.project_node_links) {
      // Sort nodes by display_order
      const sortedNodes = [...project.project_node_links].sort((a, b) => {
        const orderA = a.display_order || 0;
        const orderB = b.display_order || 0;
        return orderA - orderB;
      });
      setNodeOrder(sortedNodes.map(node => node.id));
    }
  }, [project.project_node_links]);

  // Add handleNodeReorder function
  const handleNodeReorder = async (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const newOrder = Array.from(nodeOrder);
    const [removed] = newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, removed);

    // Update the state
    setNodeOrder(newOrder);

    // Update the project state
    setProject((prev: Project) => ({
      ...prev,
      project_node_links: newOrder.map((id, index) => {
        const link = prev.project_node_links.find(l => l.id === id);
        return link ? { ...link, display_order: index } : link!;
      }).filter(Boolean)
    }));

    // Update in database
    try {
      await Promise.all(
        newOrder.map((id, index) =>
          supabase
            .from('project_node_links')
            .update({ display_order: index })
            .eq('id', id)
        )
      );
    } catch (error) {
      console.error('Error updating node order:', error);
    }
  };

  // Add function to handle target creation
  const handleAddTarget = async (goalId: string) => {
    try {
      const { data: target, error } = await supabase
        .from('targets')
        .insert([{
          title: newTarget.title,
          description: newTarget.description,
          target_value: newTarget.target_value,
          current_value: 0,
          unit: newTarget.unit,
          target_type: newTarget.target_type,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Create the goal-target link
      const { data: link, error: linkError } = await supabase
        .from('goal_target_links')
        .insert([{
          goal_id: goalId,
          target_id: target.id,
          user_id: user.id
        }])
        .select()
        .single();

      if (linkError) throw linkError;

      // Update the project state with the new target and link
      setProject(prev => ({
        ...prev,
        project_targets: [...(prev.project_targets || []), { ...link, target }],
        goals: prev.goals.map(g => {
          if (g.id === goalId) {
            return {
              ...g,
              goal_target_links: [...(g.goal_target_links || []), { ...link, target }]
            };
          }
          return g;
        })
      }));

      // Reset form and close dialog
      setNewTarget({
        title: '',
        description: '',
        target_value: 0,
        unit: 'count',
        target_type: 'count'
      });
      setIsAddingTarget(false);
    } catch (error) {
      console.error('Error adding target:', error);
    }
  };

  // Add handleAddTargetTask function
  const handleAddTargetTask = async (targetId: string, taskId: string, contributionValue: number) => {
    try {
      const { data: targetTask, error } = await supabase
        .from('target_tasks')
        .insert([{
          target_id: targetId,
          task_id: taskId,
          contribution_value: contributionValue
        }])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setProject(prev => ({
        ...prev,
        project_targets: prev.project_targets.map(t => 
          t.id === targetId && tasks.find(task => task.id === taskId)?.status === 'completed'
            ? { ...t, target: { ...t.target, current_value: t.target.current_value + contributionValue } }
            : t
        )
      }));
    } catch (error) {
      console.error('Error adding target task:', error);
    }
  };

  // Update fetchProjectData function
  const fetchProjectData = async () => {
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        goals (
          id,
          title,
          description,
          target_date,
          status,
          goal_tasks (
            id,
            task_id,
            time_worth
          ),
          goal_target_links (
            id,
            target:targets (
              id,
              title,
              description,
              target_value,
              current_value,
              unit,
              target_type,
              created_at,
              updated_at,
              target_tasks (
                id,
                task_id,
                contribution_value
              ),
              goal_target_links (
                id,
                goal_id
              )
            )
          )
        ),
        tasks:task_projects (
          task:tasks (
            id,
            title,
            description,
            priority,
            due_date,
            status
          )
        ),
        project_node_links (
          id,
          project_id,
          linked_flow_id,
          linked_node_id,
          description,
          created_at,
          user_id,
          display_order,
          flow:process_flows (
            id,
            title,
            nodes
          )
        ),
        project_notes:project_note_links (
          id,
          project_id,
          note_id,
          created_at,
          user_id,
          display_order,
          note:notes (
            id,
            title,
            content,
            created_at,
            updated_at,
            tags,
            user_id
          )
        )
      `)
      .eq('id', project.id)
      .single();

    if (projectError) {
      console.error('Error fetching project data:', projectError);
      return;
    }

    // Create a map of all unique targets from goal_target_links
    const targetsMap = new Map<string, ProjectTargetLink>();
    projectData.goals.forEach((goal: any) => {
      goal.goal_target_links?.forEach((link: any) => {
        if (link.target && !targetsMap.has(link.target.id)) {
          targetsMap.set(link.target.id, {
            id: link.id,
            target: {
              ...link.target,
              goal_target_links: link.target.goal_target_links || []
            }
          });
        }
      });
    });

    // Transform the data to match our interfaces
    const transformedProject: Project = {
      ...projectData,
      goals: projectData.goals.map((goal: any) => ({
        ...goal,
        goal_target_links: goal.goal_target_links || []
      })),
      tasks: projectData.tasks.map((t: any) => t.task),
      project_targets: Array.from(targetsMap.values()),
      project_node_links: (projectData.project_node_links || []).map((link: any) => {
        const nodeData = link.flow?.nodes?.find((n: any) => n.id === link.linked_node_id);
        return {
          ...link,
          flow: {
            id: link.flow?.id,
            title: link.flow?.title
          },
          node: nodeData ? {
            id: nodeData.id,
            data: nodeData.data
          } : null
        };
      }).filter((link: any) => link.node !== null),
      project_notes: (projectData.project_notes || []).map((link: any) => ({
        ...link,
        note: link.note
      }))
    };

    console.log('Transformed project data:', transformedProject);
    setProject(transformedProject);
    setTasks(transformedProject.tasks);

    // Update the node and note orders
    if (transformedProject.project_node_links?.length) {
      const sortedNodes = [...transformedProject.project_node_links].sort((a, b) => {
        const orderA = a.display_order || 0;
        const orderB = b.display_order || 0;
        return orderA - orderB;
      });
      setNodeOrder(sortedNodes.map(node => node.id));
    }

    if (transformedProject.project_notes?.length) {
      const sortedNotes = [...transformedProject.project_notes].sort((a, b) => {
        const orderA = a.display_order || 0;
        const orderB = b.display_order || 0;
        return orderA - orderB;
      });
      setNoteOrder(sortedNotes.map(note => note.id));
    }
  };

  // Call fetchProjectData when component mounts
  useEffect(() => {
    fetchProjectData();
  }, []);

  // Move state initialization to useEffect
  useEffect(() => {
    if (initialProject) {
      // Transform the initial project data to include properly formatted node links
      const transformedProject: Project = {
        ...initialProject,
        tasks: initialProject.tasks || [],
        goals: initialProject.goals || [],
        project_targets: initialProject.project_targets || [],
        project_node_links: initialProject.project_node_links || [],
        project_notes: initialProject.project_notes || []
      };

      setProject(transformedProject);
      setTasks(transformedProject.tasks || []);
    }
  }, [initialProject]);

  // Add memoization for project data to prevent unnecessary re-renders
  const memoizedProject = useMemo(() => project, [project]);

  // Move the target finding logic to a memoized function
  const findTargetById = useCallback((targetId: string): Target | undefined => {
    return (project?.project_targets || []).find(link => link.id === targetId)?.target;
  }, [project?.project_targets]);

  // Update setProject usage to always maintain project_targets as an array
  const updateProject = useCallback((updater: Project | ((prev: Project) => Project)) => {
    setProject(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return {
        ...next,
        project_targets: next.project_targets || []
      };
    });
  }, []);

  // Update the goals filtering logic to handle empty project_targets
  const availableGoals = useMemo(() => {
    // If no target is selected, return all goals
    if (!selectedTargetId) return project.goals || [];
    
    // If project_targets is undefined or empty, return all goals
    if (!project?.project_targets?.length) return project.goals || [];
    
    const selectedTarget = project.project_targets.find(t => t.id === selectedTargetId);
    if (!selectedTarget?.target) return project.goals || [];
    
    return (project.goals || []).filter(goal => {
      if (!selectedTarget.target.goal_target_links?.length) return true;
      return !selectedTarget.target.goal_target_links.some(link => link.goal_id === goal.id);
    });
  }, [project?.goals, selectedTargetId, project?.project_targets]);

  // Add a consistent date formatting function
  const formatDate = (date: string | Date) => {
    return format(new Date(date), 'MMM d, yyyy');
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard/projects" 
            className="text-blue-600 hover:text-blue-800 mb-4 block text-sm"
          >
            ← Back to Projects
          </Link>
          <div className="flex justify-between items-start">
            <h1 className="text-4xl font-bold text-gray-900">{project.title}</h1>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsAddingTask(true)}
                className="font-medium"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Task
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsAddingGoal(true)}
                className="font-medium"
              >
                Add Goal
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  fetchAvailableNodes();
                  setIsLinkingNode(true);
                }}
                className="font-medium flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Link Node
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  fetchAvailableNotes();
                  setIsLinkingNote(true);
                }}
                className="font-medium flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Link Note
              </Button>
            </div>
          </div>
          {project.description && (
            <p className="text-gray-600 mt-2">{project.description}</p>
          )}
        </div>

        {/* Task Creation Dialog */}
        <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
          <DialogContent className="bg-white p-6 rounded-lg shadow-lg max-w-lg">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-semibold">Add New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                  className="mt-1 w-full h-24"
                />
              </div>
              <div>
                <Label htmlFor="priority" className="text-sm font-medium text-gray-700">Priority</Label>
                <Select
                  value={newTask.priority.toString()}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: parseInt(value) })}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="due_date" className="text-sm font-medium text-gray-700">Due Date</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="mt-1 w-full"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTask} disabled={!newTask.title}>
                Add Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Goal Creation Dialog */}
        <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
          <DialogContent className="bg-white rounded-lg shadow-lg max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-xl font-semibold">Add New Goal</DialogTitle>
            </DialogHeader>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 pt-2">
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">SMART Goal Guidelines</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Specific:</strong> Clear and precise objective</li>
                  <li>• <strong>Measurable:</strong> Quantifiable progress and outcome</li>
                  <li>• <strong>Achievable:</strong> Realistic and attainable</li>
                  <li>• <strong>Relevant:</strong> Aligned with project objectives</li>
                  <li>• <strong>Time-bound:</strong> Clear deadline or timeframe</li>
                </ul>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="goal-title" className="text-sm font-medium text-gray-700">Title</Label>
                  <Input
                    id="goal-title"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="e.g., Increase user engagement by 25%"
                    className="mt-1 w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-description" className="text-sm font-medium text-gray-700">Description</Label>
                  <Textarea
                    id="goal-description"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    placeholder="Describe the specific actions and steps needed to achieve this goal"
                    className="mt-1 w-full h-24"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-target-date" className="text-sm font-medium text-gray-700">Target Date</Label>
                  <Input
                    id="goal-target-date"
                    type="datetime-local"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                    className="mt-1 w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-status" className="text-sm font-medium text-gray-700">Initial Status</Label>
                  <Select
                    value={newGoal.status || 'not_started'}
                    onValueChange={(value) => setNewGoal({ ...newGoal, status: value as Goal['status'] })}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="border-t p-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsAddingGoal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddGoal} 
                disabled={!newGoal.title || !newGoal.target_date}
              >
                Add Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Main Content */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List className="flex border-b mb-4">
            <Tabs.Trigger 
              value="kanban"
              className="px-4 py-2 -mb-px text-sm font-medium data-[state=active]:bg-white"
            >
              Kanban Board
            </Tabs.Trigger>
            <Tabs.Trigger 
              value="goals"
              className="px-4 py-2 -mb-px text-sm font-medium data-[state=active]:bg-white"
            >
              Goals
            </Tabs.Trigger>
            <Tabs.Trigger 
              value="targets"
              className="px-4 py-2 -mb-px text-sm font-medium data-[state=active]:bg-white"
            >
              Targets
            </Tabs.Trigger>
            <Tabs.Trigger 
              value="metrics"
              className="px-4 py-2 -mb-px text-sm font-medium data-[state=active]:bg-white"
            >
              Metrics
            </Tabs.Trigger>
            <Tabs.Trigger 
              value="nodes"
              className="px-4 py-2 -mb-px text-sm font-medium data-[state=active]:bg-white"
            >
              Linked Nodes
            </Tabs.Trigger>
            <Tabs.Trigger
              value="notes"
              className="px-4 py-2 -mb-px text-sm font-medium data-[state=active]:bg-white"
            >
              Notes
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="kanban" className="space-y-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-3 gap-4">
                {(['todo', 'in_progress', 'completed'] as const).map(status => (
                  <Droppable key={status} droppableId={status}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="bg-gray-100 rounded-lg p-4"
                      >
                        <h3 className="font-semibold mb-4 capitalize">{status.replace('_', ' ')}</h3>
                        {getTasksByStatus(status).map((task, index) => task && (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-white rounded-lg p-4 mb-2 shadow-sm"
                              >
                                <div className="flex justify-between items-start">
                                  {editingTask === task.id ? (
                                    <Input
                                      value={task.title}
                                      onChange={(e) => handleEditTask(task.id, { title: e.target.value })}
                                      className="mb-2"
                                    />
                                  ) : (
                                    <h4 className="font-medium">{task.title}</h4>
                                  )}
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                                    >
                                      {editingTask === task.id ? 'Save' : 'Edit'}
                                    </Button>
                                    <Dialog open={isAttachingTask && selectedTaskId === task.id} onOpenChange={(open) => {
                                      setIsAttachingTask(open);
                                      if (open) {
                                        setSelectedTaskId(task.id);
                                      } else {
                                        setSelectedTaskId(null);
                                        setSelectedGoalForTask(null);
                                        setSelectedTargetId(null);
                                        setSelectedTaskTimeWorth(1);
                                      }
                                    }}>
                                      <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <PlusCircle className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="bg-white border shadow-lg">
                                        <DialogHeader>
                                          <DialogTitle className="text-xl font-semibold text-gray-900">Attach Task to Goal</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Select Goal</Label>
                                            <Select
                                              value={selectedGoalForTask || ''}
                                              onValueChange={(value) => setSelectedGoalForTask(value)}
                                            >
                                              <SelectTrigger className="w-full bg-white border-gray-200">
                                                <SelectValue placeholder="Choose a goal" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {project.goals.map(currentGoal => (
                                                  <SelectItem key={currentGoal.id} value={currentGoal.id} className="text-gray-900">
                                                    {currentGoal.title}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          {selectedGoalForTask && (
                                            <div className="space-y-2">
                                              <Label className="text-sm font-medium text-gray-700">Select Target</Label>
                                              <Select
                                                value={selectedTargetId || ''}
                                                onValueChange={setSelectedTargetId}
                                              >
                                                <SelectTrigger className="w-full bg-white border-gray-200">
                                                  <SelectValue placeholder="Choose a target" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {(project.project_targets || [])
                                                    .filter(link => 
                                                      !link.target.goal_target_links?.some(gtLink => gtLink.goal_id === selectedGoalForTask)
                                                    )
                                                    .map(link => (
                                                      <SelectItem key={link.id} value={link.id} className="text-gray-900">
                                                        {link.target.title}
                                                      </SelectItem>
                                                    ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          )}
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Contribution Value</Label>
                                            <Input
                                              type="number"
                                              min="0.1"
                                              step="0.1"
                                              value={selectedTaskTimeWorth}
                                              onChange={(e) => setSelectedTaskTimeWorth(parseFloat(e.target.value))}
                                              className="w-full bg-white border-gray-200 text-gray-900"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                          <Button
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedTaskId(null);
                                              setSelectedGoalForTask(null);
                                              setSelectedTargetId(null);
                                              setSelectedTaskTimeWorth(1);
                                              setIsAttachingTask(false);
                                            }}
                                            className="bg-white text-gray-700 hover:bg-gray-50"
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            onClick={() => {
                                              if (selectedTaskId && selectedGoalForTask && selectedTargetId) {
                                                handleAddTargetTask(selectedTargetId, selectedTaskId, selectedTaskTimeWorth);
                                                setSelectedTaskId(null);
                                                setSelectedGoalForTask(null);
                                                setSelectedTargetId(null);
                                                setSelectedTaskTimeWorth(1);
                                                setIsAttachingTask(false);
                                              }
                                            }}
                                            disabled={!selectedGoalForTask || !selectedTargetId}
                                            className="bg-blue-600 text-white hover:bg-blue-700"
                                          >
                                            Attach to Goal
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </div>
                                {editingTask === task.id ? (
                                  <Textarea
                                    value={task.description || ''}
                                    onChange={(e) => handleEditTask(task.id, { description: e.target.value })}
                                    placeholder="Task description"
                                    className="mb-2 min-h-[60px]"
                                  />
                                ) : (
                                  task.description && (
                                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                  )
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  {editingTask === task.id ? (
                                    <Select
                                      value={task.priority.toString()}
                                      onValueChange={(value) => handleEditTask(task.id, { priority: parseInt(value) })}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Priority" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1">Low</SelectItem>
                                        <SelectItem value="2">Medium</SelectItem>
                                        <SelectItem value="3">High</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      task.priority === 3 ? 'bg-red-100 text-red-800' :
                                      task.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {task.priority === 3 ? 'High' : task.priority === 2 ? 'Medium' : 'Low'}
                                    </span>
                                  )}
                                  {editingTask === task.id ? (
                                    <Input
                                      type="datetime-local"
                                      value={task.due_date?.slice(0, 16) || ''}
                                      onChange={(e) => handleEditTask(task.id, { due_date: e.target.value })}
                                      className="w-auto"
                                    />
                                  ) : (
                                    task.due_date && (
                                      <span className="text-xs text-gray-500">
                                        Due: {new Date(task.due_date).toLocaleDateString()}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          </Tabs.Content>

          <Tabs.Content value="goals" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.goals.map(currentGoal => (
                <Card key={currentGoal.id}>
                  <CardHeader className="flex flex-row justify-between items-start">
                    <CardTitle>
                      {editingGoal === currentGoal.id ? (
                        <Input
                          value={editedGoalData?.title || currentGoal.title}
                          onChange={(e) => setEditedGoalData(prev => ({ 
                            ...prev, 
                            title: e.target.value,
                            description: prev?.description || currentGoal.description || '',
                            target_date: prev?.target_date || currentGoal.target_date
                          }))}
                          className="mt-[-4px]"
                        />
                      ) : (
                        currentGoal.title
                      )}
                    </CardTitle>
                    <div className="flex gap-2">
                      {editingGoal === currentGoal.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingGoal(null);
                              setEditedGoalData(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              if (editedGoalData) {
                                handleEditGoal(currentGoal.id, editedGoalData);
                              }
                            }}
                          >
                            Save
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingGoal(currentGoal.id);
                            setEditedGoalData({
                              title: currentGoal.title,
                              description: currentGoal.description || '',
                              target_date: currentGoal.target_date
                            });
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {currentGoal.description && (
                      <div className="mb-4">
                        {editingGoal === currentGoal.id ? (
                          <Textarea
                            value={editedGoalData?.description || currentGoal.description}
                            onChange={(e) => setEditedGoalData(prev => ({
                              ...prev!,
                              description: e.target.value
                            }))}
                            className="min-h-[100px]"
                          />
                        ) : (
                          <p className="text-gray-600 whitespace-pre-wrap">{currentGoal.description}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Linked Targets Section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Linked Targets</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedGoalForTask(currentGoal.id);
                            setIsLinkingGoal(true);
                          }}
                        >
                          Link Target
                        </Button>
                      </div>
                      
                      {currentGoal.goal_target_links?.map(link => (
                        <div key={link.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{link.target.title}</h4>
                              {link.target.description && (
                                <p className="text-sm text-gray-600">{link.target.description}</p>
                              )}
                            </div>
                            <span className="text-sm font-medium">
                              {link.target.current_value} / {link.target.target_value} {link.target.unit}
                            </span>
                          </div>
                          <Progress value={(link.target.current_value / link.target.target_value) * 100} />
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Target Date: {formatDate(currentGoal.target_date)}</span>
                        <span className={`font-medium ${
                          getDaysRemaining(currentGoal.target_date) < 0 ? 'text-red-500' :
                          getDaysRemaining(currentGoal.target_date) < 7 ? 'text-yellow-500' :
                          'text-green-500'
                        }`}>
                          {getDaysRemaining(currentGoal.target_date)} days remaining
                        </span>
                      </div>
                      {editingGoal === currentGoal.id && (
                        <Input
                          type="datetime-local"
                          value={editedGoalData?.target_date.slice(0, 16) || currentGoal.target_date.slice(0, 16)}
                          onChange={(e) => setEditedGoalData(prev => ({
                            ...prev!,
                            target_date: e.target.value
                          }))}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Tabs.Content>

          <Tabs.Content value="targets" className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Targets</h2>
              <Button
                onClick={() => {
                  setNewTarget({
                    title: '',
                    description: '',
                    target_value: 0,
                    unit: 'count',
                    target_type: 'count'
                  });
                  setSelectedGoalForTask(null);
                  setIsAddingTarget(true);
                }}
              >
                Add Target
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {project.project_targets?.map(target => (
                <Card key={target.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{target.target.title}</h3>
                        <p className="text-sm text-gray-500">{target.target.target_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-medium">
                          {target.target.current_value} / {target.target.target_value} {target.target.unit}
                        </p>
                        <Progress value={(target.target.current_value / target.target.target_value) * 100} className="mt-2" />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {target.target.description && (
                      <p className="text-gray-600 mb-4">{target.target.description}</p>
                    )}
                    
                    {/* Linked Goals */}
                    {target.target.goal_target_links && target.target.goal_target_links.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Linked Goals:</h4>
                        <div className="space-y-2">
                          {target.target.goal_target_links.map(gtLink => {
                            const goal = project.goals.find(g => g.id === gtLink.goal_id);
                            return goal ? (
                              <div key={gtLink.id} className="flex justify-between items-center">
                                <span className="text-sm">{goal.title}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const { error } = await supabase
                                      .from('goal_target_links')
                                      .delete()
                                      .eq('id', gtLink.id);
                                    
                                    if (!error) {
                                      setProject({
                                        ...project,
                                        project_targets: project.project_targets.map(t =>
                                          t.id === target.id
                                            ? {
                                                ...t,
                                                target: {
                                                  ...t.target,
                                                  goal_target_links: t.target.goal_target_links?.filter(l => l.id !== gtLink.id)
                                                }
                                              }
                                            : t
                                        )
                                      });
                                    }
                                  }}
                                >
                                  Unlink
                                </Button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Link to Goal Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTargetId(target.id);
                        setSelectedGoalForTask(null);
                        setIsLinkingGoal(true);
                      }}
                      className="w-full mt-2"
                    >
                      Link to Goal
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Tabs.Content>

          <Tabs.Content value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Time Spent on Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="hours" stroke="#3b82f6" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Tabs.Content>

          <Tabs.Content value="nodes" className="space-y-4">
            <DragDropContext onDragEnd={handleNodeReorder}>
              <Droppable droppableId="nodes">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {nodeOrder.map((nodeId, index) => {
                      const link = project.project_node_links?.find(n => n.id === nodeId);
                      if (!link) return null;

                      return (
                        <Draggable key={link.id} draggableId={link.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Card>
                                <CardHeader>
                                  <CardTitle className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="text-sm text-gray-500">{link.flow.title}</span>
                                      <a 
                                        href={`/dashboard/process-flows/${link.linked_flow_id}?nodeId=${link.linked_node_id}`}
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        {link.node?.data?.label || 'Untitled Node'}
                                      </a>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUnlinkNode(link.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      Unlink
                                    </Button>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {link.description && (
                                    <p className="text-gray-600">{link.description}</p>
                                  )}
                                  <p className="text-sm text-gray-500 mt-2">
                                    Linked on {formatDate(link.created_at)}
                                  </p>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {(!project.project_node_links || project.project_node_links.length === 0) && (
                      <p className="text-gray-500">No nodes linked to this project yet.</p>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </Tabs.Content>

          <Tabs.Content value="notes" className="space-y-4">
            <DragDropContext onDragEnd={handleNoteReorder}>
              <Droppable droppableId="notes">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-y-auto p-1"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {noteOrder
                        .map((noteId, index) => {
                          const link = project.project_notes?.find(n => n.id === noteId);
                          if (!link) return null;
                          
                          return (
                            <Draggable key={link.id} draggableId={link.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="h-fit"
                                >
                                  <Card>
                                    <CardHeader className="p-4">
                                      <CardTitle className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                          <Link
                                            href={`/dashboard/notes/${link.note.id}`}
                                            className="text-xl font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
                                          >
                                            {link.note.title}
                                          </Link>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleUnlinkNote(link.id)}
                                          className="text-red-600 hover:text-red-800 ml-2"
                                        >
                                          Unlink
                                        </Button>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                      <div className="relative mb-4">
                                        <p className={`text-gray-600 whitespace-pre-wrap ${showFullContent === link.note.id ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                                          {link.note.content}
                                        </p>
                                        {link.note.content && link.note.content.length > 150 && (
                                          <div className="flex justify-end mt-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setShowFullContent(showFullContent === link.note.id ? null : link.note.id)}
                                              className="text-blue-600 hover:text-blue-800 text-sm"
                                            >
                                              {showFullContent === link.note.id ? '← Show less' : 'Show more →'}
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-2 mb-4">
                                        {link.note.tags?.map(tag => (
                                          <span
                                            key={tag}
                                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                      <p className="text-sm text-gray-500">
                                        Created on {formatDate(link.note.created_at)}
                                      </p>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                    </div>
                    {provided.placeholder}
                    {(!project.project_notes || project.project_notes.length === 0) && (
                      <p className="text-gray-500">No notes linked to this project yet.</p>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </Tabs.Content>
        </Tabs.Root>

        {/* Node Linking Dialog */}
        <Dialog open={isLinkingNode} onOpenChange={setIsLinkingNode}>
          <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-lg p-6 w-[425px] max-w-[90vw] z-50">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Link Node to Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="flow" className="block mb-2">Select Flow</Label>
                <Select
                  value={selectedFlowId}
                  onValueChange={setSelectedFlowId}
                >
                  <SelectTrigger className="w-full bg-white border rounded-md p-2">
                    <SelectValue placeholder="Select a flow..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                    {flows.map(flow => (
                      <SelectItem key={flow.id} value={flow.id} className="p-2 hover:bg-gray-100">
                        {flow.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFlowId && (
                <div>
                  <Label htmlFor="node" className="block mb-2">Select Node</Label>
                  <Select
                    value={selectedNodeId}
                    onValueChange={setSelectedNodeId}
                  >
                    <SelectTrigger className="w-full bg-white border rounded-md p-2">
                      <SelectValue placeholder="Select a node..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                      {nodesInFlow.map(node => (
                        <SelectItem key={node.id} value={node.id} className="p-2 hover:bg-gray-100">
                          {node.data?.label || 'Untitled Node'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="description" className="block mb-2">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                  placeholder="Add a description for this link..."
                  className="w-full bg-white border rounded-md p-2"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsLinkingNode(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLinkNode} disabled={!selectedFlowId || !selectedNodeId}>
                  Link Node
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Note Linking Dialog */}
        <Dialog open={isLinkingNote} onOpenChange={setIsLinkingNote}>
          <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg p-6 w-[90vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <DialogTitle className="text-2xl font-semibold">Link Note to Project</DialogTitle>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setIsLinkingNote(false)}
              >
                <span className="text-xl">×</span>
              </Button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Select Note</h3>
              <div className="relative">
                <Select
                  value={selectedNoteId}
                  onValueChange={setSelectedNoteId}
                >
                  <SelectTrigger className="w-full bg-white border-2 border-gray-200 rounded-lg p-3 text-left">
                    <SelectValue placeholder="Select a note..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                    {availableNotes.map(note => (
                      <SelectItem 
                        key={note.id} 
                        value={note.id}
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{note.title}</span>
                          <span className="text-sm text-gray-500 line-clamp-1">{note.content}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setIsLinkingNote(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleLinkNote} 
                disabled={!selectedNoteId}
                className={`px-6 ${!selectedNoteId ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Link Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Target Dialog */}
        <Dialog open={isAddingTarget} onOpenChange={setIsAddingTarget}>
          <DialogContent className="bg-white rounded-lg shadow-lg max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Target</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <div>
                <Label>Select Goal</Label>
                <Select
                  value={selectedGoalForTask || ''}
                  onValueChange={setSelectedGoalForTask}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {project.goals.map(goal => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target-title">Title</Label>
                <Input
                  id="target-title"
                  value={newTarget.title}
                  onChange={(e) => setNewTarget({ ...newTarget, title: e.target.value })}
                  placeholder="e.g., Tasks Completed"
                />
              </div>
              <div>
                <Label htmlFor="target-description">Description (Optional)</Label>
                <Textarea
                  id="target-description"
                  value={newTarget.description}
                  onChange={(e) => setNewTarget({ ...newTarget, description: e.target.value })}
                  placeholder="Describe what this target measures"
                />
              </div>
              <div>
                <Label htmlFor="target-target">Target Value</Label>
                <Input
                  id="target-target"
                  type="number"
                  value={newTarget.target_value}
                  onChange={(e) => setNewTarget({ ...newTarget, target_value: parseFloat(e.target.value) })}
                  min="0"
                  step="1"
                />
              </div>
              <div>
                <Label htmlFor="target-type">Type</Label>
                <Select
                  value={newTarget.target_type}
                  onValueChange={(value: 'count' | 'percentage' | 'time' | 'custom') => {
                    const unit = value === 'time' ? 'hours' : 
                                value === 'percentage' ? '%' : 
                                value === 'count' ? 'items' : '';
                    setNewTarget({ ...newTarget, target_type: value, unit });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newTarget.target_type === 'custom' && (
                <div>
                  <Label htmlFor="target-unit">Unit</Label>
                  <Input
                    id="target-unit"
                    value={newTarget.unit}
                    onChange={(e) => setNewTarget({ ...newTarget, unit: e.target.value })}
                    placeholder="e.g., points, items, etc."
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <Button variant="outline" onClick={() => setIsAddingTarget(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const selectedGoal = project.goals.find(g => g.id === selectedGoalForTask);
                  if (selectedGoal) {
                    handleAddTarget(selectedGoal.id);
                  }
                }}
                disabled={!newTarget.title || newTarget.target_value <= 0 || !selectedGoalForTask}
              >
                Add Target
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Link Goal Dialog */}
        <Dialog open={isLinkingGoal} onOpenChange={setIsLinkingGoal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Target to Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <div>
                <Label>Select Goal</Label>
                <Select
                  value={selectedGoalForTask || ''}
                  onValueChange={setSelectedGoalForTask}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {project.goals.map(goal => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}