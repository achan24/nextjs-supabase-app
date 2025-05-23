'use client';

import { Node } from 'reactflow';
import { useState, useEffect, useRef } from 'react';
import ClozeText from './ClozeText';
import FlashcardReview from './FlashcardReview';
import { createClient } from '@/lib/supabase';

interface CompletionRecord {
  completedAt: number;
  timeSpent: number;
  note?: string;
}

interface NodeDetailsProps {
  node: Node | null;
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  updateNode: (nodeId: string, data: any) => void;
  onStartReview: () => void;
  jumpToNode?: (flowId: string, nodeId: string) => void;
  currentFlow?: any;
  nodes: Node[];
}

export default function NodeDetails({ 
  node, 
  setNodes, 
  updateNode, 
  onStartReview, 
  jumpToNode,
  currentFlow,
  nodes 
}: NodeDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<'desc' | 'asc'>('desc');
  const [newNote, setNewNote] = useState('');
  const [label, setLabel] = useState(node?.data?.label || '');
  const [description, setDescription] = useState(node?.data?.description || '');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [newTag, setNewTag] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // State for link node editing
  const HARDCODED_USER_ID = '875d44ba-8794-4d12-ba86-48e5e90dc796';
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>(node?.data?.linkedFlowId || '');
  const [nodesInFlow, setNodesInFlow] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(node?.data?.linkedNodeId || '');
  const supabase = createClient();
  // Get unique tags from all nodes
  const [allMapTags, setAllMapTags] = useState<string[]>([]);

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setDescription(node.data.description || '');
    }
  }, [node]);

  useEffect(() => {
    if (textareaRef.current && isEditing) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      // Set the height to match the content
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [description, isEditing]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    // Auto-resize the textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'label' | 'description') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      if (node) {
        setLabel(node.data.label || '');
        setDescription(node.data.description || '');
      }
    }
  };

  const handleSave = () => {
    if (!node) return;
    updateNode(node.id, {
      label,
      description,
    });
    setIsEditing(false);
  };

  // Fetch all flows when a link node is selected
  useEffect(() => {
    if (node?.type === 'link') {
      supabase
        .from('process_flows')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          setFlows(Array.isArray(data) ? data : []);
        });
    }
  }, [node?.type]);

  // Fetch nodes for selected flow
  useEffect(() => {
    if (node?.type === 'link' && selectedFlowId) {
      supabase
        .from('process_flows')
        .select('*')
        .eq('id', selectedFlowId)
        .single()
        .then(({ data, error }) => {
          setNodesInFlow(Array.isArray(data?.nodes) ? data.nodes : []);
        });
    } else {
      setNodesInFlow([]);
    }
  }, [node?.type, selectedFlowId]);

  // Update node data when selection changes
  useEffect(() => {
    if (node?.type === 'link' && (selectedFlowId !== node.data?.linkedFlowId || selectedNodeId !== node.data?.linkedNodeId)) {
      updateNode(node.id, {
        linkedFlowId: selectedFlowId,
        linkedNodeId: selectedNodeId,
      });
    }
  }, [selectedFlowId, selectedNodeId]);

  // Fetch tags from all maps when component mounts
  useEffect(() => {
    const fetchAllTags = async () => {
      const { data: flows, error } = await supabase
        .from('process_flows')
        .select('nodes');
      
      if (error) {
        console.error('Error fetching tags:', error);
        return;
      }

      const allTags = new Set<string>();
      flows?.forEach(flow => {
        if (Array.isArray(flow.nodes)) {
          flow.nodes.forEach((node: any) => {
            if (Array.isArray(node.data?.tags)) {
              node.data.tags.forEach((tag: string) => allTags.add(tag));
            }
          });
        }
      });
      
      setAllMapTags(Array.from(allTags));
    };

    fetchAllTags();
  }, []);

  // Update suggestions when typing
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setNewTag(value);
    
    if (value.trim()) {
      const suggestions = allMapTags.filter(tag => 
        tag.toLowerCase().includes(value) && 
        !node?.data.tags?.includes(tag)
      );
      setTagSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setTagSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (tag: string) => {
    handleAddTag(tag);
    setShowSuggestions(false);
  };

  // Modified handleAddTag to work with both keyboard and click events
  const handleAddTag = async (tagToAdd?: string) => {
    if (!node) return;
    
    const tag = (tagToAdd || newTag).trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag) return;
    
    const currentTags: string[] = node.data.tags || [];
    if (!currentTags.includes(tag)) {
      const updatedData = {
        ...node.data,
        tags: [...currentTags, tag]
      };
      
      updateNode(node.id, updatedData);
      
      if (currentFlow?.id) {
        try {
          const { error } = await supabase
            .from('process_flows')
            .update({ 
              nodes: nodes.map(n => n.id === node.id ? { ...n, data: updatedData } : n)
            })
            .eq('id', currentFlow.id);
          
          if (error) {
            console.error('Error saving tag:', error);
            updateNode(node.id, { tags: currentTags });
          }
        } catch (error) {
          console.error('Error saving tag:', error);
        }
      }
    }
    setNewTag('');
    setShowSuggestions(false);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!node) return;
    const currentTags = node.data.tags || [];
    updateNode(node.id, {
      tags: currentTags.filter((tag: string) => tag !== tagToRemove)
    });
  };

  if (!node) {
    return (
      <div className="text-gray-500 text-center p-4">
        Select a node to view and edit its details
      </div>
    );
  }

  // Check if the node has any clozes
  const hasClozes = node.data.description?.includes('{{');

  const handleStartTimer = () => {
    if (!node) return;
    updateNode(node.id, {
      isRunning: true,
      startTime: Date.now(),
      status: 'active',
    });
  };

  const handleStopTimer = () => {
    if (!node) return;
    const now = Date.now();
    updateNode(node.id, {
      isRunning: false,
      timeSpent: ((node.data.timeSpent || 0) + (now - (node.data.startTime || now))),
      startTime: undefined,
      status: 'ready',
    });
  };

  const handleCompleteTask = () => {
    if (!node) return;
    const now = Date.now();
    const currentTimeSpent = node.data.isRunning 
      ? (node.data.timeSpent || 0) + (now - (node.data.startTime || now))
      : node.data.timeSpent || 0;

    const completionRecord: CompletionRecord = {
      completedAt: now,
      timeSpent: currentTimeSpent,
      note: newNote || undefined,
    };

    updateNode(node.id, {
      isRunning: false,
      timeSpent: 0,
      startTime: undefined,
      status: 'completed',
      completionHistory: [...(node.data.completionHistory || []), completionRecord],
    });
    setNewNote(''); // Reset note input
  };

  const handleResetTask = () => {
    if (!node) return;
    updateNode(node.id, {
      isRunning: false,
      timeSpent: 0,
      startTime: undefined,
      status: 'ready',
    });
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleEditNote = (record: CompletionRecord, newNote: string) => {
    if (!node) return;
    
    const updatedHistory = node.data.completionHistory?.map((rec: CompletionRecord) => {
      if (rec.completedAt === record.completedAt) {
        return { ...rec, note: newNote };
      }
      return rec;
    });

    updateNode(node.id, {
      completionHistory: updatedHistory,
    });
    setEditingNoteId(null);
  };

  // Add this function to handle jump (to be implemented)
  const handleJumpToLink = () => {
    // TODO: Implement navigation to linked node in another flow
    alert('Jump to linked node!');
  };

  return (
    <div className="space-y-4">
      {/* Show link reference if node is a link node */}
      {node?.type === 'link' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="font-medium text-blue-800 mb-1">Linked Node</div>
          <div className="mb-2">
            <label className="block mb-1 font-medium">Select Flow</label>
            <select className="w-full border rounded px-2 py-1" value={selectedFlowId} onChange={e => setSelectedFlowId(e.target.value)}>
              <option value="">-- Choose a flow --</option>
              {flows.map(flow => (
                <option key={flow.id} value={flow.id}>{flow.title}</option>
              ))}
            </select>
          </div>
          {selectedFlowId && (
            <div className="mb-2">
              <label className="block mb-1 font-medium">Select Node</label>
              <select className="w-full border rounded px-2 py-1" value={selectedNodeId} onChange={e => setSelectedNodeId(e.target.value)}>
                <option value="">-- Choose a node --</option>
                {nodesInFlow.map(n => (
                  <option key={n.id} value={n.id}>{n.data?.label || n.id}</option>
                ))}
              </select>
            </div>
          )}
          <button
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
            disabled={!selectedFlowId || !selectedNodeId}
            onClick={async () => {
              if (!jumpToNode) return;
              // Fetch the target flow and node
              const { data: flow } = await supabase
                .from('process_flows')
                .select('*')
                .eq('id', selectedFlowId)
                .single();
              if (flow) {
                const targetNode = (flow.nodes || []).find((n: any) => n.id === selectedNodeId);
                if (targetNode) {
                  // Add reference if not present
                  const ref = {
                    linkNodeId: node?.id,
                    flowId: node?.data?.linkedFlowId || flow.id,
                    flowTitle: flow.title,
                    linkNodeLabel: node?.data?.label || 'Node Link',
                    createdAt: new Date().toISOString(),
                  };
                  const referencedBy = Array.isArray(targetNode.data?.referencedBy) ? targetNode.data.referencedBy : [];
                  if (!referencedBy.some((r: any) => r.linkNodeId === ref.linkNodeId && r.flowId === ref.flowId)) {
                    targetNode.data = {
                      ...targetNode.data,
                      referencedBy: [...referencedBy, ref],
                    };
                    // Save the updated node in the flow
                    const updatedNodes = (flow.nodes || []).map((n: any) => n.id === selectedNodeId ? targetNode : n);
                    await supabase
                      .from('process_flows')
                      .update({ nodes: updatedNodes })
                      .eq('id', selectedFlowId);
                  }
                }
              }
              jumpToNode(selectedFlowId, selectedNodeId);
            }}
          >
            Jump to Node
          </button>
        </div>
      )}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Node Details</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'label')}
              className="w-full px-2 py-1 border rounded"
              placeholder="Node label"
            />
            <textarea
              ref={textareaRef}
              value={description}
              onChange={handleTextareaChange}
              onKeyDown={(e) => handleKeyDown(e, 'description')}
              className="w-full px-2 py-1 border rounded min-h-[100px]"
              placeholder="Node description"
            />
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        ) : (
          <div>
            <h4 className="font-medium">{label}</h4>
            <div className="mt-1 text-gray-600 whitespace-pre-wrap">
              <ClozeText text={description} isTestMode={false} />
            </div>
          </div>
        )}

        {/* Tags Section */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
          <div className="flex flex-wrap gap-2 mb-2">
            {(node?.data?.tags || []).map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs flex items-center"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              value={newTag}
              onChange={handleTagInputChange}
              onKeyDown={handleTagKeyDown}
              onFocus={() => setShowSuggestions(tagSuggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Add a tag..."
              className="w-full px-2 py-1 text-sm border rounded-md"
            />
            {showSuggestions && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                {tagSuggestions.map((tag) => (
                  <div
                    key={tag}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => handleSuggestionClick(tag)}
                  >
                    #{tag}
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Press Enter to add a tag
          </p>
        </div>
      </div>
      {isEditing && (
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => {
              setIsEditing(false);
              setLabel(node.data.label || '');
              setDescription(node.data.description || '');
            }}
            className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      )}

      {node.type === 'task' && (
        <>
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Timer Controls</h4>
            <div className="flex flex-wrap gap-2">
              {!node.data.isRunning ? (
                <button
                  onClick={handleStartTimer}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Start Timer
                </button>
              ) : (
                <button
                  onClick={handleStopTimer}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Stop Timer
                </button>
              )}
              <div className="w-full mt-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this completion..."
                  className="w-full p-2 text-sm border rounded-md"
                  rows={2}
                />
              </div>
              <button
                onClick={handleCompleteTask}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Complete Task
              </button>
              <button
                onClick={handleResetTask}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Reset Timer
              </button>
            </div>
          </div>

          {node.data.completionHistory && node.data.completionHistory.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Completion History ({node.data.completionHistory.length})
                </h4>
                <button
                  onClick={() => setHistoryOrder(historyOrder === 'desc' ? 'asc' : 'desc')}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {historyOrder === 'desc' ? 'Oldest First' : 'Newest First'}
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...node.data.completionHistory]
                  .sort((a, b) => historyOrder === 'desc' ? b.completedAt - a.completedAt : a.completedAt - b.completedAt)
                  .map((record: CompletionRecord, index: number) => (
                    <div 
                      key={record.completedAt}
                      className="text-xs p-2 bg-gray-50 rounded"
                    >
                      <div className="flex justify-between items-center">
                        <span>{formatDate(record.completedAt)}</span>
                        <span className="text-gray-500">
                          Time: {formatTime(record.timeSpent)}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-600">
                        {editingNoteId === record.completedAt ? (
                          <div className="flex flex-col space-y-2">
                            <textarea
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              className="w-full p-1 text-sm border rounded"
                              rows={2}
                              autoFocus
                              placeholder="Add a note about this completion..."
                            />
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setEditingNoteId(null)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditNote(record, editingNoteText)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <span>{record.note || 'No note added'}</span>
                            <button
                              onClick={() => {
                                setEditingNoteId(record.completedAt);
                                setEditingNoteText(record.note || '');
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 ml-2"
                            >
                              {record.note ? 'Edit' : 'Add Note'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {Array.isArray(node?.data?.referencedBy) && node.data.referencedBy.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Referenced by</h4>
              <div className="space-y-2">
                {node.data.referencedBy.map((ref: any) => (
                  <div key={ref.linkNodeId + ref.flowId} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span>
                      <span className="font-bold">{ref.flowTitle || 'Unknown Map'}</span>
                      <span className="mx-1">–</span>
                      <span>{ref.linkNodeLabel || 'Link'}</span>
                      {ref.createdAt && (
                        <span className="ml-2 text-xs text-gray-500">{new Date(ref.createdAt).toLocaleDateString()}</span>
                      )}
                    </span>
                    <button
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={() => jumpToNode && jumpToNode(ref.flowId, ref.linkNodeId)}
                    >
                      Jump to Link
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flashcard Review History */}
          {node.data.clozeStats && Object.keys(node.data.clozeStats).length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Flashcard Review History
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(node.data.clozeStats).map(([id, card]: [string, any]) => (
                  <div 
                    key={id}
                    className="text-xs p-2 bg-gray-50 rounded"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-900">{card.content}</span>
                      <span className="text-gray-500">
                        {card.stats.lastReviewed ? formatDate(card.stats.lastReviewed) : 'Never reviewed'}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Correct: {card.stats.correctCount}</span>
                      <span>Incorrect: {card.stats.incorrectCount}</span>
                      {card.stats.correctCount + card.stats.incorrectCount > 0 && (
                        <span>
                          Accuracy: {Math.round((card.stats.correctCount / (card.stats.correctCount + card.stats.incorrectCount)) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 