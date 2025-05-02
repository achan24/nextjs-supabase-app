'use client';

import { Node } from 'reactflow';
import { useState, useEffect } from 'react';
import ClozeText from './ClozeText';
import FlashcardReview from './FlashcardReview';

interface CompletionRecord {
  completedAt: number;
  timeSpent: number;
}

interface NodeDetailsProps {
  node: Node | null;
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  updateNode: (nodeId: string, data: any) => void;
  onStartReview: () => void;
}

export default function NodeDetails({ node, setNodes, updateNode, onStartReview }: NodeDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(node?.data?.label || '');
  const [description, setDescription] = useState(node?.data?.description || '');

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setDescription(node.data.description || '');
    }
  }, [node]);

  if (!node) {
    return (
      <div className="text-gray-500 text-center p-4">
        Select a node to view and edit its details
      </div>
    );
  }

  // Check if the node has any clozes
  const hasClozes = node.data.description?.includes('{{');

  const handleSave = () => {
    updateNode(node.id, {
      label,
      description,
    });
    setIsEditing(false);
  };

  const handleStartTimer = () => {
    updateNode(node.id, {
      isRunning: true,
      startTime: Date.now(),
      status: 'active',
    });
  };

  const handleStopTimer = () => {
    const now = Date.now();
    updateNode(node.id, {
      isRunning: false,
      timeSpent: ((node.data.timeSpent || 0) + (now - (node.data.startTime || now))),
      startTime: undefined,
      status: 'ready',
    });
  };

  const handleCompleteTask = () => {
    const now = Date.now();
    const currentTimeSpent = node.data.isRunning 
      ? (node.data.timeSpent || 0) + (now - (node.data.startTime || now))
      : node.data.timeSpent || 0;

    const completionRecord: CompletionRecord = {
      completedAt: now,
      timeSpent: currentTimeSpent,
    };

    updateNode(node.id, {
      isRunning: false,
      timeSpent: 0,
      startTime: undefined,
      status: 'completed',
      completionHistory: [...(node.data.completionHistory || []), completionRecord],
    });
  };

  const handleResetTask = () => {
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

  return (
    <>
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
              placeholder="Use {{...}} to create cloze deletions"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsEditing(false)}
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
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Label</label>
            <div className="mt-1 text-sm">{node.data.label || 'Untitled'}</div>
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
            <div className="mt-1 text-sm">
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
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          </div>
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
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Completion History ({node.data.completionHistory.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {node.data.completionHistory.map((record: CompletionRecord, index: number) => (
                  <div 
                    key={record.completedAt}
                    className="text-xs p-2 bg-gray-50 rounded flex justify-between items-center"
                  >
                    <span>{formatDate(record.completedAt)}</span>
                    <span className="text-gray-500">
                      Time: {formatTime(record.timeSpent)}
                    </span>
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
    </>
  );
} 