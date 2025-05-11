import React, { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function AddHabitModal({ onClose, onHabitAdded }: {
  onClose: () => void,
  onHabitAdded: () => void
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
        description
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