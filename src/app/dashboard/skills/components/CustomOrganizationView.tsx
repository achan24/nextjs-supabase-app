'use client';

import React, { useState } from 'react';
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
  Edit3
} from 'lucide-react';

interface SkillNode {
  id: string;
  label: string;
  type: string;
  parentId?: string;
  children?: SkillNode[];
  flowId?: string;
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
  const [customTree, setCustomTree] = useState<SkillNode[]>([]);
  const [draggedSkill, setDraggedSkill] = useState<SkillNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [folders, setFolders] = useState<SkillNode[]>([]);

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
          setCustomTree(prev => prev.filter(node => node.id !== draggedSkill.id));
          
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
          }`}
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
      {/* Create Folder */}
      <Card className="p-4">
        <div className="flex items-center space-x-2">
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
          {folders.map(folder => renderTreeNode(folder))}
          
          {/* Render skills */}
          {customTree.map(skill => renderTreeNode(skill))}
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