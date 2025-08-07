'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TreePine, FolderOpen } from 'lucide-react';
import SkillsTreeView from './SkillsTreeView';
import CustomOrganizationView from './CustomOrganizationView';

interface SkillNode {
  id: string;
  label: string;
  type: string;
  parentId?: string;
  children?: SkillNode[];
  flowId?: string;
  data?: any;
}

interface EnhancedSkillsUIProps {
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

export default function EnhancedSkillsUI({
  skillTree,
  loading,
  editingFlowId,
  editingFlowName,
  setEditingFlowName,
  handleFlowRename,
  startEditingFlow,
  onNodeClick,
  selectedNode
}: EnhancedSkillsUIProps) {
  const [activeView, setActiveView] = useState<'tree' | 'custom'>('tree');

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">Skills Organization</h2>
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={activeView === 'tree' ? 'default' : 'ghost'}
              onClick={() => setActiveView('tree')}
              className="flex items-center space-x-1"
            >
              <TreePine className="w-4 h-4" />
              <span>Process Flow</span>
            </Button>
            <Button
              size="sm"
              variant={activeView === 'custom' ? 'default' : 'ghost'}
              onClick={() => setActiveView('custom')}
              className="flex items-center space-x-1"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Custom</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeView === 'tree' ? (
        <SkillsTreeView
          skillTree={skillTree}
          loading={loading}
          editingFlowId={editingFlowId}
          editingFlowName={editingFlowName}
          setEditingFlowName={setEditingFlowName}
          handleFlowRename={handleFlowRename}
          startEditingFlow={startEditingFlow}
          onNodeClick={onNodeClick}
          selectedNode={selectedNode}
        />
      ) : (
        <CustomOrganizationView
          skillTree={skillTree}
          onNodeClick={onNodeClick}
          selectedNode={selectedNode}
        />
      )}
    </div>
  );
} 