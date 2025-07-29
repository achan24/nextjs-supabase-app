'use client';

import type { Node } from 'reactflow';
import { useState, useEffect, useRef, useCallback } from 'react';
import ClozeText from './ClozeText';
import FlashcardReview from './FlashcardReview';
import { createClient } from '@/lib/supabase';
import { useNotifications } from '@/contexts/NotificationContext';
import { toast } from 'sonner';
import { useTaskTimer } from '@/contexts/TaskTimerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CompletionRecord {
  completedAt: number;
  timeSpent: number;
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
  const [historyOrder, setHistoryOrder] = useState<'desc' | 'asc'>('desc');
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
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; type: string; }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // State for link node editing
  const HARDCODED_USER_ID = '875d44ba-8794-4d12-ba86-48e5e90dc796';
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>(node?.data?.linkedFlowId || '');
  const [nodesInFlow, setNodesInFlow] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(node?.data?.linkedNodeId || '');
  const supabase = createClient();
  const { startTimer, stopTimer, resetTimer } = useTaskTimer();

  // Add state for skill-specific fields
  const [skillLevel, setSkillLevel] = useState(node?.data?.level || 0);
  const [effectiveness, setEffectiveness] = useState(node?.data?.effectiveness || 0);
  const [lastPracticed, setLastPracticed] = useState(node?.data?.lastPracticed || null);

  // Update skill-specific fields
  const handleSkillUpdate = useCallback(() => {
    if (node && node.type === 'skill') {
      updateNode(node.id, {
        ...node.data,
        level: skillLevel,
        effectiveness: effectiveness,
        lastPracticed: lastPracticed || new Date()
      });
    }
  }, [node, skillLevel, effectiveness, lastPracticed, updateNode]);

  // Practice button handler
  const handlePractice = useCallback(() => {
    if (node && node.type === 'skill') {
      setLastPracticed(new Date());
      updateNode(node.id, {
        ...node.data,
        lastPracticed: new Date()
      });
    }
  }, [node, updateNode]);

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setDescription(node.data.description || '');
      setAttachments(node.data.attachments || []);
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
    startTimer(node.id, {
      timeSpent: node.data.timeSpent || 0,
      label: node.data.label,
      targetDuration: node.data.targetDuration,
      useTargetDuration: node.data.useTargetDuration || false,
      completionHistory: node.data.completionHistory,
    });
    updateNode(node.id, {
      isRunning: true,
      startTime: Date.now(),
      status: 'active',
    });
  };

  const handleStopTimer = () => {
    if (!node) return;
    stopTimer(node.id);
    const now = Date.now();
    updateNode(node.id, {
      isRunning: false,
      timeSpent: ((node.data.timeSpent || 0) + (now - (node.data.startTime || now))),
      startTime: undefined,
      status: 'ready',
    });
  };

  const handleResetTask = () => {
    if (!node) return;
    resetTimer(node.id);
    updateNode(node.id, {
      isRunning: false,
      timeSpent: 0,
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

  const handlePaste = async (e: React.ClipboardEvent) => {
    console.log('Paste event triggered');
    console.log('Clipboard items:', Array.from(e.clipboardData.items).map(item => ({ type: item.type, kind: item.kind })));
    const items = e.clipboardData.items;
    const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));
    
    console.log('Found image item:', imageItem?.type);
    if (!imageItem || !node) {
      console.log('No image item found or no node selected');
      return; // Not an image or no node selected
    }

    e.preventDefault();
    setIsUploading(true);

    try {
      const file = imageItem.getAsFile();
      if (!file) throw new Error('Failed to get image file from clipboard');

      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `node-images/${node.id}/${timestamp}-${file.name || 'clipboard-image.png'}`;
      console.log('Generated filename:', filename);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('process-flow')
        .upload(filename, file);

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      console.log('Upload successful:', data);

      // Store canonical URL format instead of signed URL
      const canonicalUrl = `supabase://process-flow/${filename}`;
      console.log('Generated canonical URL:', canonicalUrl);

      // Test if URL is accessible via signed URL (for immediate feedback)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('process-flow')
        .createSignedUrl(filename, 60 * 60); // 1 hour for testing

      if (signedUrlError) {
        console.error('Signed URL error:', signedUrlError);
        throw signedUrlError;
      }

      // Test accessibility
      try {
        const response = await fetch(signedUrlData.signedUrl, { method: 'HEAD' });
        console.log('URL accessibility test:', response.status, response.ok);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Image not accessible`);
        }
      } catch (error) {
        console.error('URL accessibility test failed:', error);
        throw new Error('Uploaded image is not accessible. This might be due to authentication or storage bucket configuration.');
      }

      // Insert the canonical URL format at cursor position or at the end
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(textarea.selectionEnd);
        
        // Add markdown without dimensions
        const imageMarkdown = `![Pasted Image|width=200px height=auto](${canonicalUrl})`;
        console.log('Generated image markdown:', imageMarkdown);
        
        const newValue = textBefore + imageMarkdown + textAfter;
        console.log('New textarea value:', newValue);
        
        // Update the description state
        setDescription(newValue);
        
        // Update the node
        updateNode(node.id, {
          description: newValue
        });
        
        // Set cursor position after the inserted text
        const newCursorPos = cursorPos + imageMarkdown.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);

        // Show success notification
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Error handling paste:', error);
      alert('Failed to upload image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const getViewerUrl = (url: string, type: string): string => {
    if (type === 'application/pdf') {
      return url;
    }
    // Google Docs Viewer for Office files
    if (
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      type === 'application/msword' ||
      type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      type === 'application/vnd.ms-powerpoint'
    ) {
      return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
    }
    return url; // Default to direct URL if not a supported preview type
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !node) return;
    setIsUploading(true);
    try {
      const filename = `${node.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error } = await supabase.storage
        .from('attachments')
        .upload(filename, file);
      if (error) throw error;

      // Store canonical URL format instead of signed URL
      const canonicalUrl = `supabase://attachments/${filename}`;
      const newAttachment = {
        name: file.name,
        url: canonicalUrl,
        type: file.type,
      };
      const newAttachments = [...attachments, newAttachment];
      setAttachments(newAttachments);
      // Update node data
      updateNode(node.id, {
        attachments: newAttachments,
      });
      toast.success('File uploaded successfully');
    } catch (err) {
      toast.error('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
            onPaste={handlePaste}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base p-2 min-h-[100px] overflow-hidden resize-none ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
            placeholder="Use {{...}} to create cloze deletions. Paste images to add them to your description."
            disabled={isUploading}
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
              <button
                onClick={async () => {
                  console.log('[NodeDetails] Testing notification system');
                  
                  // First check if notifications are supported
                  if (!("Notification" in window)) {
                    console.error("[NodeDetails] Notifications not supported");
                    alert("This browser does not support notifications");
                    return;
                  }

                  // Check notification permission
                  let permission = Notification.permission;
                  console.log('[NodeDetails] Current notification permission:', permission);
                  
                  if (permission === "denied") {
                    console.error("[NodeDetails] Notifications denied");
                    alert("Please enable notifications in your browser settings");
                    return;
                  }

                  if (permission === "default") {
                    permission = await Notification.requestPermission();
                    console.log('[NodeDetails] Requested permission result:', permission);
                  }

                  if (permission === "granted") {
                    try {
                      console.log('[NodeDetails] Attempting to send test notification');
                      
                      // Try direct browser notification first
                      new Notification("Test Notification", {
                        body: "This is a test notification from the task node"
                      });

                      // Also try through the notification context
                      toast.success('Test notification sent through the context system');

                      console.log('[NodeDetails] Test notifications sent');
                    } catch (err) {
                      const error = err as Error;
                      console.error('[NodeDetails] Error sending notification:', error);
                      alert("Error sending notification: " + error.message);
                    }
                  }
                }}
                className="px-3 py-2 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                Test Notification
              </button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <input
              type="number"
              value={node.data.value || 0}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  updateNode(node.id, { value });
                }
              }}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="Enter task value..."
            />
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Time Settings</h4>
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="useTargetDuration"
                  checked={node.data.useTargetDuration || false}
                  onChange={(e) => {
                    updateNode(node.id, { 
                      useTargetDuration: e.target.checked,
                    });
                  }}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="useTargetDuration" className="ml-2 text-sm text-gray-600">
                  Use target duration for notifications (unchecked will use average completion time)
                </label>
              </div>
              <label className="block text-sm text-gray-600 mb-1">Target Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={Math.floor((node.data.targetDuration || 0) / 60)}
                  onChange={(e) => {
                    const minutes = parseInt(e.target.value);
                    const seconds = node.data.targetDuration ? node.data.targetDuration % 60 : 0;
                    if (minutes >= 0) {
                      const duration = minutes * 60 + seconds;
                      const now = new Date();
                      const targetTime = new Date(now.getTime() + duration * 1000);
                      updateNode(node.id, { 
                        targetDuration: duration,
                        targetTime: targetTime.toISOString(),
                        reminders: [{
                          type: 'at',
                          time: targetTime.toISOString()
                        }]
                      });
                    }
                  }}
                  className="w-20 p-2 text-sm border rounded-md"
                  placeholder="0"
                />
                <span className="text-sm text-gray-500">minutes</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={node.data.targetDuration ? node.data.targetDuration % 60 : 0}
                  onChange={(e) => {
                    const minutes = Math.floor((node.data.targetDuration || 0) / 60);
                    const seconds = parseInt(e.target.value);
                    if (seconds >= 0 && seconds <= 59) {
                      const duration = minutes * 60 + seconds;
                      const now = new Date();
                      const targetTime = new Date(now.getTime() + duration * 1000);
                      updateNode(node.id, { 
                        targetDuration: duration,
                        targetTime: targetTime.toISOString(),
                        reminders: [{
                          type: 'at',
                          time: targetTime.toISOString()
                        }]
                      });
                    }
                  }}
                  className="w-20 p-2 text-sm border rounded-md"
                  placeholder="0"
                />
                <span className="text-sm text-gray-500">seconds</span>
              </div>
              {node.data.targetDuration && (
                <p className="mt-1 text-sm text-gray-500">
                  Timer will complete in {Math.floor(node.data.targetDuration / 60)} minutes and {node.data.targetDuration % 60} seconds
                </p>
              )}
            </div>
          </div>

          {node.data.completionHistory && node.data.completionHistory.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Completion History ({node.data.completionHistory.length})
                  </h4>
                  <span className="text-sm text-blue-600">
                    Avg: {formatTime(node.data.completionHistory.reduce((sum: number, rec: CompletionRecord) => sum + rec.timeSpent, 0) / node.data.completionHistory.length)}
                  </span>
                </div>
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

      {node.type === 'calculation' && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Calculation Details</h4>
          <div className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Value:</span>
              <span className="font-medium text-teal-600">{node.data.value || 0}</span>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const event = new CustomEvent('recalculate', { detail: { nodeId: node.id } });
                  window.dispatchEvent(event);
                }}
                className="px-3 py-1 text-sm bg-teal-500 text-white rounded hover:bg-teal-600"
              >
                Process
              </button>
            </div>
            {node.data.calculationSteps && node.data.calculationSteps.length > 0 && (
              <div className="mt-2">
                <div className="text-gray-600 mb-1">Calculation Steps:</div>
                <pre className="text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap font-mono">
                  {node.data.calculationSteps.join('\n')}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skill-specific controls */}
      {node.type === 'skill' && (
        <div className="pt-4 mt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Skill Progress</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Skill Level (0-100)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(parseInt(e.target.value))}
                  onMouseUp={handleSkillUpdate}
                  onTouchEnd={handleSkillUpdate}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">{skillLevel}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Effectiveness (0-100)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={effectiveness}
                  onChange={(e) => setEffectiveness(parseInt(e.target.value))}
                  onMouseUp={handleSkillUpdate}
                  onTouchEnd={handleSkillUpdate}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">{effectiveness}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Last Practiced</label>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {lastPracticed ? new Date(lastPracticed).toLocaleDateString() : 'Never practiced'}
                </span>
                <button
                  onClick={handlePractice}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Practice Now
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Progress Overview</label>
              <div className="space-y-2 p-2 bg-gray-50 rounded">
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Level</span>
                    <span>{skillLevel}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${skillLevel}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Effectiveness</span>
                    <span>{effectiveness}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${effectiveness}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Node Appearance Options */}
      <div className="pt-4 mt-4 border-t">
        <h4 className="text-sm font-medium mb-2">Node Appearance</h4>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={!!node?.style?.border}
              onChange={(e) => {
                updateNode(node.id, {
                  style: {
                    border: e.target.checked ? '4px solid #2563eb' : undefined,
                    borderRadius: e.target.checked ? '12px' : undefined
                  }
                });
              }}
              className="rounded"
            />
            <span className="text-sm">Highlight Border</span>
          </label>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm">Border Color:</label>
            <input
              type="color"
              value={node?.style?.borderColor || '#2563eb'}
              onChange={(e) => {
                updateNode(node.id, {
                  style: {
                    border: `4px solid ${e.target.value}`,
                    borderRadius: '12px'
                  }
                });
              }}
              className="w-8 h-8 p-0 rounded"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm">Background Color:</label>
            <input
              type="color"
              value={node?.style?.backgroundColor || '#ffffff'}
              onChange={(e) => {
                updateNode(node.id, {
                  style: {
                    backgroundColor: e.target.value
                  }
                });
              }}
              className="w-8 h-8 p-0 rounded"
            />
          </div>
        </div>
      </div>

      {/* Attachment handling for attachment nodes */}
      {node.type === 'attachment' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Attachment'}
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="space-y-4">
            {attachments.map((att, idx) => (
              <div key={idx} className="border rounded p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{att.name}</span>
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                    Download
                  </a>
                </div>
                {att.type === 'application/pdf' && (
                  <iframe src={att.url} className="w-full h-96 border rounded" title={att.name} />
                )}
                {(att.type.startsWith('application/vnd.openxmlformats-officedocument') || att.type.startsWith('application/msword') || att.type.startsWith('application/vnd.ms-powerpoint')) && (
                  <iframe src={getViewerUrl(att.url, att.type)} className="w-full h-96 border rounded" title={att.name} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 