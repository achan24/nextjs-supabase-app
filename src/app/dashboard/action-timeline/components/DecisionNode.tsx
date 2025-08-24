import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CheckCircle } from 'lucide-react';
import { DecisionPoint } from '../types';

interface DecisionNodeData {
  decisionPoint: DecisionPoint;
  onEdit: (decisionPoint: DecisionPoint) => void;
  onDelete: (id: string) => void;
  onMakeDecision: (decisionPoint: DecisionPoint, actionId: string) => void;
  isTimelineRunning: boolean;
}

const DecisionNode: React.FC<NodeProps<DecisionNodeData>> = ({ data, selected }) => {
  const { decisionPoint, onEdit, onDelete, onMakeDecision, isTimelineRunning } = data;
  const [showOptions, setShowOptions] = React.useState(false);
  
  // Reset showOptions when decision point status changes
  React.useEffect(() => {
    if (decisionPoint.status !== 'active') {
      setShowOptions(false);
    }
  }, [decisionPoint.status]);
  
  // Add null check to prevent errors
  if (!decisionPoint) {
    return <div className="text-red-500 p-2">Invalid decision point</div>;
  }
  
  // Add null check to prevent errors
  if (!decisionPoint) {
    return <div className="text-red-500 p-2">Invalid decision point</div>;
  }
  
  const getStatusIcon = () => {
    switch (decisionPoint.status) {
      case 'active':
        return <div className="w-4 h-4 bg-orange-500 rounded-sm ring-2 ring-orange-300 ring-opacity-50" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-sm" />;
    }
  };

  const getStatusColor = () => {
    switch (decisionPoint.status) {
      case 'active':
        return 'border-orange-500 bg-orange-50';
      case 'completed':
        return 'border-green-500 bg-green-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getDiamondClasses = () => {
    const baseClasses = `
      relative w-20 h-20 sm:w-24 sm:h-24 transform rotate-45 border-4 transition-all duration-300
      shadow-xl
    `;
    
    switch (decisionPoint.status) {
      case 'active':
        return `${baseClasses} border-orange-500 bg-orange-100 cursor-pointer hover:bg-orange-200 hover:border-orange-600 hover:shadow-2xl`;
      case 'completed':
        return `${baseClasses} border-green-500 bg-green-100 cursor-default`;
      default:
        return `${baseClasses} border-red-500 bg-red-100 cursor-default`;
    }
  };

  return (
    <div className="decision-node relative">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400"
      />
      
      {/* Diamond Shape - FORCED UPDATE */}
      <div 
        className={`${getDiamondClasses()} ${selected ? 'ring-4 ring-yellow-400' : ''}`}
        onClick={() => {
          console.log('[DecisionNode] Clicked decision point:', {
            status: decisionPoint.status,
            optionsCount: decisionPoint.options.length,
            options: decisionPoint.options
          });
          
          if (decisionPoint.status === 'active' && decisionPoint.options.length > 0) {
            // If there's only one option, auto-select it
            if (decisionPoint.options.length === 1) {
              onMakeDecision(decisionPoint, decisionPoint.options[0].actionId);
            } else {
              // If multiple options, show the modal
              setShowOptions(!showOptions);
              console.log('[DecisionNode] Toggled showOptions to:', !showOptions);
            }
          }
        }}
      >
        {/* Content inside diamond (rotated back) */}
        <div className="absolute inset-3 sm:inset-4 transform -rotate-45 flex items-center justify-center bg-white rounded">
          {getStatusIcon()}
        </div>
      </div>
      
      {/* Decision Label */}
      <div className="absolute -top-8 sm:-top-10 left-1/2 transform -translate-x-1/2 min-w-max">
        <span className="text-xs sm:text-sm font-medium text-gray-900 bg-white px-2 py-1 rounded shadow-sm border whitespace-nowrap">
          {decisionPoint.name}
        </span>
      </div>
      
      {/* Options count */}
      <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-white px-1 rounded">
        {decisionPoint.options.length} option{decisionPoint.options.length !== 1 ? 's' : ''} ({decisionPoint.status})
      </div>
      
      {/* Description tooltip on hover */}
      {decisionPoint.description && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 opacity-0 hover:opacity-100 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
          {decisionPoint.description}
        </div>
      )}
      

      
      {/* Decision Selection Modal - shows when active and options are toggled */}
      {decisionPoint.status === 'active' && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-white border-2 border-orange-500 rounded-lg shadow-xl p-4 z-50 min-w-48">
          <div className="text-sm font-medium text-gray-700 mb-3 text-center flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            Choose an option:
          </div>
          <div className="space-y-2">
            {decisionPoint.options.map((option, index) => (
              <button
                key={option.actionId}
                onClick={() => {
                  onMakeDecision(decisionPoint, option.actionId);
                  setShowOptions(false); // Close modal after selection
                }}
                className="w-full text-left text-sm px-3 py-2 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 hover:border-orange-300 transition-all duration-200 cursor-pointer hover:shadow-md"
              >
                {option.label || `Option ${index + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Completed selection indicator */}
      {decisionPoint.status === 'completed' && decisionPoint.selectedOption && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-green-50 border border-green-200 rounded px-2 py-1 text-xs text-green-700">
          Selected: {decisionPoint.options.find(opt => opt.actionId === decisionPoint.selectedOption)?.label || 'Option'}
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-400"
      />
      
      {/* Edit/Delete buttons below node */}
      {selected && !isTimelineRunning && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 flex gap-0.5">
          <button
            onClick={() => onEdit(decisionPoint)}
            className="text-xs px-1 py-0.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 border"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(decisionPoint.id)}
            className="text-xs px-1 py-0.5 bg-red-100 text-red-600 rounded hover:bg-red-200 border"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};

export default DecisionNode;
