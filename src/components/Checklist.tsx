'use client';

import { useState } from 'react';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface ChecklistProps {
  items: ChecklistItem[];
  onChange?: (items: ChecklistItem[]) => void;
  className?: string;
}

export default function Checklist({ items, onChange, className = '' }: ChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<ChecklistItem[]>(items);

  const handleToggle = (id: string) => {
    const newItems = checkedItems.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setCheckedItems(newItems);
    onChange?.(newItems);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {checkedItems.map(item => (
        <div key={item.id} className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => handleToggle(item.id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className={`text-gray-700 ${item.checked ? 'line-through text-gray-400' : ''}`}>
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
} 