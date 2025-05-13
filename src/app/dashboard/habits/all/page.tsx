"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AddHabitModal from '../AddHabitModal';
import HabitHeatmap from '../HabitHeatmap';

const HABIT_ICONS = [
  { emoji: '💧', label: 'Water' },
  { emoji: '🛏️', label: 'Sleep' },
  { emoji: '🥤', label: 'Drink' },
  { emoji: '🧍', label: 'Stand' },
  { emoji: '🚶', label: 'Walk' },
  { emoji: '🧘', label: 'Meditate' },
  { emoji: '🏃', label: 'Run' },
  { emoji: '📚', label: 'Read' },
  { emoji: '🎯', label: 'Goal' },
  { emoji: '🎨', label: 'Create' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '🌱', label: 'Plant' },
];

function MiniHeatmap({ days = 30 }: { days?: number }) {
  // Mock: random completion data
  const data = Array.from({ length: days }, () => Math.random() > 0.7);
  return (
    <div className="flex gap-0.5 ml-4">
      {data.map((done, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-sm ${done ? 'bg-green-500' : 'bg-gray-300'}`}
          title={`Day ${days - i}${done ? ': Done' : ': Missed'}`}
        />
      ))}
    </div>
  );
}

export default function AllHabitsPage() {
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHabit, setEditingHabit] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [deletingHabit, setDeletingHabit] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const userId = '875d44ba-8794-4d12-ba86-48e5e90dc796'; // Hardcoded for now

  const fetchHabits = async () => {
    setLoading(true);
    const supabase = createClientComponentClient();
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) {
      setHabits([]);
    } else {
      setHabits(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleEdit = (habit: any) => {
    setEditingHabit(habit);
    setEditName(habit.name);
    setEditDescription(habit.description || '');
    setEditIcon(habit.icon || HABIT_ICONS[0].emoji);
  };

  const handleDelete = (habit: any) => {
    setDeletingHabit(habit);
  };

  const handleSaveEdit = async () => {
    if (!editingHabit) return;
    setSaving(true);
    const supabase = createClientComponentClient();
    const { error } = await supabase
      .from('habits')
      .update({ 
        name: editName, 
        description: editDescription,
        icon: editIcon
      })
      .eq('id', editingHabit.id);
    setSaving(false);
    setEditingHabit(null);
    if (!error) fetchHabits();
  };

  const handleConfirmDelete = async () => {
    if (!deletingHabit) return;
    setDeleting(true);
    const supabase = createClientComponentClient();
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', deletingHabit.id);
    setDeleting(false);
    setDeletingHabit(null);
    if (!error) fetchHabits();
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Habits Subnav */}
      <div className="flex gap-6 border-b border-gray-200 mb-8">
        <a href="/dashboard/habits" className="py-2 px-1 font-medium text-gray-600 hover:text-blue-700 hover:border-blue-600 border-b-2 border-transparent">Today</a>
        <a href="/dashboard/habits/all" className="py-2 px-1 font-medium text-blue-700 border-b-2 border-blue-600">All Habits</a>
      </div>
      <h1 className="text-3xl font-bold mb-6 text-center">All Habits</h1>
      <div className="mb-6 flex justify-end">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow"
          onClick={() => setShowAddModal(true)}
        >
          + Add Habit
        </button>
      </div>
      {loading ? (
        <div className="text-gray-500 text-center">Loading habits...</div>
      ) : habits.length === 0 ? (
        <div className="text-gray-500 text-center">No habits found.</div>
      ) : (
        <div className="space-y-4">
          {habits.map((habit, idx) => (
            <div
              key={habit.id}
              className={`flex flex-col sm:flex-row sm:items-center rounded-xl px-5 py-4 shadow-sm font-medium text-lg gap-2 sm:gap-4 ${[
                'bg-blue-100',
                'bg-purple-100',
                'bg-green-100',
                'bg-yellow-100',
                'bg-pink-100',
                'bg-orange-100',
                'bg-teal-100',
              ][idx % 7]}`}
            >
              {/* Left: Icon, name, desc, heatmap */}
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl mr-2">{habit.icon || HABIT_ICONS[idx % HABIT_ICONS.length].emoji}</span>
                  <span className="truncate">{habit.name}</span>
                </div>
                <span className="text-gray-500 text-base font-normal flex items-center gap-1 truncate">{habit.description}</span>
                <div className="mt-2 w-[420px] max-w-full mx-auto">
                  <HabitHeatmap habitId={habit.id} userId={userId} />
                </div>
              </div>
              {/* Right: Actions */}
              <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">
                <Link href={`/dashboard/habits/${habit.id}/detail`} className="text-blue-600 hover:underline text-xs">Details</Link>
                <button onClick={() => handleEdit(habit)} className="text-gray-500 hover:text-blue-600" title="Edit"><span role="img" aria-label="edit">✏️</span></button>
                <button onClick={() => handleDelete(habit)} className="text-gray-500 hover:text-red-600" title="Delete"><span role="img" aria-label="delete">🗑️</span></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Add Habit Modal */}
      {showAddModal && (
        <AddHabitModal
          onClose={() => setShowAddModal(false)}
          onHabitAdded={fetchHabits}
        />
      )}
      {/* Edit Modal */}
      {editingHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Habit</h2>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSaveEdit(); }}>
              <div>
                <label className="block text-sm font-medium mb-1">Habit Name</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Icon</label>
                <div className="grid grid-cols-6 gap-2 p-2 border rounded">
                  {HABIT_ICONS.map(({ emoji, label }) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditIcon(emoji)}
                      className={`w-10 h-10 flex items-center justify-center text-xl rounded transition-colors ${
                        editIcon === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
                      }`}
                      title={label}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setEditingHabit(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deletingHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Delete Habit</h2>
            <p>Are you sure you want to delete <span className="font-bold">{deletingHabit.name}</span>?</p>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setDeletingHabit(null)} disabled={deleting}>Cancel</button>
              <button type="button" className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={handleConfirmDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 