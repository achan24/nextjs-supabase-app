'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface SkillNode {
  id: string;
  label: string;
  type: string;
  parentId?: string;
  children?: SkillNode[];
  flowId?: string;
  data?: any;
}

interface SkillsTreeViewProps {
  skillTree: SkillNode[];
  loading: boolean;
  editingFlowId: string | null;
  editingFlowName: string;
  setEditingFlowName: (name: string) => void;
  handleFlowRename: (flowId: string, newName: string) => void;
  startEditingFlow: (flowId: string, currentName: string) => void;
  onNodeClick: (node: any) => void;
  selectedNode: any;
}

// TreeNode component (copied from SkillsExplorerClient)
function TreeNode({ 
  node, 
  level = 0, 
  editingFlowId, 
  editingFlowName, 
  setEditingFlowName, 
  handleFlowRename, 
  startEditingFlow,
  onNodeClick,
  selectedNode
}: { 
  node: SkillNode, 
  level?: number,
  editingFlowId: string | null,
  editingFlowName: string,
  setEditingFlowName: (name: string) => void,
  handleFlowRename: (flowId: string, newName: string) => void,
  startEditingFlow: (flowId: string, currentName: string) => void,
  onNodeClick: (node: any) => void,
  selectedNode: any
}) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'flow':
        return '🌍';
      case 'skill':
        return '⚔️';
      case 'target':
        return '🎯';
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

  const handleEdit = () => {
    if (node.type === 'flow') {
      startEditingFlow(node.flowId || node.id, node.label);
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    if (node.type === 'flow') {
      handleFlowRename(node.flowId || node.id, editingFlowName);
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
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
      >
        {/* Expand/Collapse Icon */}
        <span 
          className="w-4 text-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (node.children && node.children.length > 0) {
              setIsExpanded(!isExpanded);
            }
          }}
        >
          {getExpandIcon()}
        </span>

        {/* Node Icon */}
        <span className="text-sm">{getIcon(node.type)}</span>

        {/* Node Label */}
        <div className="flex-1 min-w-0">
          {isEditing && node.type === 'flow' ? (
            <input
              type="text"
              value={editingFlowName}
              onChange={(e) => setEditingFlowName(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleSave}
              className="w-full px-1 py-0.5 text-sm border rounded"
              autoFocus
            />
          ) : (
            <span className="text-sm truncate">{node.label}</span>
          )}
        </div>

        {/* Type Badge */}
        <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-full ${
          node.type === 'skill' ? 'bg-blue-100 text-blue-800' :
          node.type === 'target' ? 'bg-gray-100 text-gray-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {node.type.toUpperCase()}
        </span>

        {/* Edit Button for Flows */}
        {node.type === 'flow' && !isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ✏️
          </button>
        )}
      </div>

      {/* Children */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              editingFlowId={editingFlowId}
              editingFlowName={editingFlowName}
              setEditingFlowName={setEditingFlowName}
              handleFlowRename={handleFlowRename}
              startEditingFlow={startEditingFlow}
              onNodeClick={onNodeClick}
              selectedNode={selectedNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SkillsTreeView({
  skillTree,
  loading,
  editingFlowId,
  editingFlowName,
  setEditingFlowName,
  handleFlowRename,
  startEditingFlow,
  onNodeClick,
  selectedNode
}: SkillsTreeViewProps) {
  return (
    <Card className="p-3 md:p-4">
      <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Skills & Targets</h2>
      {loading ? (
        <div>Loading skills...</div>
      ) : skillTree.length === 0 ? (
        <div className="text-gray-500">No skills or targets found</div>
      ) : (
        <div>
          {skillTree.map(node => (
            <TreeNode 
              key={node.id} 
              node={node}
              editingFlowId={editingFlowId}
              editingFlowName={editingFlowName}
              setEditingFlowName={setEditingFlowName}
              handleFlowRename={handleFlowRename}
              startEditingFlow={startEditingFlow}
              onNodeClick={onNodeClick}
              selectedNode={selectedNode}
            />
          ))}
        </div>
      )}
    </Card>
  );
} 