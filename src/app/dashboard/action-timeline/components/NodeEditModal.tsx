import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { parseDuration, formatDuration, Action, DecisionPoint, TimelineNote } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface NodeEditModalProps {
  node: Action | DecisionPoint | TimelineNote | null;
  onSave: (nodeData: any) => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
  duration: string;
  options: Array<{actionId: string, label: string}>;
  content: string;
}

const NodeEditModal: React.FC<NodeEditModalProps> = ({ node, onSave, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    duration: '',
    options: [],
    content: ''
  });

  useEffect(() => {
    if (node) {
      setFormData({
        name: node.name || '',
        description: node.description || '',
        duration: node.type === 'action' ? formatDuration((node as Action).duration) : '',
        options: node.type === 'decision' ? [...(node as DecisionPoint).options] : [],
        content: (node as TimelineNote).type === 'note' ? ((node as TimelineNote).content || '') : ''
      });
    }
  }, [node]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedNode = {
      ...node,
      name: formData.name,
      description: formData.description,
    };

    if (node?.type === 'action') {
      (updatedNode as Action).duration = parseDuration(formData.duration) || 5000;
    } else if (node?.type === 'decision') {
      (updatedNode as DecisionPoint).options = formData.options;
    } else if (node?.type === 'note') {
      (updatedNode as TimelineNote).content = formData.content;
    }

    onSave(updatedNode);
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { actionId: '', label: `Option ${prev.options.length + 1}` }]
    }));
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleOptionChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === index ? { ...option, [field]: value } : option
      )
    }));
  };

  if (!node) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Edit {node.type === 'action' ? 'Action' : node.type === 'decision' ? 'Decision Point' : 'Note'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm sm:text-base">Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter name"
              required
              className="text-sm sm:text-base"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm sm:text-base">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Enter description"
              className="text-sm sm:text-base"
            />
          </div>

          {node.type === 'action' && (
            <div>
              <Label htmlFor="duration" className="text-sm sm:text-base">Duration</Label>
              <Input
                id="duration"
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g., 5s, 2m 30s, 1h 15m"
                required
                className="text-sm sm:text-base"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: 1h 30m 45s (hours, minutes, seconds)
              </p>
            </div>
          )}

          {node.type === 'decision' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm sm:text-base">Options</Label>
                <Button
                  type="button"
                  onClick={handleAddOption}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>
              
              <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={option.label}
                      onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                      placeholder={`Option ${index + 1} label`}
                      className="flex-1 text-sm sm:text-base"
                    />
                    <Button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {formData.options.length === 0 && (
                <p className="text-xs sm:text-sm text-gray-500 italic">
                  No options yet. Add options to connect to other actions.
                </p>
              )}
            </div>
          )}

          {node.type === 'note' && (
            <div>
              <Label htmlFor="content" className="text-sm sm:text-base">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
                placeholder="Add details for this note"
                className="text-sm sm:text-base"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="flex-1 text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 text-sm sm:text-base"
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NodeEditModal;
