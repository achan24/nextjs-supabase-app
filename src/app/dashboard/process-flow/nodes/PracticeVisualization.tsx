'use client';

import { useMemo, useState } from 'react';

interface PracticeRecord {
  timeSpent: number;
  completed: boolean;
  date?: string;
  notes?: string;
}

interface PracticeVisualizationProps {
  completionHistory?: PracticeRecord[];
  timeSpent: number;
  isRunning: boolean;
  label: string;
  className?: string;
}

export const PracticeVisualization = ({
  completionHistory = [],
  timeSpent,
  isRunning,
  label,
  className = ''
}: PracticeVisualizationProps) => {
  const [hoveredSession, setHoveredSession] = useState<PracticeRecord | null>(null);
  
  // Debug logging
  console.log('[PracticeVisualization] props.completionHistory:', JSON.stringify(completionHistory?.slice(0,5), null, 2));
  
  // Calculate practice statistics
  const stats = useMemo(() => {
    const totalSessions = completionHistory.length;
    const completedSessions = completionHistory.filter(record => record.completed).length;
    
    // Find last practice date
    const sortedHistory = [...completionHistory]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    
    const lastPractice = sortedHistory[0];
    const lastPracticeDate = lastPractice?.date ? new Date(lastPractice.date) : null;
    const daysSincePractice = lastPracticeDate 
      ? Math.floor((Date.now() - lastPracticeDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    return {
      totalSessions,
      completedSessions,
      lastPracticeDate,
      daysSincePractice
    };
  }, [completionHistory]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (completionHistory.length === 0 && !isRunning) {
    return null;
  }

  return (
    <div className={`practice-visualization mt-2 ${className}`}>
      {/* Fixed-size container */}
      <div className="w-full h-8 flex items-center justify-between px-2 bg-gray-50 rounded-lg border border-gray-200">
        
        {/* Practice sessions as rounded rectangles */}
        <div className="flex items-center space-x-1">
          {completionHistory.slice(-5).map((session, index) => {
            // Find the actual index of this session in the full history
            const actualIndex = completionHistory.indexOf(session);
            const sessionNumber = actualIndex + 1; // Sessions start at 1
            return (
              <div
                key={index}
                className={`w-6 h-5 rounded-md cursor-pointer transition-all duration-200 flex items-center justify-center text-xs font-medium text-white ${
                  session.completed 
                    ? 'bg-blue-400 hover:bg-blue-500' 
                    : 'bg-blue-300 hover:bg-blue-400'
                }`}
                onMouseEnter={() => {
                  console.log('[PracticeVisualization] hoveredSession payload:', JSON.stringify(session, null, 2));
                  setHoveredSession(session);
                }}
                onMouseLeave={() => setHoveredSession(null)}
                title=""
              >
                {sessionNumber}
              </div>
            );
          })}
          
          {/* Show count if more than 5 sessions */}
          {completionHistory.length > 5 && (
            <span className="text-xs text-gray-500 ml-1">
              +{completionHistory.length - 5}
            </span>
          )}
        </div>

        {/* Last practice info */}
        <div className="flex items-center space-x-2">
          {stats.lastPracticeDate && (
            <span className="text-xs text-gray-600">
              {stats.daysSincePractice === 0 ? 'Today' : 
               stats.daysSincePractice === 1 ? 'Yesterday' :
               `${stats.daysSincePractice}d ago`}
            </span>
          )}
          
          {/* Current session indicator */}
          {isRunning && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Now</span>
            </div>
          )}
        </div>
      </div>

      {/* Hover tooltip for session details */}
      {hoveredSession && (
        <div className="absolute z-50 mt-1 p-2 bg-gray-800 text-white text-xs rounded shadow-lg">
          <div className="font-medium mb-1">
            Session #{completionHistory.findIndex(h => h === hoveredSession) + 1} - {hoveredSession.completed ? '✓ Completed' : '○ Incomplete'}
          </div>
          <div className="mb-1">Time: {formatTime(hoveredSession.timeSpent)}</div>
          {hoveredSession.date && (
            <div className="mb-1">
              Date: {formatDate(hoveredSession.date)}
              {(() => {
                const sessionDate = new Date(hoveredSession.date);
                const daysSince = Math.floor((Date.now() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
                return daysSince > 0 ? ` (${daysSince} day${daysSince !== 1 ? 's' : ''} ago)` : ' (Today)';
              })()}
            </div>
          )}
          {hoveredSession.notes && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div className="font-medium mb-1">Notes:</div>
              <div className="text-gray-300">{hoveredSession.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PracticeVisualization;
