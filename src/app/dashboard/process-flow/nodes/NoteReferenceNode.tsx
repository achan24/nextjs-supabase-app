'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface NoteReferenceNodeData {
  label: string;
  description?: string;
  status?: 'ready' | 'active' | 'completed';
  noteId?: string;
  note?: Note;
}

const NoteReferenceNode = ({
  data,
  isConnectable,
  selected,
}: NodeProps<NoteReferenceNodeData>) => {
  const borderColor = selected ? 'border-purple-500' : 'border-purple-200';
  const bgColor = data.status ? {
    ready: 'bg-yellow-100 border-yellow-400',
    active: 'bg-blue-100 border-blue-400',
    completed: 'bg-green-100 border-green-400',
  }[data.status] : 'bg-purple-50 border-purple-200';

  return (
    <div className={`relative px-4 py-2 shadow-md rounded-md border-2 ${borderColor} ${bgColor}`}>
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />
      
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />

      <div className="flex items-center space-x-2">
        <span className="text-xl">📝</span>
        <div className="flex flex-col">
          <div className="text-sm font-bold">{data.label || data.note?.title || 'Select a Note'}</div>
          {data.note && (
            <div className="text-xs text-gray-600 whitespace-pre-wrap">
              {data.note.content}
            </div>
          )}
        </div>
      </div>

      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />

      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />
    </div>
  );
};

export default memo(NoteReferenceNode); 