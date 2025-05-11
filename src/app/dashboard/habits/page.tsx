"use client";
import React, { useState, useEffect } from 'react';
import HabitList from './HabitList';
import AddHabitModal from './AddHabitModal';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function HabitTrackerPage() {
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchHabits = async () => {
    console.log('[HabitTracker] Step 1: Creating Supabase client...');
    setLoading(true);
    const supabase = createClientComponentClient();
    // Hardcoded user ID for dev/testing
    const userId = '875d44ba-8794-4d12-ba86-48e5e90dc796';
    console.log('[HabitTracker] Step 2: Using hardcoded user_id:', userId);
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    console.log('[HabitTracker] Step 3: Habits fetch result:', data, error);
    if (error) {
      setHabits([]);
    } else {
      setHabits(data || []);
    }
    setLoading(false);
    console.log('[HabitTracker] Step 4: Habits set in state.');
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Habit Tracker</h1>
      <div className="mb-4 flex justify-between items-center">
        <span className="text-lg font-medium">Today's Habits</span>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowAddModal(true)}
        >
          + Add Habit
        </button>
      </div>
      {loading ? (
        <div className="text-gray-500">Loading habits...</div>
      ) : habits.length === 0 ? (
        <div className="text-gray-500">No habits yet. Add your first habit!</div>
      ) : (
        <HabitList habits={habits} setHabits={setHabits} />
      )}
      {showAddModal && (
        <AddHabitModal
          onClose={() => setShowAddModal(false)}
          onHabitAdded={fetchHabits}
        />
      )}
    </div>
  );
} 