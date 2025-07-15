'use client';

import BaseNode, { BaseNodeData } from './BaseNode';
import { Handle, Position } from 'reactflow';
import { NodeProps } from 'reactflow';
import { memo } from 'react';

interface Attachment {
  name: string;
  url: string;
  type: string;
}

interface AttachmentNodeData extends BaseNodeData {
  attachments?: Attachment[];
}

function AttachmentNodeComponent(props: NodeProps<AttachmentNodeData>) {
  const { data, id, isConnectable, selected, type, zIndex, xPos, yPos, dragHandle, dragging } = props;
  
  const content = (
    <>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div className="p-2">
        {data.attachments?.map((att: Attachment, i: number) => (
          <div key={i} className="mb-2">
            <a 
              href={att.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 underline"
            >
              {att.name || 'Download Attachment'}
            </a>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </>
  );

  return (
    <BaseNode
      id={id}
      type="attachment"
      data={{
        ...data,
        description: content
      }}
      selected={selected}
      isConnectable={isConnectable}
      zIndex={zIndex}
      xPos={xPos}
      yPos={yPos}
      dragHandle={dragHandle}
      dragging={dragging}
    />
  );
}

export const AttachmentNode = memo(AttachmentNodeComponent); 