'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import React from 'react';

interface SkillNode {
  id: string;
  label: string;
  type: string;
  parentId?: string;
  children?: SkillNode[];
}

// Build tree with process flows as top level, skills/targets nested under flows based on edges
function buildProcessFlowTreeWithEdges(allNodes: any[], allEdges: any[], processFlowsData: any[]): any[] {
  const flowMap: Record<string, any> = {};
  
  // Create flow nodes
  processFlowsData.forEach(flow => {
    flowMap[flow.id] = {
      id: `flow-${flow.id}`,
      label: flow.title || 'Untitled Flow',
      type: 'flow',
      children: [],
      flowId: flow.id
    };
  });

  // Group skills and targets by their flow
  allNodes.forEach(node => {
    if ((node.type === 'skill' || node.type === 'target') && node.flow_id) {
      const flowNode = flowMap[node.flow_id];
      if (flowNode) {
        flowNode.children.push({
          id: node.id,
          label: node.data?.label || node.title || 'Untitled',
          type: node.type,
          children: []
        });
      }
    }
  });

  // Build parent-child relationships based on edges
  Object.values(flowMap).forEach((flowNode: any) => {
    const nodeMap: Record<string, any> = {};
    flowNode.children.forEach((node: any) => {
      nodeMap[node.id] = node;
    });

    // Find edges within this flow
    const flowEdges = allEdges.filter(edge => edge.flow_id === flowNode.flowId);
    
    console.log(`Flow "${flowNode.label}" nodes:`, flowNode.children.map((n: any) => ({
      id: n.id,
      label: n.label,
      type: n.type
    })));
    console.log(`Flow "${flowNode.label}" edges:`, flowEdges);

    // Build parent-child relationships from edges
    flowEdges.forEach(edge => {
      const sourceNode = nodeMap[edge.source];
      const targetNode = nodeMap[edge.target];
      
      if (sourceNode && targetNode) {
        console.log(`Edge: ${sourceNode.label} (${sourceNode.type}) -> ${targetNode.label} (${targetNode.type})`);
        
        // If source is a skill and target is a target, make target a child of skill
        if (sourceNode.type === 'skill' && targetNode.type === 'target') {
          sourceNode.children.push(targetNode);
          console.log(`Made ${targetNode.label} a child of ${sourceNode.label}`);
        }
        // If source is a target and target is a skill, make skill a child of target
        else if (sourceNode.type === 'target' && targetNode.type === 'skill') {
          targetNode.children.push(sourceNode);
          console.log(`Made ${sourceNode.label} a child of ${targetNode.label}`);
        }
      }
    });

    // Keep only root nodes (nodes that aren't children of other nodes)
    const childIds = new Set();
    flowNode.children.forEach((node: any) => {
      node.children.forEach((child: any) => {
        childIds.add(child.id);
      });
    });

    flowNode.children = flowNode.children.filter((node: any) => !childIds.has(node.id));
  });

  return Object.values(flowMap).filter((flowNode: any) => 
    flowNode.children.some((node: any) => node.type === 'skill')
  );
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
          padding: '6px 8px',
          fontSize: '14px',
          borderRadius: '4px',
          transition: 'background-color 0.2s',
          userSelect: 'none',
          backgroundColor: selectedNode?.id === node.id ? '#e0f2fe' : 'transparent'
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

export default function SkillsExplorerClient() {
  const supabase = createClient();
  const [skillTree, setSkillTree] = useState<SkillNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugNodes, setDebugNodes] = useState<SkillNode[]>([]);
  const [debugRawNodes, setDebugRawNodes] = useState<any[]>([]);
  const [debugEdges, setDebugEdges] = useState<any[]>([]);
  const [debugTypeCounts, setDebugTypeCounts] = useState<Record<string, any>>({});
  const [debugTotalNodes, setDebugTotalNodes] = useState<number>(0);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editingFlowName, setEditingFlowName] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    async function loadSkills() {
      setLoading(true);
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('Current user:', user?.id);
        
        if (userError) {
          console.error('User error:', userError);
          setDebugTotalNodes(-1);
          setDebugTypeCounts({ error: 'User auth failed' });
          return;
        }

        if (!user) {
          console.error('No user found');
          setDebugTotalNodes(-1);
          setDebugTypeCounts({ error: 'No authenticated user' });
          return;
        }

        // Query process_flows to get nodes stored as JSONB
        const { data: processFlowsData, error } = await supabase
          .from('process_flows')
          .select('id, title, nodes, edges');

        console.log('Process flows query result:', { data: processFlowsData, error });

        if (error) {
          console.error('Database error:', error);
          setDebugTotalNodes(-1);
          setDebugTypeCounts({ error: error.message });
          return;
        }

        // Extract all nodes and edges from all process flows
        const allNodes: any[] = [];
        const allEdges: any[] = [];
        processFlowsData?.forEach(flow => {
          if (flow.nodes && Array.isArray(flow.nodes)) {
            flow.nodes.forEach((node: any) => {
              allNodes.push({
                ...node,
                flow_id: flow.id,
                flow_title: flow.title
              });
            });
          }
          if (flow.edges && Array.isArray(flow.edges)) {
            flow.edges.forEach((edge: any) => {
              allEdges.push({
                ...edge,
                flow_id: flow.id
              });
            });
          }
        });

        console.log('Sample skill node:', allNodes.find(n => n.type === 'skill'));
        console.log('Sample target node:', allNodes.find(n => n.type === 'target'));
        console.log('Sample edges:', allEdges.slice(0, 3));

        setDebugRawNodes(allNodes);
        setDebugEdges(allEdges);
        setDebugTotalNodes(allNodes.length);

        // Count node types
        const typeCounts: Record<string, any> = {};
        allNodes.forEach(node => {
          typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
        });
        setDebugTypeCounts(typeCounts);

        // Build the process flow tree with edge-based hierarchy
        const processFlowTree = buildProcessFlowTreeWithEdges(allNodes, allEdges, processFlowsData || []);
        setSkillTree(processFlowTree);
        setDebugNodes(processFlowTree);
      } catch (err) {
        console.error('Unexpected error:', err);
        setDebugTotalNodes(-1);
        setDebugTypeCounts({ error: 'Unexpected error occurred' });
      } finally {
        setLoading(false);
      }
    }

    loadSkills();
  }, []);

  // Handle flow rename
  const handleFlowRename = (flowId: string, newName: string) => {
    setSkillTree(prevTree => 
      prevTree.map(flow => 
        flow.id === flowId 
          ? { ...flow, label: newName }
          : flow
      )
    );
    setEditingFlowId(null);
    setEditingFlowName('');
  };

  // Start editing a flow
  const startEditingFlow = (flowId: string, currentName: string) => {
    setEditingFlowId(flowId);
    setEditingFlowName(currentName);
  };

  // Handle node selection
  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Skills Explorer</h1>
      
      <div className="flex gap-6">
        {/* Skills Tree */}
        <div className="w-1/3">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Skills & Targets</h2>
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
                    onNodeClick={handleNodeClick}
                    selectedNode={selectedNode}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Skill Details */}
        <div className="w-2/3">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Skill Details</h2>
            {selectedNode ? (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedNode.label}</h3>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    selectedNode.type === 'skill' ? 'bg-blue-100 text-blue-800' :
                    selectedNode.type === 'target' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedNode.type.toUpperCase()}
                  </span>
                </div>
                
                {/* Basic Info */}
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">ID:</span>
                    <span className="ml-2 text-sm text-gray-600 font-mono">{selectedNode.id}</span>
                  </div>
                </div>

                {/* Skill-specific details */}
                {selectedNode.type === 'skill' && (
                  <div className="space-y-4">
                    {/* Stats from practice history */}
                    {selectedNode.data?.practiceHistory && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">📊 Practice Stats</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {selectedNode.data.practiceHistory.length || 0}
                            </div>
                            <div className="text-sm text-gray-600">Total Sessions</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {selectedNode.data.practiceHistory?.filter((p: any) => p.completed)?.length || 0}
                            </div>
                            <div className="text-sm text-gray-600">Completed</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Description/Notes from actual data */}
                    {selectedNode.data?.description && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">📝 Description</h4>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-700">{selectedNode.data.description}</p>
                        </div>
                      </div>
                    )}

                    {/* Raw data for debugging */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">🔧 Raw Data</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <pre className="text-xs text-gray-700 overflow-auto">
                          {JSON.stringify(selectedNode.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Target-specific details */}
                {selectedNode.type === 'target' && (
                  <div className="space-y-4">
                    {/* Target value from actual data */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">🎯 Target</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-gray-900">
                            {selectedNode.data?.target || selectedNode.data?.value || 'N/A'}
                          </span>
                          {selectedNode.data?.unit && (
                            <span className="text-gray-600">{selectedNode.data.unit}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress if available */}
                    {selectedNode.data?.currentValue && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">📊 Progress</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Current:</span>
                            <span className="font-medium">{selectedNode.data.currentValue}</span>
                          </div>
                          {selectedNode.data?.target && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.min(100, (selectedNode.data.currentValue / selectedNode.data.target) * 100)}%` 
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Description from actual data */}
                    {selectedNode.data?.description && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">📝 Description</h4>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-700">{selectedNode.data.description}</p>
                        </div>
                      </div>
                    )}

                    {/* Raw data for debugging */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">🔧 Raw Data</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <pre className="text-xs text-gray-700 overflow-auto">
                          {JSON.stringify(selectedNode.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Children */}
                {selectedNode.children && selectedNode.children.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">🔗 Connected Items</h4>
                    <div className="space-y-1">
                      {selectedNode.children.map((child: any) => (
                        <div key={child.id} className="flex items-center space-x-2 text-sm p-2 bg-gray-50 rounded">
                          <span>{child.type === 'skill' ? '⚔️' : '🎯'}</span>
                          <span className="font-medium">{child.label}</span>
                          <span className="text-xs text-gray-500">({child.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">Select a skill or target to view details</div>
            )}
          </Card>
        </div>
      </div>

      {/* Debug Info */}
      <div style={{ background: '#222', color: '#fff', border: '2px solid #f00', padding: '1rem', borderRadius: '8px', marginTop: '2rem', fontSize: '12px' }}>
        <strong>DEBUG: Total nodes loaded: {debugTotalNodes}</strong>
        {debugTotalNodes === -1 && <div style={{ color: '#ff6b6b' }}>❌ ERROR: {JSON.stringify(debugTypeCounts)}</div>}
        <br />
        <strong>DEBUG: Node type counts:</strong> {JSON.stringify(debugTypeCounts)}
        <br />
        <strong>DEBUG: Raw nodesData ({debugRawNodes.length} items):</strong>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '1rem', maxHeight: '200px', overflow: 'auto' }}>{JSON.stringify(debugRawNodes, null, 2)}</pre>
        <strong>DEBUG: Filtered SkillNodes ({debugNodes.length} items):</strong>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '1rem', maxHeight: '200px', overflow: 'auto' }}>{JSON.stringify(debugNodes, null, 2)}</pre>
        <strong>DEBUG: Built SkillTree ({skillTree.length} root items):</strong>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflow: 'auto' }}>{JSON.stringify(skillTree, null, 2)}</pre>
      </div>

      {/* Skills & Targets Debug Section */}
      <div style={{ background: '#1a1a1a', color: '#00ff00', border: '2px solid #00ff00', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '12px' }}>
        <strong>🎯 SKILLS & TARGETS DEBUG:</strong>
        <br />
        <strong>Skills found:</strong>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '1rem', maxHeight: '150px', overflow: 'auto' }}>
          {JSON.stringify(debugRawNodes.filter(n => n.type === 'skill'), null, 2)}
        </pre>
        <strong>Targets found:</strong>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '1rem', maxHeight: '150px', overflow: 'auto' }}>
          {JSON.stringify(debugRawNodes.filter(n => n.type === 'target'), null, 2)}
        </pre>
        <strong>Edges found:</strong>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '150px', overflow: 'auto' }}>
          {JSON.stringify(debugEdges, null, 2)}
        </pre>
        <strong>Skills with their connections:</strong>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '150px', overflow: 'auto' }}>
          {JSON.stringify(debugRawNodes.filter(n => n.type === 'skill').map(skill => {
            const outgoingEdges = debugEdges.filter(e => e.source === skill.id);
            const incomingEdges = debugEdges.filter(e => e.target === skill.id);
            return {
              skill: { id: skill.id, label: skill.data?.label || skill.title, type: skill.type },
              outgoing: outgoingEdges.map(e => ({ target: e.target, targetType: debugRawNodes.find(n => n.id === e.target)?.type })),
              incoming: incomingEdges.map(e => ({ source: e.source, sourceType: debugRawNodes.find(n => n.id === e.source)?.type }))
            };
          }), null, 2)}
        </pre>
        <strong>Targets with their connections:</strong>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '150px', overflow: 'auto' }}>
          {JSON.stringify(debugRawNodes.filter(n => n.type === 'target').map(target => {
            const outgoingEdges = debugEdges.filter(e => e.source === target.id);
            const incomingEdges = debugEdges.filter(e => e.target === target.id);
            return {
              target: { id: target.id, label: target.data?.label || target.title, type: target.type },
              outgoing: outgoingEdges.map(e => ({ target: e.target, targetType: debugRawNodes.find(n => n.id === e.target)?.type })),
              incoming: incomingEdges.map(e => ({ source: e.source, sourceType: debugRawNodes.find(n => n.id === e.source)?.type }))
            };
          }), null, 2)}
        </pre>
      </div>
    </div>
  );
} 