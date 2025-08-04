'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface SkillNode {
  id: string;
  label: string;
  type: string;
  parentId?: string;
  children?: SkillNode[];
}

interface TreeNodeProps {
  node: SkillNode;
  level?: number;
  editingFlowId: string | null;
  editingFlowName: string;
  setEditingFlowName: (name: string) => void;
  handleFlowRename: (flowId: string, newName: string) => void;
  startEditingFlow: (flowId: string, currentName: string) => void;
  onNodeClick: (node: any) => void;
  selectedNode: any;
}

// Simple tree node component with expand/collapse and editing
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
}: TreeNodeProps) {
  const [expanded, setExpanded] = React.useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isEditing = editingFlowId === node.id && node.type === 'flow';
  
  // Icons for different node types
  const getIcon = (type: string) => {
    switch (type) {
      case 'flow':
        return '🗺️'; // Map icon for process flows
      case 'skill':
        return '⚔️'; // Sword icon for skills
      case 'target':
        return '🎯'; // Bullseye icon for targets
      default:
        return '📄'; // Default document icon
    }
  };

  // Expand/collapse icon
  const getExpandIcon = () => {
    if (!hasChildren) return '  '; // Empty space for leaf nodes
    return expanded ? '▼' : '▶';
  };
  
  return (
    <div style={{ marginLeft: 8 }}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'pointer',
          padding: '4px 6px',
          fontSize: '13px',
          borderRadius: '4px',
          transition: 'background-color 0.2s',
          userSelect: 'none',
          backgroundColor: selectedNode?.id === node.id ? '#e0f2fe' : 'transparent',
          minHeight: '32px'
        }} 
        onClick={() => {
          if (node.type === 'flow') {
            hasChildren && setExpanded(!expanded);
          } else {
            onNodeClick(node);
          }
        }}
        onDoubleClick={() => node.type === 'flow' && startEditingFlow(node.id, node.label)}
        onMouseEnter={(e) => {
          if (selectedNode?.id !== node.id) {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedNode?.id !== node.id) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* Expand/collapse arrow */}
        <span style={{ 
          marginRight: 8, 
          fontSize: '10px',
          color: '#6b7280',
          width: '12px',
          textAlign: 'center'
        }}>
          {getExpandIcon()}
        </span>
        
        {/* Node type icon */}
        <span style={{ marginRight: 8, fontSize: '16px' }}>
          {getIcon(node.type)}
        </span>
        
        {/* Node label or edit input */}
        {isEditing ? (
          <input
            type="text"
            value={editingFlowName}
            onChange={(e) => setEditingFlowName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFlowRename(node.id, editingFlowName);
              } else if (e.key === 'Escape') {
                handleFlowRename(node.id, node.label); // Cancel by reverting to original name
              }
            }}
            onBlur={() => handleFlowRename(node.id, editingFlowName)}
            style={{
              flex: 1,
              border: '1px solid #3b82f6',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '14px',
              outline: 'none'
            }}
            autoFocus
          />
        ) : (
          <span style={{ 
            fontWeight: node.type === 'skill' ? '600' : '400',
            color: node.type === 'skill' ? '#1f2937' : '#4b5563',
            flex: 1
          }}>
            {node.label}
          </span>
        )}
        
        {/* Type badge */}
        <span style={{ 
          color: '#6b7280', 
          fontSize: '10px',
          backgroundColor: node.type === 'skill' ? '#dbeafe' : node.type === 'flow' ? '#fef3c7' : '#f3f4f6',
          padding: '2px 6px',
          borderRadius: '10px',
          textTransform: 'uppercase',
          fontWeight: '500'
        }}>
          {node.type}
        </span>
      </div>
      
      {/* Children */}
      {hasChildren && expanded && (
        <div style={{ 
          borderLeft: '1px solid #e5e7eb',
          marginLeft: '6px',
          paddingLeft: '8px'
        }}>
          {node.children!.map(child => (
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
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">Process Flow Tree</h2>
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