'use client';

import { useState } from 'react';

interface Target {
  id: string;
  data: {
    type: 'number' | 'boolean';
    targetValue: number | boolean;
    metric: string;
  };
}

interface TargetResult {
  targetId: string;
  value: number | boolean;
  notes: string;
}

interface TargetEvalModalProps {
  isOpen: boolean;
  targets: Target[];
  onComplete: (results: TargetResult[]) => void;
  onCancel: () => void;
}

export default function TargetEvalModal({ isOpen, targets, onComplete, onCancel }: TargetEvalModalProps) {
  const [results, setResults] = useState<TargetResult[]>(
    targets.map(target => ({
      targetId: target.id,
      value: target.data.type === 'number' ? 0 : false,
      notes: ''
    }))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Evaluate Practice Targets</h2>
        
        <div className="space-y-6">
          {targets.map((target, index) => {
            const result = results[index];
            return (
              <div key={target.id} className="space-y-2">
                <h3 className="font-medium">{target.data.metric}</h3>
                
                {target.data.type === 'number' ? (
                  <input
                    type="number"
                    min="0"
                    value={result.value as number}
                    onChange={(e) => {
                      const newResults = [...results];
                      newResults[index] = {
                        ...result,
                        value: Number(e.target.value)
                      };
                      setResults(newResults);
                    }}
                    className="w-full p-2 text-sm border rounded-md"
                    placeholder={`Enter ${target.data.metric}`}
                  />
                ) : (
                  <select
                    value={String(result.value)}
                    onChange={(e) => {
                      const newResults = [...results];
                      newResults[index] = {
                        ...result,
                        value: e.target.value === 'true'
                      };
                      setResults(newResults);
                    }}
                    className="w-full p-2 text-sm border rounded-md"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                )}

                <textarea
                  value={result.notes}
                  onChange={(e) => {
                    const newResults = [...results];
                    newResults[index] = {
                      ...result,
                      notes: e.target.value
                    };
                    setResults(newResults);
                  }}
                  placeholder="Add notes about this target..."
                  className="w-full p-2 text-sm border rounded-md"
                  rows={2}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onComplete(results)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Complete Practice
          </button>
        </div>
      </div>
    </div>
  );
} 