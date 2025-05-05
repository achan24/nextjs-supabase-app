'use client';

import { Node } from 'reactflow';
import { useState, useEffect, useRef } from 'react';
import ClozeText from './ClozeText';
import FlashcardReview from './FlashcardReview';

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
}

export default function NodeDetails({ node, setNodes, updateNode, onStartReview }: NodeDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<'desc' | 'asc'>('desc');
  const [newNote, setNewNote] = useState('');
  const [label, setLabel] = useState(node?.data?.label || '');
  const [description, setDescription] = useState(node?.data?.description || '');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="space-y-4">
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
            className="mt-1 text-sm cursor-pointer hover:text-blue-600 whitespace-pre-wrap"
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