'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useGoalSystem } from '@/hooks/useGoalSystem';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { LifeGoalMetric } from '@/types/goal';

export default function MetricManager() {
  const {
    areas,
    loading,
    error,
    addMetric,
    updateMetric,
    deleteMetric,
  } = useGoalSystem();

  const [isAddingMetric, setIsAddingMetric] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricType, setNewMetricType] = useState<'time' | 'count' | 'streak' | 'custom'>('count');
  const [newMetricUnit, setNewMetricUnit] = useState('');
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [editMetricValue, setEditMetricValue] = useState('');

  const handleAddMetric = async () => {
    if (!selectedGoalId || !newMetricName.trim()) return;

    try {
      await addMetric(selectedGoalId, newMetricName, newMetricType, newMetricUnit);
      setIsAddingMetric(false);
      setNewMetricName('');
      setNewMetricType('count');
      setNewMetricUnit('');
      setSelectedGoalId(null);
      toast.success('Metric added successfully');
    } catch (err) {
      toast.error('Failed to add metric');
      console.error(err);
    }
  };

  const handleDeleteMetric = async (id: string) => {
    try {
      await deleteMetric(id);
      toast.success('Metric deleted successfully');
    } catch (err) {
      toast.error('Failed to delete metric');
      console.error(err);
    }
  };

  const handleUpdateMetricValue = async (id: string) => {
    if (!editMetricValue.trim()) return;

    try {
      await updateMetric(id, { current_value: parseFloat(editMetricValue) || 0 });
      setEditingMetric(null);
      setEditMetricValue('');
    } catch (err) {
      console.error('Error updating metric value:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        <p>Error loading metrics: {error.message}</p>
      </div>
    );
  }

  const allMetrics = areas.flatMap(area =>
    area.subareas.flatMap(subarea =>
      subarea.goals.flatMap(goal =>
        goal.metrics.map(metric => ({
          ...metric,
          goal: {
            id: goal.id,
            title: goal.title,
          },
          subarea: {
            id: subarea.id,
            name: subarea.name,
          },
          area: {
            id: area.id,
            name: area.name,
          },
        }))
      )
    )
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Metrics</h2>
        <Button onClick={() => setIsAddingMetric(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Metric
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allMetrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{metric.name}</CardTitle>
                  <p className="text-sm text-gray-500">
                    {metric.area.name} &gt; {metric.subarea.name} &gt; {metric.goal.title}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingMetric(metric.id);
                      setEditMetricValue(metric.current_value?.toString() || '');
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteMetric(metric.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-2xl font-bold">
                    {metric.current_value}
                    {metric.unit && ` ${metric.unit}`}
                  </p>
                  <p className="text-sm text-gray-500">Current Value</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{metric.type}</p>
                  <p className="text-xs text-gray-500">Type</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Metric Dialog */}
      <Dialog open={isAddingMetric} onOpenChange={setIsAddingMetric}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Metric</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={newMetricName}
                onChange={(e) => setNewMetricName(e.target.value)}
                placeholder="e.g., Distance Run"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">
                Type
              </label>
              <select
                id="type"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={newMetricType}
                onChange={(e) => setNewMetricType(e.target.value as 'time' | 'count' | 'streak' | 'custom')}
              >
                <option value="count">Count</option>
                <option value="time">Time</option>
                <option value="streak">Streak</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="unit" className="text-sm font-medium">
                Unit (optional)
              </label>
              <Input
                id="unit"
                value={newMetricUnit}
                onChange={(e) => setNewMetricUnit(e.target.value)}
                placeholder="e.g., km, minutes, points"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="goal" className="text-sm font-medium">
                Goal
              </label>
              <select
                id="goal"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={selectedGoalId || ''}
                onChange={(e) => setSelectedGoalId(e.target.value || null)}
              >
                <option value="">Select a goal</option>
                {areas.map((area) =>
                  area.subareas.map((subarea) =>
                    subarea.goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {area.name} &gt; {subarea.name} &gt; {goal.title}
                      </option>
                    ))
                  )
                )}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddingMetric(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMetric}
              disabled={!newMetricName.trim() || !selectedGoalId}
            >
              Add Metric
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Metric Value Dialog */}
      <Dialog open={editingMetric !== null} onOpenChange={(open) => !open && setEditingMetric(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Metric Value</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="metric-value" className="text-sm font-medium">
                Value
              </label>
              <Input
                id="metric-value"
                type="number"
                value={editMetricValue}
                onChange={(e) => setEditMetricValue(e.target.value)}
                placeholder="Enter new value"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditingMetric(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingMetric && handleUpdateMetricValue(editingMetric)}
              disabled={!editMetricValue.trim()}
            >
              Update Value
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 