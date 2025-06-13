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
import { v4 as uuidv4 } from 'uuid';

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

interface SequenceNode extends Node {
  parallelGroupId?: string;
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
  const [selectedTasks, setSelectedTasks] = useState<SequenceNode[]>([]);
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);
  const [parallelBlocks, setParallelBlocks] = useState<{ id: string, taskIds: string[] }[]>([]);

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
      setSelectedTasks((tasks: SequenceNode[]) => {
        const oldIndex = tasks.findIndex((task: SequenceNode) => task.id === active.id);
        const newIndex = tasks.findIndex((task: SequenceNode) => task.id === over.id);
        return arrayMove(tasks, oldIndex, newIndex);
      });
    }
  };

  const toggleFlowExpansion = (flowId: string) => {
    setExpandedFlow(expandedFlow === flowId ? null : flowId);
  };

  const toggleTaskSelection = (task: SequenceNode, flowId: string) => {
    setSelectedTasks(prev => {
      const isSelected = prev.some((t: SequenceNode) => t.id === task.id);
      if (isSelected) {
        return prev.filter((t: SequenceNode) => t.id !== task.id);
      } else {
        return [...prev, { ...task, data: { ...task.data, flowId } }];
      }
    });
  };

  const handleJumpToNode = (flowId: string, nodeId: string) => {
    onClose();
    router.push(`/dashboard/process-flow?flowId=${flowId}&nodeId=${nodeId}`);
  };

  const addParallelBlock = () => {
    setParallelBlocks(blocks => [...blocks, { id: uuidv4(), taskIds: [] }]);
  };

  const addToParallelBlock = (blockId: string, task: SequenceNode) => {
    setParallelBlocks(blocks => blocks.map(b => b.id === blockId ? { ...b, taskIds: [...b.taskIds, task.id] } : b));
    setSelectedTasks(tasks => tasks.map(t => t.id === task.id ? { ...t, parallelGroupId: blockId } : t));
  };

  const removeFromParallelBlock = (blockId: string, taskId: string) => {
    setParallelBlocks(blocks => blocks.map(b => b.id === blockId ? { ...b, taskIds: b.taskIds.filter(id => id !== taskId) } : b));
    setSelectedTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, parallelGroupId: undefined } : t));
  };

  const removeParallelBlock = (blockId: string) => {
    setParallelBlocks(blocks => blocks.filter(b => b.id !== blockId));
    setSelectedTasks(tasks => tasks.map(t => t.parallelGroupId === blockId ? { ...t, parallelGroupId: undefined } : t));
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
              <Button variant="secondary" className="mb-4" onClick={addParallelBlock}>+ Parallel Block</Button>
              {parallelBlocks.map(block => (
                <div key={block.id} className="border-2 border-dashed border-blue-400 rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-blue-700">Parallel Block</span>
                    <Button variant="ghost" size="sm" onClick={() => removeParallelBlock(block.id)} className="text-red-500">Remove Block</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {block.taskIds.map(taskId => {
                      const task = selectedTasks.find(t => t.id === taskId);
                      if (!task) return null;
                      return (
                        <div key={task.id} className="bg-blue-100 px-3 py-1 rounded flex items-center gap-2">
                          <span>{task.data.label}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeFromParallelBlock(block.id, task.id)} className="text-red-500">x</Button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Add task:</span>
                    <select onChange={e => {
                      const task = selectedTasks.find(t => t.id === e.target.value);
                      if (task) addToParallelBlock(block.id, task);
                    }} value="">
                      <option value="">Select task</option>
                      {selectedTasks.filter(t => !t.parallelGroupId).map(t => (
                        <option key={t.id} value={t.id}>{t.data.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedTasks.filter(t => !t.parallelGroupId).map(task => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {selectedTasks.filter(t => !t.parallelGroupId).map((task) => (
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