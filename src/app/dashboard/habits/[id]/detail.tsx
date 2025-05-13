import Link from 'next/link';

export default function HabitDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Habit Details</h1>
      <div className="mb-4">
        <Link href="/dashboard/habits/all" className="text-blue-600 hover:underline">← Back to All Habits</Link>
      </div>
      <div className="bg-white rounded shadow p-6 mb-6">
        <p className="text-gray-600">(Analytics, streaks, and completion heatmap for habit <span className="font-mono">{id}</span> will go here.)</p>
      </div>
      <div className="bg-white rounded shadow p-6 mb-6">
        <p className="text-gray-600">(Notes and journal entries for this habit will go here.)</p>
      </div>
      <div className="bg-white rounded shadow p-6">
        <p className="text-gray-600">(Edit habit details form will go here.)</p>
      </div>
    </div>
  );
} 