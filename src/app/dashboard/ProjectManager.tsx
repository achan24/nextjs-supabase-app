'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase';
import { Project as ProjectType } from '@/types/task';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface FormEvent extends React.FormEvent<HTMLFormElement> {
  target: HTMLFormElement & {
    title: HTMLInputElement;
    description: HTMLTextAreaElement;
    priority: HTMLSelectElement;
  };
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: number;
}

interface ProjectWithTasks extends ProjectType {
  tasks?: Task[];
}

export default function ProjectManager() {
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithTasks | null>(null);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    priority: 1,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        tasks:task_projects!inner(
          task:tasks(
            id,
            title,
            status,
            priority
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    // Transform the data to flatten the tasks array
    const transformedProjects = projects.map(project => ({
      ...project,
      tasks: project.tasks.map((t: { task: Task }) => t.task)
    }));

    setProjects(transformedProjects || []);
  };

  const handleCreateProject = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found');
      return;
    }

    try {
      console.log('Attempting to create project:', {
        title: newProject.title,
        description: newProject.description,
        priority: newProject.priority,
        user_id: user.id
      });

      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            title: newProject.title,
            description: newProject.description,
            priority: newProject.priority,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating project:', error.message);
        console.error('Full error:', error);
        return;
      }

      if (data) {
        console.log('Project created successfully:', data);
        setProjects([data, ...projects]);
        setIsCreateModalOpen(false);
        setNewProject({ title: '', description: '', priority: 1 });
      }
    } catch (err) {
      console.error('Exception creating project:', err);
      if (err instanceof Error) {
        console.error('Error details:', err.message);
      }
    }
  };

  const handleEditProject = async () => {
    if (!selectedProject) return;

    const { error } = await supabase
      .from('projects')
      .update({
        title: selectedProject.title,
        description: selectedProject.description,
        priority: selectedProject.priority,
      })
      .eq('id', selectedProject.id);

    if (error) {
      console.error('Error updating project:', error);
      return;
    }

    setProjects(
      projects.map((p) =>
        p.id === selectedProject.id ? { ...p, ...selectedProject } : p
      )
    );
    setIsEditModalOpen(false);
    setSelectedProject(null);
  };

  const handleDeleteProject = async (projectId: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
      return;
    }

    setProjects(projects.filter((p) => p.id !== projectId));
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3:
        return 'text-red-600';
      case 2:
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 3:
        return 'High';
      case 2:
        return 'Medium';
      default:
        return 'Low';
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
            <h1 className="text-xl font-bold text-gray-900">Project Manager</h1>
            <div className="w-24"></div> {/* Spacer for balance */}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-end">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">Create Project</Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700">Title</Label>
                  <Input
                    id="title"
                    value={newProject.title}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNewProject({ ...newProject, title: e.target.value })
                    }
                    className="mt-1"
                    placeholder="Enter project title"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      setNewProject({ ...newProject, description: e.target.value })
                    }
                    className="mt-1"
                    placeholder="Enter project description"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="priority" className="text-sm font-medium text-gray-700">Priority</Label>
                  <Select
                    value={String(newProject.priority)}
                    onValueChange={(value: string) =>
                      setNewProject({ ...newProject, priority: Number(value) })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Low</SelectItem>
                      <SelectItem value="2">Medium</SelectItem>
                      <SelectItem value="3">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateProject}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!newProject.title.trim()}
                >
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{project.title}</span>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedProject(project);
                        setIsEditModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{project.description}</p>
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-2 py-1 rounded text-sm ${
                    project.priority === 1 ? 'bg-red-100 text-red-800' :
                    project.priority === 2 ? 'bg-orange-100 text-orange-800' :
                    project.priority === 3 ? 'bg-yellow-100 text-yellow-800' :
                    project.priority === 4 ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    Priority {project.priority}
                  </span>
                </div>
                
                {/* Tasks Section */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Tasks</h3>
                  {project.tasks && project.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {project.tasks.map(task => (
                        <div
                          key={task.id}
                          className="p-2 bg-gray-50 rounded border border-gray-200"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{task.title}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No tasks assigned to this project</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Edit Project</DialogTitle>
            </DialogHeader>
            {selectedProject && (
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="edit-title" className="text-sm font-medium text-gray-700">Title</Label>
                  <Input
                    id="edit-title"
                    value={selectedProject.title}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSelectedProject({
                        ...selectedProject,
                        title: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description" className="text-sm font-medium text-gray-700">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={selectedProject.description || ''}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      setSelectedProject({
                        ...selectedProject,
                        description: e.target.value,
                      })
                    }
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-priority" className="text-sm font-medium text-gray-700">Priority</Label>
                  <Select
                    value={String(selectedProject.priority)}
                    onValueChange={(value: string) =>
                      setSelectedProject({
                        ...selectedProject,
                        priority: Number(value),
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Low</SelectItem>
                      <SelectItem value="2">Medium</SelectItem>
                      <SelectItem value="3">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleEditProject}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!selectedProject.title.trim()}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 