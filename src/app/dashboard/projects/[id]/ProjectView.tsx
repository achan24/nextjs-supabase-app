'use client';

import { useState, useEffect } from 'react';
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

interface Project {
  id: string;
  title: string;
  description?: string;
  goals: Goal[];
  tasks?: Task[];
  nodes: Node[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: number;
  due_date: string;
  status: string;
}

interface Metrics {
  target: number;
  current: number;
  unit: string;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date: string;
  metrics?: Metrics;
  status?: 'not_started' | 'in_progress' | 'completed';
}

interface Node {
  id: string;
  type: string;
  data: {
    label: string;
    description?: string;
  };
}

interface ProjectNodeLink {
  id: string;
  project_id: string;
  linked_flow_id: string;
  linked_node_id: string;
  description?: string;
  created_at: string;
  user_id: string;
  flow: {
    id: string;
    title: string;
  };
  node: {
    id: string;
    data: {
      label: string;
      description?: string;
    };
  };
}

interface ProjectNodeLinkResponse {
  id: string;
  project_id: string;
  linked_flow_id: string;
  linked_node_id: string;
  description: string | null;
  created_at: string;
  user_id: string;
  flow: {
    id: string;
    title: string;
  };
  node: {
    id: string;
    data: {
      label: string;
      description?: string;
    };
  };
}

interface ProjectNodeLinkFromDB extends Omit<ProjectNodeLink, 'flow' | 'node'> {
  flow: ProcessFlowWithNodes | ProcessFlowWithNodes[];
}

interface ProjectWithNodesAndTasksFromDB extends Omit<Project, 'tasks' | 'project_node_links'> {
  tasks: TaskWithWrapper[];
  project_node_links: ProjectNodeLinkFromDB[];
}

interface ProcessFlow {
  id: string;
  title: string;
  description?: string;
  nodes: ProcessFlowNode[];
}

interface ProcessFlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    description?: string;
  };
}

interface Flow extends ProcessFlow {}

interface TaskWithWrapper {
  task: Task;
}

interface ProcessFlowWithNodes {
  id: string;
  title: string;
  nodes: ProcessFlowNode[];
}

interface ProjectViewProps {
  project: ProjectWithNodesAndTasksFromDB;
  user: User;
}

