import React from 'react';

export default function HabitList({ habits, setHabits, showDetailsLink = false }) {
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