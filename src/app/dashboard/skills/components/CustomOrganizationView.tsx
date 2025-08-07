'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Folder, 
  FolderPlus, 
  FileText, 
  GripVertical, 
  Plus,
  Trash2,
  Edit3,
  Save,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { skillOrganizationService } from '@/services/skillOrganizationService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SkillNode {
  id: string;
  label: string;
  type: string;
  parentId?: string;
  children?: SkillNode[];
  flowId?: string;
  data?: any;
}

interface CustomFolder {
  id: string;
  name: string;
  skills: SkillNode[];
  color?: string;
}

interface CustomOrganizationViewProps {
  skillTree: SkillNode[];
  onNodeClick: (node: any) => void;
  selectedNode: any;
}

export default function CustomOrganizationView({
  skillTree,
  onNodeClick,
  selectedNode
}: CustomOrganizationViewProps) {
  const { user } = useAuth();
  const [customTree, setCustomTree] = useState<SkillNode[]>([]);
  const [draggedSkill, setDraggedSkill] = useState<SkillNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [folders, setFolders] = useState<SkillNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [pendingSave, setPendingSave] = useState(false);

  // Load saved custom organization on component mount
  useEffect(() => {
    if (user?.id) {
      loadSavedOrganization();
    }
  }, [user?.id]);

  // Initialize custom tree with skills from the original tree
  React.useEffect(() => {
    const extractSkills = (nodes: SkillNode[]): SkillNode[] => {
      const skills: SkillNode[] = [];
      nodes.forEach(node => {
        if (node.type === 'skill') {
          // Create a copy of the skill with its targets preserved
          const skillWithTargets = {
            ...node,
            children: node.children ? [...node.children] : []
          };
          skills.push(skillWithTargets);
        }
        if (node.children) {
          // Recursively extract skills from children and add them to the result
          const childSkills = extractSkills(node.children);
          skills.push(...childSkills);
        }
      });
      return skills;
    };
    
    const skills = extractSkills(skillTree);
    setCustomTree(skills);
  }, [skillTree]);

  // Auto-save when organization changes
  React.useEffect(() => {
    if (autoSaveEnabled && user?.id && (folders.length > 0 || customTree.length > 0)) {
      const timeoutId = setTimeout(() => {
        saveOrganization();
      }, 2000); // Debounce for 2 seconds
      
      return () => clearTimeout(timeoutId);
    }
  }, [folders, customTree, autoSaveEnabled, user?.id]);

  // Handle pending saves
  React.useEffect(() => {
    if (pendingSave && user?.id && autoSaveEnabled) {
      console.log('[CustomOrganizationView] Processing pending save');
      setPendingSave(false);
      saveOrganization();
    }
  }, [pendingSave, user?.id, autoSaveEnabled]);

  // Function to save organization with current state
  const saveOrganizationWithState = async (currentFolders: SkillNode[], currentCustomTree: SkillNode[]) => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      console.log('[CustomOrganizationView] Saving organization with state:', {
        folders: currentFolders.length,
        customTree: currentCustomTree.length,
        folderDetails: currentFolders.map(f => ({ name: f.label, children: f.children?.length || 0 }))
      });
      
      await skillOrganizationService.saveCustomOrganization(user.id, currentFolders, currentCustomTree);
      toast.success('Custom organization saved successfully!');
    } catch (error) {
      console.error('[CustomOrganizationView] Error saving organization:', error);
      toast.error('Failed to save custom organization');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedOrganization = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const savedData = await skillOrganizationService.loadCustomOrganization(user.id);
      
      if (savedData.length > 0) {
        // Convert saved data to SkillNode format
        const savedNodes = skillOrganizationService.convertToSkillNodes(savedData);
        
        // Separate folders and skills
        const savedFolders = savedNodes.filter(node => node.type === 'folder');
        const savedSkills = savedNodes.filter(node => node.type === 'skill');
        
        setFolders(savedFolders);
        setCustomTree(savedSkills);
        
        // Set expanded state
        const expandedSet = new Set<string>();
        savedData.forEach(item => {
          if (item.is_expanded) {
            expandedSet.add(item.id);
          }
        });
        setExpandedNodes(expandedSet);
        
        toast.success('Custom organization loaded successfully!');
      }
    } catch (error) {
      console.error('[CustomOrganizationView] Error loading saved organization:', error);
      toast.error('Failed to load saved organization');
    } finally {
      setIsLoading(false);
    }
  };

  const saveOrganization = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      // Use the current state values to ensure we save the latest changes
      const currentFolders = folders;
      const currentCustomTree = customTree;
      
      console.log('[CustomOrganizationView] Saving organization:', {
        folders: currentFolders.length,
        customTree: currentCustomTree.length
      });
      
      await skillOrganizationService.saveCustomOrganization(user.id, currentFolders, currentCustomTree);
      toast.success('Custom organization saved successfully!');
    } catch (error) {
      console.error('[CustomOrganizationView] Error saving organization:', error);
      toast.error('Failed to save custom organization');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, skill: SkillNode) => {
    setDraggedSkill(skill);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetNode: SkillNode) => {
    e.preventDefault();
    console.log('[CustomOrganizationView] Drop event:', {
      draggedSkill,
      targetNode,
      draggedSkillType: draggedSkill?.type,
      targetNodeType: targetNode.type
    });
    
    if (draggedSkill && draggedSkill.id !== targetNode.id) {
      if (targetNode.type === 'folder') {
        if (draggedSkill.type === 'folder') {
          // Drop folder into folder
          setFolders(prev => {
            // Remove the dragged folder from its current position
            const withoutDragged = prev.filter(folder => folder.id !== draggedSkill.id);
            
                      // Add the dragged folder as a child of the target folder
          return withoutDragged.map(folder => {
            if (folder.id === targetNode.id) {
              return {
                ...folder,
                children: [...(folder.children || []), draggedSkill]
              };
            }
            return folder;
          });
        });
        
        // Auto-expand the target folder when it receives children
        setExpandedNodes(prev => {
          const newSet = new Set(prev);
          newSet.add(targetNode.id);
          return newSet;
        });
        } else {
          // Drop skill into folder
          console.log('[CustomOrganizationView] Dropping skill into folder:', targetNode.label);
          setFolders(prev => {
            const updated = prev.map(folder => {
              if (folder.id === targetNode.id) {
                console.log('[CustomOrganizationView] Adding skill to folder:', folder.label, 'New children:', [...(folder.children || []), draggedSkill]);
                return {
                  ...folder,
                  children: [...(folder.children || []), draggedSkill]
                };
              }
              return folder;
            });
            console.log('[CustomOrganizationView] Updated folders:', updated);
            return updated;
          });
          
          // Remove skill from custom tree
          setCustomTree(prev => {
            const filtered = prev.filter(node => node.id !== draggedSkill.id);
            console.log('[CustomOrganizationView] Removed skill from custom tree, remaining:', filtered.length);
            return filtered;
          });
          
          // Auto-expand the target folder when it receives children
          setExpandedNodes(prev => {
            const newSet = new Set(prev);
            newSet.add(targetNode.id);
            return newSet;
          });
        }
      } else if (targetNode.type === 'skill') {
        // Drop skill onto another skill (make it a child)
        const removeSkill = (nodes: SkillNode[]): SkillNode[] => {
          return nodes.filter(node => node.id !== draggedSkill.id);
        };
        
        const addSkillAsChild = (nodes: SkillNode[]): SkillNode[] => {
          return nodes.map(node => {
            if (node.id === targetNode.id) {
              return {
                ...node,
                children: [...(node.children || []), draggedSkill]
              };
            }
            return node;
          });
        };
        
        setCustomTree(prev => {
          const withoutDragged = removeSkill(prev);
          return addSkillAsChild(withoutDragged);
        });
      }
      
      // Trigger pending save after drop operation
      setPendingSave(true);
      setDraggedSkill(null);
    }
  };

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: SkillNode = {
      id: `folder-${Date.now()}`,
      label: newFolderName.trim(),
      type: 'folder',
      children: []
    };
    
    setFolders(prev => [...prev, newFolder]);
    // Auto-expand new folders
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      newSet.add(newFolder.id);
      return newSet;
    });
    setNewFolderName('');
  };

  const deleteFolder = (folderId: string) => {
    setFolders(prev => prev.filter(folder => folder.id !== folderId));
  };

  // Recursive component to render the tree (similar to SkillsTreeView)
  const renderTreeNode = (node: SkillNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);

    const getIcon = (type: string) => {
      switch (type) {
        case 'skill':
          return '⚔️';
        case 'target':
          return '🎯';
        case 'folder':
          return '📁';
        default:
          return '📄';
      }
    };

    const getExpandIcon = () => {
      if (node.children && node.children.length > 0) {
        return isExpanded ? '▼' : '▶';
      }
      return '';
    };

    const isSelected = selectedNode && selectedNode.id === node.id;

    return (
      <div className="select-none">
        <div 
          className={`flex items-center space-x-1 py-1 px-2 rounded cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-100' : ''
          } ${node.type === 'skill' ? 'hover:bg-blue-50' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onNodeClick(node)}
          draggable={node.type === 'skill' || node.type === 'folder'}
          onDragStart={(node.type === 'skill' || node.type === 'folder') ? (e) => handleDragStart(e, node) : undefined}
          onDragOver={node.type === 'folder' ? handleDragOver : undefined}
          onDrop={node.type === 'folder' ? (e) => handleDrop(e, node) : undefined}
        >
          {/* Expand/Collapse Icon */}
          <span 
            className="w-4 text-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (node.children && node.children.length > 0) {
                toggleExpanded(node.id);
              }
            }}
          >
            {getExpandIcon()}
          </span>

          {/* Node Icon */}
          <span className="text-sm">{getIcon(node.type)}</span>

          {/* Node Label */}
          <div className="flex-1 min-w-0">
            <span className="text-sm truncate">{node.label}</span>
          </div>

          {/* Type Badge */}
          <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-full ${
            node.type === 'skill' ? 'bg-blue-100 text-blue-800' :
            node.type === 'target' ? 'bg-gray-100 text-gray-800' :
            node.type === 'folder' ? 'bg-green-100 text-green-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {node.type.toUpperCase()}
          </span>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            {/* External link icon for skills */}
            {node.type === 'skill' && node.flowId && (
              <ExternalLink className="w-3 h-3 text-blue-500" />
            )}
            
            {/* Drag handle for skills and folders */}
            {(node.type === 'skill' || node.type === 'folder') && (
              <span className="text-gray-400 cursor-move">
                ⋮⋮
              </span>
            )}
            
            {/* Delete button for folders */}
            {node.type === 'folder' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFolder(node.id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        {isExpanded && node.children && node.children.length > 0 && (
          <div>
            {node.children.map(child => (
              <div key={child.id}>
                {renderTreeNode(child, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

    return (
    <div className="space-y-4">
      {/* Create Folder and Save */}
      <Card className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Input
            placeholder="Enter folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            className="flex-1"
          />
          <Button onClick={createFolder} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Create Folder
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              onClick={loadSavedOrganization} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Folder className="w-4 h-4 mr-1" />
              )}
              Load Saved
            </Button>
            
            <Button 
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)} 
              variant={autoSaveEnabled ? "default" : "outline"}
              size="sm"
            >
              {autoSaveEnabled ? "Auto-save ON" : "Auto-save OFF"}
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {isSaving && (
              <span className="text-xs text-gray-500 flex items-center">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Saving...
              </span>
            )}
            
            <Button 
              onClick={saveOrganization} 
              size="sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save Now
            </Button>
          </div>
        </div>
      </Card>

      {/* Custom Organization */}
      <Card className="p-4">
        <h3 className="font-medium mb-4">Custom Organization</h3>
        <p className="text-sm text-gray-600 mb-4">
          Drag skills to reorganize them. Drop a skill onto another skill to make it a child, or drop into a folder to organize.
        </p>
        
        <div className="space-y-1">
          {/* Debug info */}
          <div className="text-xs text-gray-500 mb-2">
            Folders: {folders.length}, Skills: {customTree.length}, Expanded: {expandedNodes.size}
          </div>
          
          {/* Render folders first */}
          {folders.map(folder => (
            <div key={folder.id}>
              {renderTreeNode(folder)}
            </div>
          ))}
          
          {/* Render skills */}
          {customTree.map(skill => (
            <div key={skill.id}>
              {renderTreeNode(skill)}
            </div>
          ))}
        </div>
        
        {folders.length === 0 && customTree.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No skills available for custom organization.
          </div>
        )}
      </Card>
    </div>
  );
} 