export default function ProjectView({ project: initialProject, user }: ProjectViewProps) {
  console.log('Initial Project Data:', initialProject);
  
  // Transform the initial project data to include properly formatted node links
  const transformedProject = {
    ...initialProject,
    tasks: initialProject.tasks?.map((t: TaskWithWrapper) => t.task) || [],
    project_node_links: (initialProject.project_node_links || []).map(link => {
      console.log('Processing link:', link);
      // Get the flow data - it comes as an array from the foreign key relationship
      const flowData = Array.isArray(link.flow) ? link.flow[0] : link.flow;
      console.log('Flow data:', flowData);
      
      if (!flowData || !flowData.nodes) {
        console.error('Missing flow data or nodes for link:', link);
        return null;
      }

      const nodeData = flowData.nodes.find((n: any) => n.id === link.linked_node_id);
      if (!nodeData) {
        console.error('Could not find node data for link:', link);
        return null;
      }

      return {
        id: link.id,
        project_id: link.project_id,
        linked_flow_id: link.linked_flow_id,
        linked_node_id: link.linked_node_id,
        description: link.description,
        created_at: link.created_at,
        user_id: link.user_id,
        flow: {
          id: flowData.id,
          title: flowData.title
        },
        node: {
          id: link.linked_node_id,
          data: nodeData.data || {
            label: 'Untitled Node'
          }
        }
      } as ProjectNodeLink;
    }).filter((link): link is ProjectNodeLink => link !== null) || []
  };

  console.log('Transformed Project:', transformedProject);

  const [project, setProject] = useState(transformedProject);
  const [tasks, setTasks] = useState<Task[]>(transformedProject.tasks || []);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isLinkingNode, setIsLinkingNode] = useState(false);
  const [availableNodes, setAvailableNodes] = useState<Node[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [linkDescription, setLinkDescription] = useState('');
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 2
  });
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    title: '',
    description: '',
    status: 'not_started',
    metrics: {
      target: 0,
      current: 0,
      unit: 'hours'
    }
  });
  const [activeTab, setActiveTab] = useState('kanban');
  const [timeData, setTimeData] = useState<any[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [flows, setFlows] = useState<ProcessFlow[]>([]);
  const [nodesInFlow, setNodesInFlow] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchTimeData();
  }, []);

  const fetchTimeData = async () => {
    // Get the last 7 days of time data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const { data, error } = await supabase
      .from('task_time_entries')
      .select('duration, created_at')
      .in('task_id', tasks.map(t => t.id))
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      console.error('Error fetching time data:', error);
      return;
    }

    // Group by day
    const timeByDay = data.reduce((acc: any, entry: any) => {
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

    const { data: task, error } = await supabase
      .from('tasks')
      .insert([{
        ...newTask,
        user_id: user.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding task:', error);
      return;
    }

    // Link task to project
    await supabase
      .from('task_projects')
      .insert([{
        task_id: task.id,
        project_id: project.id
      }]);

    setTasks([...tasks, task]);
    setIsAddingTask(false);
    setNewTask({
      title: '',
      description: '',
      status: 'todo',
      priority: 2
    });
  };

  const handleAddGoal = async () => {
    if (!newGoal.title || !newGoal.target_date) return;

    const { data: goal, error } = await supabase
      .from('goals')
      .insert([{
        ...newGoal,
        project_id: project.id,
        user_id: user.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding goal:', error);
      return;
    }

    setProject({
      ...project,
      goals: [...project.goals, goal]
    });
    setIsAddingGoal(false);
    setNewGoal({
      title: '',
      description: '',
      status: 'not_started',
      metrics: {
        target: 0,
        current: 0,
        unit: 'hours'
      }
    });
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  const getGoalProgress = (goal: Goal) => {
    if (!goal.metrics) return 0;
    return (goal.metrics.current / goal.metrics.target) * 100;
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
      // First check if the node exists in the selected flow
      const { data: flowData, error: flowError } = await supabase
        .from('process_flows')
        .select('nodes')
        .eq('id', selectedFlowId)
        .single();

      if (flowError) {
        console.error('Error checking flow:', flowError);
        return;
      }

      const nodeExists = flowData.nodes.some((node: any) => node.id === selectedNodeId);
      if (!nodeExists) {
        console.error('Selected node does not exist in this flow');
        return;
      }

      const selectedNode = flowData.nodes.find((node: any) => node.id === selectedNodeId);
      if (!selectedNode) {
        console.error('Could not find node data');
        return;
      }

      // Try to insert the link
      const { data: newLink, error: insertError } = await supabase
        .from('project_node_links')
        .insert([{
          project_id: project.id,
          linked_flow_id: selectedFlowId,
          linked_node_id: selectedNodeId,
          description: linkDescription,
          user_id: user.id
        }])
        .select(`
          id,
          project_id,
          linked_flow_id,
          linked_node_id,
          description,
          created_at,
          user_id,
          flow:process_flows(
            id,
            title,
            nodes
          )
        `)
        .single();

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          // Get the existing link to show it to the user
          const { data: existingLink, error: fetchError } = await supabase
            .from('project_node_links')
            .select(`
              id,
              project_id,
              linked_flow_id,
              linked_node_id,
              description,
              created_at,
              user_id,
              flow:process_flows(
                id,
                title,
                nodes
              )
            `)
            .eq('project_id', project.id)
            .eq('linked_flow_id', selectedFlowId)
            .eq('linked_node_id', selectedNodeId)
            .single();

          if (fetchError) {
            console.error('Error fetching existing link:', fetchError);
          } else if (existingLink) {
            console.error('This node is already linked to this project:', existingLink);
          }
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
            </div>
          </div>
          {project.description && (
            <p className="text-gray-600 mt-2">{project.description}</p>
          )}
        </div>

        {/* Main Content */}
        <Tabs.Root defaultValue="kanban" className="space-y-6">
          <Tabs.List className="bg-gray-100 p-1 rounded-lg">
            <Tabs.Trigger 
              value="kanban"
              className="rounded px-4 py-2 text-sm font-medium data-[state=active]:bg-white"
            >
              Kanban Board
            </Tabs.Trigger>
            <Tabs.Trigger 
              value="goals"
              className="rounded px-4 py-2 text-sm font-medium data-[state=active]:bg-white"
            >
              Goals
            </Tabs.Trigger>
            <Tabs.Trigger 
              value="metrics"
              className="rounded px-4 py-2 text-sm font-medium data-[state=active]:bg-white"
            >
              Metrics
            </Tabs.Trigger>
            <Tabs.Trigger 
              value="nodes"
              className="rounded px-4 py-2 text-sm font-medium data-[state=active]:bg-white"
            >
              Linked Nodes
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
                        {getTasksByStatus(status).map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-white rounded-lg p-4 mb-2 shadow-sm"
                              >
                                <h4 className="font-medium">{task.title}</h4>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    task.priority === 3 ? 'bg-red-100 text-red-800' :
                                    task.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {task.priority === 3 ? 'High' : task.priority === 2 ? 'Medium' : 'Low'}
                                  </span>
                                  {task.due_date && (
                                    <span className="text-xs text-gray-500">
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </span>
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
              {project.goals.map(goal => (
                <Card key={goal.id}>
                  <CardHeader>
                    <CardTitle>{goal.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {goal.description && (
                      <p className="text-gray-600 mb-4">{goal.description}</p>
                    )}
                    {goal.metrics && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{goal.metrics.current} / {goal.metrics.target} {goal.metrics.unit}</span>
                        </div>
                        <Progress value={getGoalProgress(goal)} />
                      </div>
                    )}
                    <div className="mt-4 text-sm text-gray-500">
                      Target Date: {new Date(goal.target_date).toLocaleDateString()}
                    </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {project.project_node_links?.map(link => (
                <Card key={link.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">{link.flow.title}</span>
                        <a 
                          href={`/dashboard/process-flow?flowId=${link.linked_flow_id}&nodeId=${link.linked_node_id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {link.node.data?.label || 'Untitled Node'}
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
                      Linked on {new Date(link.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {(!project.project_node_links || project.project_node_links.length === 0) && (
                <p className="text-gray-500">No nodes linked to this project yet.</p>
              )}
            </div>
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
                  <SelectContent className="bg-white border rounded-md shadow-lg">
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
                    <SelectContent className="bg-white border rounded-md shadow-lg">
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
      </div>
    </div>
  );
}