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
  const [showProgressGraph, setShowProgressGraph] = useState(false);
  
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

  // Generate progress graph data (stair-stepper style)
  const progressData = useMemo(() => {
    return completionHistory.map((_, index) => ({
      session: index + 1,
      practices: index + 1 // Each session adds one practice
    }));
  }, [completionHistory]);

  const ProgressGraph = () => {
    const maxSessions = Math.max(8, progressData.length + 1);
    const maxPractices = Math.max(6, progressData.length);
    
    return (
      <div className="absolute z-50 -top-64 left-0 w-80 h-60 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
        <div className="text-sm font-medium mb-3">Practice Progress</div>
        <div className="relative w-full h-48">
          <svg width="100%" height="100%" viewBox="0 0 280 180">
            {/* Grid lines */}
            {[1, 2, 3, 4, 5, 6].map(y => (
              <line key={y} x1="40" y1={140 - (y * 20)} x2="260" y2={140 - (y * 20)} stroke="#f0f0f0" strokeWidth="1" />
            ))}
            {Array.from({length: maxSessions}, (_, i) => i + 1).map(x => (
              <line key={x} x1={40 + (x * 25)} y1="20" x2={40 + (x * 25)} y2="140" stroke="#f0f0f0" strokeWidth="1" />
            ))}
            
            {/* Target lines at y=3 and y=5 */}
            <line x1="40" y1={140 - (3 * 20)} x2="260" y2={140 - (3 * 20)} stroke="#22c55e" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="40" y1={140 - (5 * 20)} x2="260" y2={140 - (5 * 20)} stroke="#22c55e" strokeWidth="2" strokeDasharray="5,5" />
            
            {/* Target line labels */}
            <text x="200" y={140 - (3 * 20) - 5} fontSize="11" fill="#22c55e" fontWeight="600">Foundation</text>
            
            {/* Y-axis labels */}
            {[1, 2, 3, 4, 5, 6].map(y => (
              <text key={y} x="35" y={145 - (y * 20)} fontSize="12" textAnchor="end" fill="#666">{y}</text>
            ))}
            
            {/* X-axis labels */}
            {Array.from({length: 8}, (_, i) => i + 1).map(x => (
              <text key={x} x={40 + (x * 25)} y="160" fontSize="12" textAnchor="middle" fill="#666">{x}</text>
            ))}
            
            {/* Stair-stepper bars */}
            {progressData.map((point, index) => (
              <rect
                key={index}
                x={40 + (point.session * 25) - 10}
                y={140 - (point.practices * 20)}
                width="20"
                height={point.practices * 20}
                fill="#3b82f6"
                opacity="0.7"
              />
            ))}
            
            {/* Axis lines */}
            <line x1="40" y1="20" x2="40" y2="140" stroke="#333" strokeWidth="2" />
            <line x1="40" y1="140" x2="260" y2="140" stroke="#333" strokeWidth="2" />
          </svg>
          
          {/* Axis labels */}
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">Sessions</div>
          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-gray-600">Practices</div>
        </div>
      </div>
    );
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
          {/* Green circle for progress graph */}
          {completionHistory.length > 0 && (
            <div
              className="w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer transition-all duration-200 flex items-center justify-center"
              onMouseEnter={() => setShowProgressGraph(true)}
              onMouseLeave={() => setShowProgressGraph(false)}
              title="Practice Progress Graph"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="8" width="2" height="3" fill="white" opacity="0.8" />
                <rect x="4" y="6" width="2" height="5" fill="white" opacity="0.8" />
                <rect x="7" y="4" width="2" height="7" fill="white" opacity="0.8" />
                <rect x="10" y="2" width="2" height="9" fill="white" opacity="0.8" />
              </svg>
            </div>
          )}
          
          {completionHistory.slice(-5).map((session, index) => {
            // Find the actual index of this session in the full history
            const actualIndex = completionHistory.indexOf(session);
            const sessionNumber = actualIndex + 1; // Sessions start at 1
            return (
              <div
                key={index}
                className={`w-5 h-7 rounded cursor-pointer transition-all duration-200 flex items-center justify-center text-xs font-medium text-white ${
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

      {/* Progress Graph */}
      {showProgressGraph && <ProgressGraph />}

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
