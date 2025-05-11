import React from 'react';

export default function HabitCard({ habit, onToggle }: {
  habit: { id: string, name: string, description?: string, completed?: boolean, streak?: number, notes?: string[] },
  onToggle: () => void
}) {
  // Use default values for fields that may be missing from the DB
  const completed = habit.completed ?? false;
  const streak = habit.streak ?? 0;
  const notes = habit.notes ?? [];

  return (
    <div className="flex items-center justify-between bg-gray-100 rounded p-3">
      <div>
        <span className={completed ? 'line-through text-gray-400' : 'font-medium'}>{habit.name}</span>
        <span className="ml-3 text-orange-500 text-sm">🔥 {streak}</span>
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