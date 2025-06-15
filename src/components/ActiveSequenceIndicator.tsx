'use client';

import { useActiveSequence } from '@/contexts/ActiveSequenceContext';
import { Timer, Play, Pause } from 'lucide-react';
import Link from 'next/link';

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function ActiveSequenceIndicator() {
  const { activeSequence, currentTaskIndex, timeSpent, isRunning, startTimer, pauseTimer } = useActiveSequence();

  if (!activeSequence) return null;

  const currentTask = activeSequence.tasks[currentTaskIndex];

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-blue-50 rounded-lg">
      <Timer className="w-4 h-4 text-blue-600" />
      <div className="flex flex-col">
        <Link 
          href={`/dashboard/process-flow/timer?sequence=${activeSequence.id}`}
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          {activeSequence.title}
        </Link>
        <div className="text-xs text-blue-600">
          Task {currentTaskIndex + 1}/{activeSequence.tasks.length}: {currentTask?.data?.label}
        </div>
      </div>
      <div className="font-mono text-sm text-blue-700">{formatTime(timeSpent)}</div>
      <button
        onClick={() => isRunning ? pauseTimer() : startTimer()}
        className="p-1 rounded-full hover:bg-blue-100"
      >
        {isRunning ? (
          <Pause className="w-4 h-4 text-blue-600" />
        ) : (
          <Play className="w-4 h-4 text-blue-600" />
        )}
      </button>
    </div>
  );
} 