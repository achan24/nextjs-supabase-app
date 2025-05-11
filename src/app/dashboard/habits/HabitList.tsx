import React from 'react';
import HabitCard from './HabitCard';

export default function HabitList({ habits, setHabits }: {
  habits: Array<{ id: string, name: string, description?: string, completed?: boolean, streak?: number, notes?: string[] }>,
  setHabits: React.Dispatch<React.SetStateAction<any[]>>
}) {
  // Handler to toggle completion (for future use)
  const toggleHabit = (id: string) => {
    setHabits(habits => habits.map(habit =>
      habit.id === id ? { ...habit, completed: !habit.completed } : habit
    ));
  };

  return (
    <div className="space-y-2">
      {habits.map(habit => (
        <HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabit(habit.id)} />
      ))}
    </div>
  );
} 