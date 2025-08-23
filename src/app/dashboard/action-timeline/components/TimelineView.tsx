import React, { useEffect, useRef, useState } from 'react';
import { Clock, Play, Pause, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { formatDuration, TimelineEngine } from '../types';
import { format } from 'date-fns';

interface TimelineViewProps {
  timelineEngine: TimelineEngine;
}

const TimelineView: React.FC<TimelineViewProps> = ({ timelineEngine }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentNodeRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current node when it changes
  useEffect(() => {
    if (currentNodeRef.current && scrollContainerRef.current) {
      currentNodeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [timelineEngine.currentNodeId]);

  const renderTimelineNode = (node: any, index: number, isActive = false, isCompleted = false) => {
    const getNodeIcon = () => {
      if (node.type === 'action') {
        if (isCompleted) return <CheckCircle className="w-5 h-5 text-green-500" />;
        if (isActive) return <Play className="w-5 h-5 text-blue-500" />;
        return <Clock className="w-5 h-5 text-gray-400" />;
      } else {
        if (isCompleted) return <CheckCircle className="w-5 h-5 text-green-500" />;
        if (isActive) return <AlertCircle className="w-5 h-5 text-orange-500" />;
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      }
    };

    const getNodeColor = () => {
      if (isCompleted) return 'bg-green-50 border-green-200';
      if (isActive) return node.type === 'action' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200';
      return 'bg-gray-50 border-gray-200';
    };

    const getProgressTime = () => {
      if (node.type === 'action' && node.status === 'running' && node.startTime) {
        const elapsed = currentTime - node.startTime;
        const remaining = Math.max(0, node.duration - elapsed);
        return formatDuration(remaining);
      }
      return null;
    };

    return (
      <div
        key={`${node.id}-${index}`}
        ref={isActive ? currentNodeRef : null}
        className={`timeline-node p-4 rounded-lg border-2 ${getNodeColor()} transition-all duration-300`}
      >
        <div className="flex items-start gap-3">
          {getNodeIcon()}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{node.name}</h3>
            {node.description && (
              <p className="text-sm text-gray-600 mt-1">{node.description}</p>
            )}
            
            {node.type === 'action' && (
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>Duration: {formatDuration(node.duration)}</span>
                {getProgressTime() && (
                  <span className="text-blue-600 font-medium">
                    Remaining: {getProgressTime()}
                  </span>
                )}
              </div>
            )}

            {node.type === 'action' && node.status === 'running' && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(node.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${node.progress}%` }}
                  />
                </div>
              </div>
            )}

            {node.type === 'decision' && node.status === 'completed' && node.selectedOption && (
              <div className="mt-2 text-sm text-green-600">
                Selected: {node.options.find((opt: any) => opt.actionId === node.selectedOption)?.label || 'Option'}
              </div>
            )}

            {node.type === 'decision' && node.status === 'active' && (
              <div className="mt-3 space-y-2">
                <div className="text-sm font-medium text-gray-700">Choose an option:</div>
                {node.options.map((option: any, optIndex: number) => (
                  <button
                    key={option.actionId}
                    onClick={() => timelineEngine.makeDecision(node, option.actionId)}
                    className="block w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300"
                  >
                    {option.label || `Option ${optIndex + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderConnector = (index: number) => (
    <div key={`connector-${index}`} className="flex justify-center py-2">
      <ArrowRight className="w-5 h-5 text-gray-400" />
    </div>
  );

  const getTimelineNodes = () => {
    const allNodes = timelineEngine.getAllNodes();
    const history = timelineEngine.executionHistory;
    const currentId = timelineEngine.currentNodeId;

    // Build the execution path
    const executionPath: Array<{
      node: any;
      isActive: boolean;
      isCompleted: boolean;
      isHistory: boolean;
    }> = [];
    
    // Add completed nodes from history
    history.forEach((nodeId, index) => {
      const node = timelineEngine.getNode(nodeId);
      if (node && nodeId !== currentId) {
        executionPath.push({
          node,
          isActive: false,
          isCompleted: true,
          isHistory: true
        });
      }
    });

    // Add current node
    if (currentId) {
      const currentNode = timelineEngine.getNode(currentId);
      if (currentNode) {
        executionPath.push({
          node: currentNode,
          isActive: true,
          isCompleted: false,
          isHistory: false
        });
      }
    }

    // Add potential next nodes
    if (currentId) {
      const currentNode = timelineEngine.getNode(currentId);
      if (currentNode) {
        let nextNodes: any[] = [];
        
        if (currentNode.type === 'action') {
          nextNodes = currentNode.connections.map(id => timelineEngine.getNode(id)).filter(Boolean);
        } else if (currentNode.type === 'decision') {
          nextNodes = currentNode.options.map((opt: any) => timelineEngine.getNode(opt.actionId)).filter(Boolean);
        }

        nextNodes.forEach(node => {
          executionPath.push({
            node,
            isActive: false,
            isCompleted: false,
            isHistory: false
          });
        });
      }
    }

    return executionPath;
  };

  const executionPath = getTimelineNodes();

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Timeline Execution</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Current Time: {format(currentTime, 'HH:mm:ss')}</span>
            {timelineEngine.isRunning && (
              <span className="text-green-600 font-medium">● Running</span>
            )}
          </div>
        </div>
        
        {timelineEngine.executionHistory.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Execution started at {format(new Date(currentTime - (timelineEngine.executionHistory.length * 1000)), 'HH:mm:ss')}
          </div>
        )}
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {executionPath.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No Timeline Yet</h3>
            <p className="text-gray-400">
              Create actions and decision points in the graph editor, then start the timeline.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {executionPath.map((item, index) => (
              <React.Fragment key={`${item.node.id}-${index}`}>
                {renderTimelineNode(item.node, index, item.isActive, item.isCompleted)}
                {index < executionPath.length - 1 && renderConnector(index)}
              </React.Fragment>
            ))}
            
            {!timelineEngine.isRunning && timelineEngine.currentNodeId && (
              <div className="mt-8 text-center py-8 border-t border-gray-200">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-medium text-gray-700">Timeline Complete</h3>
                <p className="text-gray-500">All actions have been executed.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineView;
