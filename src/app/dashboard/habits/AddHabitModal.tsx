import React, { useState } from 'react';
import { createClient } from '@/lib/supabase';

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

export default function AddHabitModal({ onClose, onHabitAdded }: {
  onClose: () => void,
  onHabitAdded: () => void
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(HABIT_ICONS[0].emoji);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not logged in');
      setLoading(false);
      return;
    }
    const { data, error: insertError } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        name,
        description,
        icon: selectedIcon
      })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      console.error('Insert error:', insertError);
    } else {
      console.log('Habit inserted:', data);
      onHabitAdded();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Add New Habit</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Habit Name</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Icon</label>
            <div className="grid grid-cols-6 gap-2 p-2 border rounded">
              {HABIT_ICONS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedIcon(emoji)}
                  className={`w-10 h-10 flex items-center justify-center text-xl rounded transition-colors ${
                    selectedIcon === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
                  }`}
                  title={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={loading || !name}>
              {loading ? 'Adding...' : 'Add Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 