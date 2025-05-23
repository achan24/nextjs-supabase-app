import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HabitCard({ habit, onToggle }: {
  habit: { 
    id: string, 
    name: string, 
    description?: string, 
    completed?: boolean, 
    streak?: number, 
    notes?: string[],
    linked_flow_id?: string,
    linked_node_id?: string
  },
  onToggle: () => void
}) {
  const router = useRouter();
  // Use default values for fields that may be missing from the DB
  const completed = habit.completed ?? false;
  const streak = habit.streak ?? 0;
  const notes = habit.notes ?? [];

  const handleJumpToNode = () => {
    if (habit.linked_flow_id && habit.linked_node_id) {
      router.push(`/dashboard/process-flow?flowId=${habit.linked_flow_id}&nodeId=${habit.linked_node_id}`);
    }
  };

  return (
    <div className="flex items-center justify-between bg-gray-100 rounded p-3">
      <div className="flex items-center gap-2">
        <div>
          <span className={completed ? 'line-through text-gray-400' : 'font-medium'}>{habit.name}</span>
          <span className="ml-3 text-orange-500 text-sm">🔥 {streak}</span>
        </div>
        {habit.linked_flow_id && habit.linked_node_id && (
          <button
            onClick={handleJumpToNode}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            title="Jump to linked node in Process Flow"
          >
            <span>🔗</span>
          </button>
        )}
      </div>
      <button
        className={`rounded px-3 py-1 text-xs font-medium ${completed ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-700 hover:bg-green-100'}`}
        onClick={onToggle}
        disabled={completed}
      >
        {completed ? 'Done' : 'Mark Done'}
      </button>
    </div>
  );
} 