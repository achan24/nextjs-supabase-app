'use client';

import { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';

interface ChecklistNodeProps {
  data: {
    text: string;
  };
}

export default function ChecklistNode({ data }: ChecklistNodeProps) {
  const [items, setItems] = useState<{ id: string; text: string; checked: boolean; }[]>([]);

  useEffect(() => {
    // Split text by newlines and convert to checklist items
    const newItems = data.text.split('\n')
      .filter(line => line.trim() !== '') // Remove empty lines
      .map((line, index) => ({
        id: `item-${index}`,
        text: line.trim(),
        checked: false
      }));
    setItems(newItems);
  }, [data.text]);

  const handleToggle = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => handleToggle(item.id)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm text-gray-700 ${item.checked ? 'line-through text-gray-400' : ''}`}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </div>
  );
} 