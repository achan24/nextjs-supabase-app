import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CheckCircle } from 'lucide-react';
import { formatDuration, Action } from '../types';

const LINE_WIDTH = 100; // Reduced for mobile
const BAR_HEIGHT = 10; // Reduced for mobile

interface ActionNodeData {
  action: Action;
  onEdit: (action: Action) => void;
  onDelete: (id: string) => void;
  isTimelineRunning: boolean;
  isManualMode?: boolean;
  timelineComplete?: boolean;
}

const ActionNode: React.FC<NodeProps<ActionNodeData>> = ({ data, selected }) => {
  const { action, onEdit, onDelete, isTimelineRunning, isManualMode, timelineComplete } = data || {};
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  
  if (!action) return <div className="text-red-500 p-2">Invalid action</div>;

  // Update timer for manual mode
  React.useEffect(() => {
    if (isManualMode && action.startTime) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 100); // Update every 100ms

      return () => clearInterval(interval);
    }
  }, [isManualMode, action.startTime]);

  const getElapsedTime = () => {
    if (isManualMode && action.startTime) {
      if (action.status === 'running') {
        return currentTime - action.startTime;
      } else if (action.status === 'completed' && action.actualDuration) {
        return action.actualDuration;
      }
    }
    return 0;
  };

  const statusIcon = (() => {
    switch (action.status) {
      case 'running':
        return (
          <div className={`w-3 h-3 rounded-full ring-2 ring-opacity-50 ${
            timelineComplete 
              ? 'bg-purple-500 ring-purple-300' 
              : 'bg-blue-500 ring-blue-300'
          }`} />
        );
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'paused':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  })();

  const speedEmoji = action.duration <= 5000 ? '⚡' : action.duration <= 15000 ? '🕐' : '🐌';

  const barClasses = [
    'relative rounded-sm border shadow-sm transition-all duration-300',
    action.status === 'running' ? (timelineComplete ? 'bg-purple-600 border-purple-700' : 'bg-blue-600 border-blue-700') :
    action.status === 'completed' ? 'bg-green-500 border-green-600' :
    action.status === 'paused' ? 'bg-yellow-500 border-yellow-600' :
    'bg-blue-500 border-blue-600',
    selected ? 'ring-2 ring-blue-400 ring-offset-1' : ''
  ].join(' ');

  return (
    <div
      data-testid="action-node-v4"
      className="relative w-fit select-none"
      style={{ width: LINE_WIDTH }}
    >
      {/* Left connector */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400"
      />

      {/* Header: status + name (no absolute positioning) */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span
            className="text-xs sm:text-sm font-medium text-gray-900"
            title={action.description || ''}
          >
            {action.name}
          </span>
        </div>


      </div>

      {/* Bar */}
      <div className={barClasses} style={{ width: LINE_WIDTH, height: BAR_HEIGHT }}>
        {action.status === 'running' && action.progress > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-white/40 border-r border-white transition-all duration-300"
            style={{ width: `${action.progress}%` }}
          />
        )}
      </div>

      {/* Footer: duration | progress | speed */}
      <div className="mt-1 grid grid-cols-3 items-center text-xs">
        <span className="justify-self-start text-gray-700 text-xs">
          {isManualMode && action.status === 'running' ? 
            `${formatDuration(getElapsedTime())} (${formatDuration(action.duration)})` :
            action.actualDuration ? 
              `${formatDuration(action.actualDuration)} (${formatDuration(action.duration)})` : 
              formatDuration(action.duration)
          }
        </span>

        {isManualMode && action.status === 'running' ? (
          <span className={`justify-self-center font-medium text-xs ${timelineComplete ? 'text-purple-600' : 'text-orange-600'} ${timelineComplete ? '' : 'animate-pulse'}`}>
            {timelineComplete ? '🏁 ' : '⏱️ '}{formatDuration(getElapsedTime())}
          </span>
        ) : isManualMode && action.status === 'completed' && action.startTime ? (
          <span className="justify-self-center font-medium text-green-600 text-xs">
            ⏱️ {formatDuration(getElapsedTime())}
          </span>
        ) : action.status === 'running' && action.progress > 0 ? (
          <span className="justify-self-center font-medium text-blue-600 text-xs">
            {Math.round(action.progress)}%
          </span>
        ) : (
          <span />
        )}

        <span className="justify-self-end text-sm sm:text-base">
          {action.status === 'running' ? speedEmoji : null}
        </span>
      </div>

      {/* Right connector */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-400"
      />
      
      {/* Edit/Delete buttons below node */}
      {selected && !isTimelineRunning && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 flex gap-0.5">
          <button
            onClick={() => onEdit(action)}
            className="text-xs px-1 py-0.5 bg-blue-100 text-blue-700 rounded border hover:bg-blue-200"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(action.id)}
            className="text-xs px-1 py-0.5 bg-red-100 text-red-700 rounded border hover:bg-red-200"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};

export default ActionNode;
