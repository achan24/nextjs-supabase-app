"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
// import HabitList from './HabitList';
import AddHabitModal from './AddHabitModal';
import { createClient } from '@/lib/supabase';
import { addDays, subDays, format as formatDate, isSameDay } from 'date-fns';
import { User } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function HabitTrackerPage() {
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();
  const router = useRouter();

  // Get and monitor auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch habits and completions for today and streaks
  const fetchHabits = async () => {
    if (!user) return;
    setLoading(true);
    
    // Get habits with linked flow data
    const { data: habitsData, error: habitsError } = await supabase
      .from('habits')
      .select('*, linked_flow_id, linked_node_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    // Get completions for the past 365 days
    const since = formatDate(subDays(new Date(), 364), 'yyyy-MM-dd');
    const { data: completionsData, error: completionsError } = await supabase
      .from('habit_completions')
      .select('habit_id, completed_at')
      .eq('user_id', user.id)
      .gte('completed_at', since);
    
    // Map completions by habit
    const completionsByHabit: { [habitId: string]: string[] } = {};
    (completionsData || []).forEach((c: any) => {
      if (!completionsByHabit[c.habit_id]) completionsByHabit[c.habit_id] = [];
      completionsByHabit[c.habit_id].push(c.completed_at);
    });
    
    // Calculate streaks and completed today
    const todayStr = formatDate(new Date(), 'yyyy-MM-dd');
    const merged = (habitsData || []).map((h: any) => {
      const completions = completionsByHabit[h.id] || [];
      // Check if completed today
      const completed = completions.some(date => date === todayStr);
      // Calculate streak: consecutive days up to most recent completion
      let streak = 0;
      if (completions.length > 0) {
        let day = completions
          .map(date => new Date(date))
          .sort((a, b) => b.getTime() - a.getTime())[0]; // most recent completion
        while (completions.some(date => isSameDay(new Date(date), day))) {
          streak++;
          day = subDays(day, 1);
        }
      }
      return { ...h, completed, streak };
    });
    setHabits(merged);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchHabits();
    }
  }, [user]);

  // For day-of-week selector, start with Monday
  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
  const [todayStr, setTodayStr] = useState('');
  // Adjust getDay() so Monday is 0
  const todayIdx = (new Date().getDay() + 6) % 7;
  useEffect(() => {
    const today = new Date();
    setTodayStr(today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  // Mark Done handler
  const handleMarkDone = async (habitId: string) => {
    if (!user) return;
    console.log('Marking habit as done:', habitId);
    const todayStr = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('habit_completions').insert({
      user_id: user.id,
      habit_id: habitId,
      completed_at: todayStr,
    });
    if (error) {
      console.error('Error marking habit as done:', error);
    } else {
      console.log('Successfully marked habit as done');
      fetchHabits();
    }
  };

  const handleJumpToNode = (flowId: string, nodeId: string) => {
    router.push(`/dashboard/process-flow?flowId=${flowId}&nodeId=${nodeId}`);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Habits Subnav */}
      <div className="flex gap-6 border-b border-gray-200 mb-8">
        <Link 
          href="/dashboard/habits" 
          className="py-2 px-1 font-medium text-blue-700 border-b-2 border-blue-600"
        >
          Today
        </Link>
        <Link 
          href="/dashboard/habits/all" 
          className="py-2 px-1 font-medium text-gray-600 hover:text-blue-700 hover:border-blue-600 border-b-2 border-transparent"
        >
          All Habits
        </Link>
      </div>
      {/* Show today's date */}
      <div className="text-center text-lg font-semibold mb-2">{todayStr}</div>
      {/* Day-of-week selector, start with Monday */}
      <div className="flex justify-center gap-2 mb-8">
        {daysOfWeek.map((d, i) => (
          <button
            key={d + i}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-lg transition-colors ${i === todayIdx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-blue-100'}`}
            disabled={i !== todayIdx}
          >
            {d}
          </button>
        ))}
      </div>
      <h1 className="text-3xl font-bold mb-6 text-center">Habit Tracker</h1>
      <div className="mb-6 flex justify-end">
        {/* Removed Add Habit button from Today tab */}
      </div>
      {loading ? (
        <div className="text-gray-500 text-center">Loading habits...</div>
      ) : habits.length === 0 ? (
        <div className="text-gray-500 text-center">No habits yet. Add your first habit!</div>
      ) : (
        <div className="space-y-4">
          {habits.map((habit, idx) => (
            <div
              key={habit.id}
              className={`flex items-center rounded-xl px-5 py-4 shadow-sm font-medium text-lg gap-4 ${[
                'bg-blue-100',
                'bg-purple-100',
                'bg-green-100',
                'bg-yellow-100',
                'bg-pink-100',
                'bg-orange-100',
                'bg-teal-100',
              ][idx % 7]}`}
            >
              <span className="text-2xl mr-2">
                {habit.icon || [
                  '💧', '🛏️', '🥤', '🧍', '🚶', '🧘', '🏃'
                ][idx % 7]}
              </span>
              <span className="flex-1">{habit.name}</span>
              <div className="flex items-center gap-3">
                {habit.linked_flow_id && habit.linked_node_id && (
                  <button
                    onClick={() => handleJumpToNode(habit.linked_flow_id, habit.linked_node_id)}
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                    title="Jump to linked node in Process Flow"
                  >
                    <span role="img" aria-label="link">🔗</span>
                  </button>
                )}
                <span className="text-orange-500 text-base font-normal flex items-center gap-1">🔥 {habit.streak ?? 0}</span>
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${habit.completed ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-700 hover:bg-green-100'}`}
                  disabled={habit.completed}
                  onClick={() => handleMarkDone(habit.id)}
                >
                  {habit.completed ? 'Done' : 'Mark Done'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAddModal && user && (
        <AddHabitModal
          onClose={() => setShowAddModal(false)}
          onHabitAdded={fetchHabits}
          user={user}
        />
      )}
    </div>
  );
} 