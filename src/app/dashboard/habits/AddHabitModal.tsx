import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { User } from '@supabase/auth-helpers-nextjs';

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

export default function AddHabitModal({ onClose, onHabitAdded, user }: {
  onClose: () => void,
  onHabitAdded: () => void,
  user: User
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(HABIT_ICONS[0].emoji);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [nodesInFlow, setNodesInFlow] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  // Fetch all flows when modal opens
  useEffect(() => {
    const fetchFlows = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('process_flows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching flows:', error);
      } else if (data) {
        console.log('Loaded flows:', data);
        setFlows(data);
      }
    };
    fetchFlows();
  }, [user.id]);

  // Fetch nodes for selected flow
  useEffect(() => {
    const fetchNodes = async () => {
      if (selectedFlowId) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('process_flows')
          .select('*')
          .eq('id', selectedFlowId)
          .single();
        if (!error && data) {
          setNodesInFlow(data.nodes || []);
        }
      } else {
        setNodesInFlow([]);
      }
    };
    fetchNodes();
  }, [selectedFlowId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    
    const { data, error: insertError } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        name,
        description,
        icon: selectedIcon,
        linked_flow_id: selectedFlowId || null,
        linked_node_id: selectedNodeId || null
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
        <form className="space-y-4" onSubmit={handleSubmit}>
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
            <label className="block text-sm font-medium mb-1">Description</label>
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
          <div>
            <label className="block text-sm font-medium mb-1">Link to Process Flow Node (Optional)</label>
            <div className="space-y-2">
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedFlowId}
                onChange={e => setSelectedFlowId(e.target.value)}
              >
                <option value="">-- Select a flow --</option>
                {flows.map(flow => (
                  <option key={flow.id} value={flow.id}>{flow.title}</option>
                ))}
              </select>
              {selectedFlowId && (
                <select
                  className="w-full border rounded px-3 py-2"
                  value={selectedNodeId}
                  onChange={e => setSelectedNodeId(e.target.value)}
                >
                  <option value="">-- Select a node --</option>
                  {nodesInFlow.map((node: any) => (
                    <option key={node.id} value={node.id}>
                      {node.data?.label || node.id}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 