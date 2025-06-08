'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';

interface ChecklistNodeData {
  text: string;
  items?: { id: string; text: string; checked: boolean; }[];
  label?: string;
  status?: 'ready' | 'active' | 'completed';
}

const ChecklistNode = memo(({ id, data, isConnectable, selected }: NodeProps<ChecklistNodeData>) => {
  const { setNodes } = useReactFlow();
  const [items, setItems] = useState<{ id: string; text: string; checked: boolean; }[]>([]);
  const borderColor = selected ? 'border-green-500' : 'border-green-200';
  const bgColor = data.status ? {
    ready: 'bg-yellow-100 border-yellow-400',
    active: 'bg-blue-100 border-blue-400',
    completed: 'bg-green-100 border-green-400',
  }[data.status] : 'bg-green-50 border-green-200';

  useEffect(() => {
    // If items are already in data, use those
    if (data.items && data.items.length > 0) {
      setItems(data.items);
      return;
    }

    // Otherwise, split text by newlines and create items
    const text = data.text || '';
    const newItems = text.split('\n')
      .filter(line => line.trim() !== '')
      .map((line, index) => ({
        id: `item-${index}`,
        text: line.trim(),
        checked: false
      }));
    setItems(newItems);

    // Update the node data with the initial items
    setNodes(nodes => 
      nodes.map(node => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              items: newItems
            }
          };
        }
        return node;
      })
    );
  }, [data.text, data.items, id, setNodes]);

  const handleToggle = useCallback((itemId: string) => {
    const newItems = items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setItems(newItems);

    // Update the node data with the new items
    setNodes(nodes => 
      nodes.map(node => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              items: newItems
            }
          };
        }
        return node;
      })
    );
  }, [items, id, setNodes]);

  return (
    <div className={`relative px-4 py-2 shadow-md rounded-md border-2 ${borderColor} ${bgColor}`}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />
      
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-xl">✅</span>
        <div className="text-sm font-bold">{data.label || 'Checklist'}</div>
      </div>

      <div className="space-y-2">
        {items.length > 0 ? (
          items.map(item => (
            <div key={item.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => handleToggle(item.id)}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className={`text-sm text-gray-700 ${item.checked ? 'line-through text-gray-400' : ''}`}>
                {item.text}
              </span>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500 italic">
            Add items in the node details panel
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />
    </div>
  );
});

ChecklistNode.displayName = 'ChecklistNode';

export default ChecklistNode; 