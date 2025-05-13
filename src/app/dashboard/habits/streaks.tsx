import Link from 'next/link';

export default function HabitStreaksPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Habits Subnav */}
      <div className="flex gap-6 border-b border-gray-200 mb-8">
        <a href="/dashboard/habits" className="py-2 px-1 font-medium text-gray-600 hover:text-blue-700 hover:border-blue-600 border-b-2 border-transparent">Today</a>
        <a href="/dashboard/habits/all" className="py-2 px-1 font-medium text-gray-600 hover:text-blue-700 hover:border-blue-600 border-b-2 border-transparent">All Habits</a>
        <a href="/dashboard/habits/streaks" className="py-2 px-1 font-medium text-blue-700 border-b-2 border-blue-600">Streaks</a>
      </div>
      <h1 className="text-3xl font-bold mb-6">Streaks & Achievements</h1>
      <div className="bg-white rounded shadow p-6">
        <p className="text-gray-600">(Streaks, badges, and achievements for your habits will go here.)</p>
      </div>
    </div>
  );
} 