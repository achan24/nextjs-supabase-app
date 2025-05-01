'use client';

import { memo } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';

interface NoteNodeData extends BaseNodeData {
  content?: string;
}

export const NoteNode = (props: NodeProps<NoteNodeData>) => {
  return (
    <div className="note-node">
      <BaseNode {...props} />
      {props.data.content && (
        <div className="mt-2 text-xs text-gray-600">
          {props.data.content}
        </div>
      )}
    </div>
  );
};

export default memo(NoteNode); 