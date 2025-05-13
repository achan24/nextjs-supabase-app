import React from 'react';

interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: string;
  // Add other habit properties as needed
}

interface HabitListProps {
  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
  showDetailsLink?: boolean;
}

export default function HabitList({ habits, setHabits, showDetailsLink = false }: HabitListProps) {
  return (
    <div>
      {habits.map(habit => (
        <div key={habit.id}>
          {habit.name}
        </div>
      ))}
    </div>
  );
} 