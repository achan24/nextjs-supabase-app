'use client';

import type { Node } from 'reactflow';
import { useState, useEffect, useRef, useMemo } from 'react';
import ClozeText from './ClozeText';
import FlashcardReview from './FlashcardReview';
import { createClient } from '@/lib/supabase';
import { useNotifications } from '@/contexts/NotificationContext';

interface CompletionRecord {
  timeSpent: number;
  completedAt: number; // Unix timestamp in milliseconds
  note?: string;
}

interface CueRecord {
  id: string;
  text: string;
  createdAt: number;
  lastUsed?: number;
  useCount: number;
  archived: boolean;
}

interface Reminder {
  id?: string;
  type: 'before' | 'at';
  minutes_before?: number;
  time?: string;
  sent_at?: string;
}

interface NodeDetailsProps {
  node: Node | null;
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  updateNode: (nodeId: string, data: any) => void;
  onStartReview: () => void;
  jumpToNode?: (flowId: string, nodeId: string) => void;
}

export default function NodeDetails({ node, setNodes, updateNode, onStartReview, jumpToNode }: NodeDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<'asc' | 'desc'>('desc');
  const [newNote, setNewNote] = useState('');
  const [label, setLabel] = useState(node?.data?.label || '');
  const [description, setDescription] = useState(node?.data?.description || '');
  const [newCueText, setNewCueText] = useState('');
  const [showArchivedCues, setShowArchivedCues] = useState(false);
  const [showCueHistory, setShowCueHistory] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // State for link node editing
  const HARDCODED_USER_ID = '875d44ba-8794-4d12-ba86-48e5e90dc796';
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>(node?.data?.linkedFlowId || '');
  const [nodesInFlow, setNodesInFlow] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(node?.data?.linkedNodeId || '');
  const supabase = createClient();
  const notificationContext = useNotifications();

  // Calculate average time from completion history
  const avgTime = useMemo(() => {
    if (!node?.data?.completionHistory?.length) return null;
    const total = node.data.completionHistory.reduce((sum: number, record: CompletionRecord) => 
      sum + (record.timeSpent || 0), 0);
    return Math.round(total / node.data.completionHistory.length);
  }, [node?.data?.completionHistory]);

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

  // Fetch all unique tags from all flows
  const fetchAllTags = async () => {
    try {
      const { data: flows, error } = await supabase
        .from('process_flows')
        .select('nodes');
      
      if (error) throw error;

      const uniqueTags = new Set<string>();
      flows?.forEach(flow => {
        flow.nodes?.forEach((node: any) => {
          node.data?.tags?.forEach((tag: string) => {
            uniqueTags.add(tag.toLowerCase());
          });
        });
      });

      return Array.from(uniqueTags).sort();
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  };

  // Update suggestions when typing
  useEffect(() => {
    const updateSuggestions = async () => {
      if (tagInput.trim() && node) {
        const allTags = await fetchAllTags();
        const filteredTags = allTags.filter(tag => 
          tag.toLowerCase().includes(tagInput.toLowerCase()) && 
          !node.data.tags?.includes(tag)
        );
        setTagSuggestions(filteredTags);
        setShowSuggestions(true);
      } else {
        setTagSuggestions([]);
        setShowSuggestions(false);
      }
    };
    updateSuggestions();
  }, [tagInput, node?.data.tags]);

  const handleTagSelect = (tag: string) => {
    if (!node) return;
    const currentTags = node.data.tags || [];
    if (!currentTags.includes(tag)) {
      updateNode(node.id, {
        tags: [...currentTags, tag]
      });
    }
    setTagInput('');
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Fetch notes when editing a note reference node
  useEffect(() => {
    if (node?.type === 'noteRef') {
      const fetchNotes = async () => {
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, content, created_at')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching notes:', error);
          return;
        }

        setNotes(data || []);
      };

      fetchNotes();
    }
  }, [node?.type]);

  const handleNoteSelect = async (noteId: string) => {
    if (!node) return;
    
    const selectedNote = notes.find(n => n.id === noteId);
    if (!selectedNote) return;

    updateNode(node.id, {
      noteId,
      note: selectedNote,
      label: selectedNote.title
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
    const now = Date.now(); // Get current timestamp in milliseconds
    const currentTimeSpent = node.data.timeSpent || 0;

    const completionRecord: CompletionRecord = {
      completedAt: now,
      timeSpent: currentTimeSpent,
      note: newNote || undefined,
    };

    // Parse value from label if it exists
    let value = node.data.value;
    if (node.data.label) {
      const valueMatch = node.data.label.match(/VALUE:\s*(-?\d+)/);
      if (valueMatch) {
        value = Number(valueMatch[1]);
      }
    }

    updateNode(node.id, {
      isRunning: false,
      timeSpent: 0,
      startTime: undefined,
      status: 'completed',
      value: value,
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

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      const currentTags = node?.data?.tags || [];
      if (!currentTags.includes(newTag)) {
        updateNode(node.id, {
          tags: [...currentTags, newTag]
        });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = node?.data?.tags || [];
    updateNode(node.id, {
      tags: currentTags.filter((tag: string) => tag !== tagToRemove)
    });
  };

  const handleAddCue = () => {
    if (!node || !newCueText.trim()) return;
    const newCue = {
      id: Date.now().toString(),
      text: newCueText.trim(),
      createdAt: Date.now(),
      useCount: 0,
      archived: false,
    };
    const currentCues = node.data.cues || [];
    updateNode(node.id, {
      cues: [...currentCues, newCue],
      activeCueId: newCue.id, // Make the new cue active
    });
    setNewCueText('');
  };

  const handleActivateCue = (cueId: string) => {
    if (!node) return;
    const cues = node.data.cues || [];
    const updatedCues = cues.map((cue: CueRecord) => 
      cue.id === cueId 
        ? { ...cue, lastUsed: Date.now(), useCount: cue.useCount + 1 }
        : cue
    );
    updateNode(node.id, {
      cues: updatedCues,
      activeCueId: cueId,
    });
  };

  const handleArchiveCue = (cueId: string) => {
    if (!node) return;
    const cues = node.data.cues || [];
    const updatedCues = cues.map((cue: CueRecord) => 
      cue.id === cueId ? { ...cue, archived: !cue.archived } : cue
    );
    updateNode(node.id, {
      cues: updatedCues,
      activeCueId: node.data.activeCueId === cueId ? undefined : node.data.activeCueId,
    });
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
        <label className="block text-sm font-medium text-gray-700">Label</label>
        {isEditing ? (
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'label')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base p-2"
            autoFocus
          />
        ) : (
          <div 
            className="mt-1 text-sm cursor-pointer hover:text-blue-600"
            onClick={() => setIsEditing(true)}
          >
            {node.data.label || 'Untitled'}
          </div>
        )}
      </div>

      {node.type === 'task' && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Task Cues</label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCueHistory(!showCueHistory)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {showCueHistory ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Hide History
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Show History
                  </>
                )}
              </button>
              {showCueHistory && (
                <button
                  onClick={() => setShowArchivedCues(!showArchivedCues)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showArchivedCues ? 'Hide Archived' : 'Show Archived'}
                </button>
              )}
            </div>
          </div>
          
          {/* Add new cue */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCueText}
              onChange={(e) => setNewCueText(e.target.value)}
              placeholder="Add a new cue..."
              className="flex-1 px-2 py-1 text-sm border rounded"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCue();
                }
              }}
            />
            <button
              onClick={handleAddCue}
              disabled={!newCueText.trim()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Add Cue
            </button>
          </div>

          {/* Cues history */}
          {showCueHistory && (
            <div className="space-y-2 transition-all duration-200">
              {(node.data.cues || [])
                .filter((cue: CueRecord) => showArchivedCues || !cue.archived)
                .sort((a: CueRecord, b: CueRecord) => (b.lastUsed || b.createdAt) - (a.lastUsed || a.createdAt))
                .map((cue: CueRecord) => {
                  // Get the cue's number based on creation order
                  const cueNumber = (node.data.cues || [])
                    .sort((a: CueRecord, b: CueRecord) => a.createdAt - b.createdAt)
                    .findIndex((c: CueRecord) => c.id === cue.id) + 1;
                  
                  return (
                    <div 
                      key={cue.id}
                      className={`p-3 rounded-lg border ${
                        cue.archived 
                          ? 'bg-gray-50 border-gray-200'
                          : node.data.activeCueId === cue.id
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="font-medium text-gray-500 mr-2">#{cueNumber}</span>
                            {cue.text}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            Used {cue.useCount} times · Last used {cue.lastUsed ? new Date(cue.lastUsed).toLocaleDateString() : 'never'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!cue.archived && (
                            <button
                              onClick={() => handleActivateCue(cue.id)}
                              disabled={node.data.activeCueId === cue.id}
                              className={`px-2 py-1 text-xs rounded ${
                                node.data.activeCueId === cue.id
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              }`}
                            >
                              {node.data.activeCueId === cue.id ? 'Active' : 'Activate'}
                            </button>
                          )}
                          <button
                            onClick={() => handleArchiveCue(cue.id)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                          >
                            {cue.archived ? 'Unarchive' : 'Archive'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <div className="flex space-x-2">
            {node.data.description && (
              <button
                onClick={() => updateNode(node.id, { isTestMode: !node.data.isTestMode })}
                className={`px-2 py-1 text-xs rounded ${
                  node.data.isTestMode ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {node.data.isTestMode ? 'Test Mode' : 'Reveal Mode'}
              </button>
            )}
            {hasClozes && (
              <button
                onClick={onStartReview}
                className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
              >
                Review Flashcards
              </button>
            )}
          </div>
        </div>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={description}
            onChange={handleTextareaChange}
            onKeyDown={(e) => handleKeyDown(e, 'description')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base p-2 min-h-[100px] overflow-hidden resize-none"
            placeholder="Use {{...}} to create cloze deletions"
          />
        ) : (
          <div 
            className="mt-1 text-sm text-black cursor-pointer hover:text-blue-600 whitespace-pre-wrap"
            onClick={() => setIsEditing(true)}
          >
            {node.data.description ? (
              <ClozeText 
                text={node.data.description} 
                isTestMode={!!node.data.isTestMode}
                onReveal={(word: string) => console.log(`Revealed word: ${word}`)}
              />
            ) : (
              'No description'
            )}
          </div>
        )}
      </div>

      {/* Add tags section */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {node.data.tags?.map((tag: string) => (
            <span 
              key={tag} 
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm flex items-center gap-1"
            >
              #{tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-red-500 focus:outline-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="relative">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              e.stopPropagation(); // Prevent click from closing suggestions
            }}
            onKeyDown={(e) => {
              e.stopPropagation(); // Prevent click from closing suggestions
              if (e.key === 'Enter' && tagInput.trim()) {
                e.preventDefault();
                if (tagSuggestions.length > 0) {
                  handleTagSelect(tagSuggestions[0]);
                } else {
                  handleAddTag(e);
                }
              }
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent click from closing suggestions
              if (tagInput.trim()) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Add tag and press Enter"
            className="w-full px-2 py-1 border rounded text-sm"
          />
          {showSuggestions && tagSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {tagSuggestions.map((tag) => (
                <div
                  key={tag}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => handleTagSelect(tag)}
                >
                  #{tag}
                </div>
              ))}
            </div>
          )}
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
        <div className="mt-4 space-y-4">
          {/* Timer Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              Time Spent: {formatTime(node.data.timeSpent || 0)}
              {avgTime !== null && ` / Avg: ${formatTime(avgTime)}`}
            </div>
            <div className="space-x-2">
              {!node.data.isRunning ? (
                <button
                  onClick={handleStartTimer}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Start
                </button>
              ) : (
                <button
                  onClick={handleStopTimer}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Metric Value Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Metric Value
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={node.data.value || ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : undefined;
                  updateNode(node.id, { 
                    value,
                    label: value !== undefined ? 
                      `${node.data.label.split('VALUE:')[0]}VALUE: ${value}`.trim() :
                      node.data.label.split('VALUE:')[0].trim()
                  });
                }}
                placeholder="Enter value"
                className="flex-1 px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <button
                onClick={() => updateNode(node.id, { 
                  value: undefined,
                  label: node.data.label.split('VALUE:')[0].trim()
                })}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
            <p className="text-sm text-gray-500">
              This value will be used in calculations when the task is completed
            </p>
          </div>

          {/* Task Status Controls */}
          <div className="flex justify-between items-center">
            <div className="text-sm">
              Status: <span className="font-medium">{node.data.status || 'ready'}</span>
            </div>
            <div className="space-x-2">
              {node.data.status !== 'completed' ? (
                <button
                  onClick={handleCompleteTask}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Complete
                </button>
              ) : (
                <button
                  onClick={handleResetTask}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Completion History */}
          {node.data.completionHistory && node.data.completionHistory.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Completion History</h4>
                <button
                  onClick={() => setHistoryOrder(order => order === 'desc' ? 'asc' : 'desc')}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  {historyOrder === 'desc' ? '↓ Latest First' : '↑ Earliest First'}
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {node.data.completionHistory?.sort((a: CompletionRecord, b: CompletionRecord) => {
                  return historyOrder === 'desc' 
                    ? b.completedAt - a.completedAt 
                    : a.completedAt - b.completedAt;
                }).map((record: CompletionRecord) => (
                  <div key={record.completedAt} className="p-2 bg-gray-50 rounded">
                    <div className="flex justify-between items-center">
                      <span>{formatDate(record.completedAt)}</span>
                      <span className="text-gray-500">
                        Time: {formatTime(record.timeSpent)}
                      </span>
                    </div>
                    {record.note && (
                      <div className="mt-1 text-sm text-gray-600">{record.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {node.type === 'noteRef' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Note</label>
          <select
            value={node.data.noteId || ''}
            onChange={(e) => handleNoteSelect(e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
          >
            <option value="">-- Select a note --</option>
            {notes.map((note) => (
              <option key={note.id} value={note.id}>
                {note.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Checklist Content */}
      {node.type === 'checklist' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Checklist Items</label>
          <textarea
            value={node.data.text || ''}
            onChange={(e) => updateNode(node.id, { text: e.target.value })}
            placeholder="Enter items (one per line)"
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            rows={5}
          />
          <p className="mt-2 text-sm text-gray-500">
            Each line will become a checkbox item
          </p>
        </div>
      )}

      {/* Calculation Node Controls */}
      {node.type === 'calculation' && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Current Value:</span>
            <span className="text-lg font-bold text-teal-600">{node.data.value || 0}</span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => {
                // Trigger recalculation by updating a dummy value
                updateNode(node.id, { lastProcessed: Date.now() });
              }}
              className="flex-1 px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              Process
            </button>
            <button
              onClick={() => {
                const showDetails = !node.data.showDetails;
                updateNode(node.id, { 
                  showDetails,
                  description: showDetails && node.data.calculationSteps ? 
                    node.data.calculationSteps.join('\n') : ''
                });
              }}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {node.data.showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {node.data.showDetails && node.data.calculationSteps && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Calculation Details:</h4>
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded border">
                {node.data.calculationSteps.join('\n')}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 