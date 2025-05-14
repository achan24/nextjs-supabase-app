import { memo, useEffect, useState } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';

interface LinkNodeData extends BaseNodeData {
  linkedFlowId?: string;
  linkedNodeId?: string;
}

const LinkNode = (props: NodeProps<LinkNodeData>) => {
  const { data } = props;
  const [linkedLabel, setLinkedLabel] = useState<string>('');
  const [linkedFlowTitle, setLinkedFlowTitle] = useState<string>('');

  useEffect(() => {
    // Fetch the referenced node's label and flow title if available
    if (data.linkedFlowId && data.linkedNodeId) {
      fetch(`/api/process-flows/${data.linkedFlowId}`)
        .then(res => res.json())
        .then(flow => {
          setLinkedFlowTitle(flow.title || '');
          const node = (flow.nodes || []).find((n: any) => n.id === data.linkedNodeId);
          setLinkedLabel(node?.data?.label || '');
        });
    }
  }, [data.linkedFlowId, data.linkedNodeId]);

  return (
    <div className="relative px-4 py-2 shadow-md rounded-md border-2 border-gray-300 bg-white flex flex-col items-center">
      <div className="flex items-center space-x-2">
        <span className="text-xl">🔗</span>
        <div className="flex flex-col items-center">
          <div className="text-sm font-bold">{data.label || 'Node Link'}</div>
          {linkedLabel && (
            <div className="text-xs text-gray-500">{linkedLabel}</div>
          )}
          {linkedFlowTitle && (
            <div className="text-xs text-gray-400 italic">{linkedFlowTitle}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(LinkNode); 