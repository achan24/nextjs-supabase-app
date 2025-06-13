'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Node } from 'reactflow';
import { ChevronDown, ChevronUp, GripVertical, Clock, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CreateSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSequence: (tasks: Node[]) => void;
  flows: any[];
  initialTasks?: Node[];
}

interface SortableTaskItemProps {
  task: Node;
  onRemove: (task: Node) => void;
  onJump: (flowId: string, nodeId: string) => void;
}

function SortableTaskItem({ task, onRemove, onJump }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-4 flex items-center gap-4 group hover:border-gray-400 transition-colors ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical size={20} className="text-gray-400" />
      </div>
      <div 
        className="flex-1 cursor-pointer"
        onClick={() => task.data.flowId && onJump(task.data.flowId, task.id)}
      >
        <div className="font-medium">{task.data.label}</div>
        {task.data.targetDuration && (
          <div className="text-sm text-gray-500">
            Target: {formatTime(task.data.targetDuration * 1000)}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(task);
        }}
        className="text-red-500 hover:text-red-600"
      >
        Remove
      </Button>
    </div>
  );
}

export function CreateSequenceModal({ isOpen, onClose, onCreateSequence, flows, initialTasks }: CreateSequenceModalProps) {
  const router = useRouter();
  const [selectedTasks, setSelectedTasks] = useState<Node[]>([]);
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (initialTasks) {
      setSelectedTasks(initialTasks);
    } else {
      setSelectedTasks([]);
    }
  }, [initialTasks, isOpen]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSelectedTasks((tasks: Node[]) => {
        const oldIndex = tasks.findIndex((task: Node) => task.id === active.id);
        const newIndex = tasks.findIndex((task: Node) => task.id === over.id);
        return arrayMove(tasks, oldIndex, newIndex);
      });
    }
  };

  const toggleFlowExpansion = (flowId: string) => {
    setExpandedFlow(expandedFlow === flowId ? null : flowId);
  };

  const toggleTaskSelection = (task: Node, flowId: string) => {
    setSelectedTasks(prev => {
      const isSelected = prev.some((t: Node) => t.id === task.id);
      if (isSelected) {
        return prev.filter((t: Node) => t.id !== task.id);
      } else {
        return [...prev, { ...task, data: { ...task.data, flowId } }];
      }
    });
  };

  const handleJumpToNode = (flowId: string, nodeId: string) => {
    onClose();
    router.push(`/dashboard/process-flow?flowId=${flowId}&nodeId=${nodeId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{initialTasks ? 'Edit Sequence' : 'Create Timer Sequence'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 h-full overflow-hidden">
          {/* Flow Selection */}
          <Card className="p-4 overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Select from Process Maps</h2>
            <div className="space-y-2">
              {flows.map(flow => (
                <div key={flow.id} className="border rounded-lg">
                  <button
                    className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50"
                    onClick={() => toggleFlowExpansion(flow.id)}
                  >
                    <span className="font-medium">{flow.title}</span>
                    {expandedFlow === flow.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {expandedFlow === flow.id && (
                    <div className="p-3 border-t bg-gray-50">
                      {flow.nodes.map((task: Node) => (
                        <div
                          key={task.id}
                          className={`p-2 mb-2 rounded cursor-pointer flex items-center gap-2 ${
                            selectedTasks.some(t => t.id === task.id)
                              ? 'bg-blue-100'
                              : 'bg-white hover:bg-gray-100'
                          }`}
                          onClick={() => toggleTaskSelection(task, flow.id)}
                        >
                          <Clock size={16} />
                          <span>{task.data.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Sequence Building */}
          <div className="flex flex-col h-full">
            <Card className="p-4 flex-1 overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Timer Sequence</h2>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedTasks.map(task => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {selectedTasks.map((task) => (
                      <SortableTaskItem
                        key={task.id}
                        task={task}
                        onRemove={() => toggleTaskSelection(task, task.data.flowId)}
                        onJump={handleJumpToNode}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {selectedTasks.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Select tasks from process maps to create your sequence
                </div>
              )}
            </Card>

            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => onCreateSequence(selectedTasks)}
                disabled={selectedTasks.length === 0}
              >
                {initialTasks ? 'Update' : 'Create'} Sequence ({selectedTasks.length} tasks)
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 