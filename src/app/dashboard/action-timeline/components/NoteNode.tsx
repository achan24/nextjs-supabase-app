import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { TimelineNote } from '../types';

interface NoteNodeData {
  note: TimelineNote;
  onEdit: (note: TimelineNote) => void;
  onDelete: (id: string) => void;
  isTimelineRunning: boolean;
}

const NoteNode: React.FC<NodeProps<NoteNodeData>> = ({ data, selected }) => {
  const { note, onEdit, onDelete, isTimelineRunning } = data || {} as any;
  if (!note) return <div className="text-red-500 p-2">Invalid note</div>;

  return (
    <div className="relative select-none">
      {/* No connectors: notes are non-executable and non-connectable */}
      <div className={`max-w-[220px] min-w-[140px] bg-yellow-50 border border-yellow-300 rounded-md shadow-sm p-2 ${selected ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}>
        <div className="text-xs font-semibold text-yellow-900 truncate" title={note.name}>
          📝 {note.name}
        </div>
        {note.content && (
          <div className="mt-1 text-xs text-yellow-800 line-clamp-4 whitespace-pre-wrap" title={note.content}>
            {note.content}
          </div>
        )}
      </div>

      {/* Edit/Delete buttons below node */}
      {selected && !isTimelineRunning && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 flex gap-0.5">
          <button
            onClick={() => onEdit(note)}
            className="text-xs px-1 py-0.5 bg-blue-100 text-blue-700 rounded border hover:bg-blue-200"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="text-xs px-1 py-0.5 bg-red-100 text-red-700 rounded border hover:bg-red-200"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};

export default NoteNode;


