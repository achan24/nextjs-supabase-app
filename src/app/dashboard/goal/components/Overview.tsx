'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useGoalSystem } from '@/hooks/useGoalSystem';
import { Spinner } from '@/components/ui/spinner';
import { Metric } from '@/types/goal';

interface MetricWithContext extends Metric {
  id: string;
  name: string;
  type: 'time' | 'count' | 'streak' | 'custom';
  currentValue: number;
  targetValue?: number;
  unit?: string;
  goal: {
    id: string;
    title: string;
  };
  subarea: {
    id: string;
    name: string;
  };
  area: {
    id: string;
    name: string;
  };
}

export default function Overview() {
  const { areas, loading, error } = useGoalSystem();

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
        <p>Error loading overview: {error.message}</p>
      </div>
    );
  }

  const totalAreas = areas.length;
  const totalSubareas = areas.reduce((acc, area) => acc + area.subareas.length, 0);
  const totalGoals = areas.reduce(
    (acc, area) =>
      acc + area.subareas.reduce((subacc, subarea) => subacc + subarea.goals.length, 0),
    0
  );
  const totalMetrics = areas.reduce(
    (acc, area) =>
      acc +
      area.subareas.reduce(
        (subacc, subarea) =>
          subacc +
          subarea.goals.reduce((gacc, goal) => gacc + goal.metrics.length, 0),
        0
      ),
    0
  );
  const totalMilestones = areas.reduce(
    (acc, area) =>
      acc +
      area.subareas.reduce(
        (subacc, subarea) =>
          subacc +
          subarea.goals.reduce((gacc, goal) => gacc + goal.milestones.length, 0),
        0
      ),
    0
  );
  const completedMilestones = areas.reduce(
    (acc, area) =>
      acc +
      area.subareas.reduce(
        (subacc, subarea) =>
          subacc +
          subarea.goals.reduce(
            (gacc, goal) =>
              gacc + goal.milestones.filter((m) => m.completed).length,
            0
          ),
        0
      ),
    0
  );

  const metricsByType: Record<string, MetricWithContext[]> = areas.flatMap(area =>
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
  ).reduce((acc, metric) => {
    if (!acc[metric.type]) {
      acc[metric.type] = [];
    }
    acc[metric.type].push(metric);
    return acc;
  }, {} as Record<string, MetricWithContext[]>);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalAreas}</p>
            <p className="text-sm text-gray-500">Life areas being tracked</p>
            <p className="text-sm text-gray-500 mt-1">
              {totalSubareas} subareas defined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalGoals}</p>
            <p className="text-sm text-gray-500">Goals in progress</p>
            <p className="text-sm text-gray-500 mt-1">
              {totalMilestones} milestones defined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalMetrics}</p>
            <p className="text-sm text-gray-500">Metrics being tracked</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Milestone Completion</p>
                <p className="text-sm text-gray-500">
                  {completedMilestones} of {totalMilestones} completed
                </p>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className="h-2 bg-green-500 rounded-full"
                  style={{
                    width: `${
                      totalMilestones > 0
                        ? (completedMilestones / totalMilestones) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {areas.map((area) => (
                <div key={area.id} className="space-y-2">
                  <p className="text-sm font-medium">{area.name}</p>
                  {area.subareas.map((subarea) => {
                    const totalSubareaMilestones = subarea.goals.reduce(
                      (acc, goal) => acc + goal.milestones.length,
                      0
                    );
                    const completedSubareaMilestones = subarea.goals.reduce(
                      (acc, goal) =>
                        acc +
                        goal.milestones.filter((m) => m.completed).length,
                      0
                    );

                    return (
                      <div key={subarea.id}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs text-gray-500">{subarea.name}</p>
                          <p className="text-xs text-gray-500">
                            {completedSubareaMilestones} of {totalSubareaMilestones}
                          </p>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full">
                          <div
                            className="h-1 bg-green-500 rounded-full"
                            style={{
                              width: `${
                                totalSubareaMilestones > 0
                                  ? (completedSubareaMilestones /
                                      totalSubareaMilestones) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(metricsByType).map(([type, metrics]) => (
                <Card key={type} className="p-4">
                  <h3 className="text-lg font-semibold capitalize mb-4">{type} Metrics</h3>
                  <div className="space-y-3">
                    {metrics.map((metric) => (
                      <div key={metric.id} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{metric.name}</span>
                          <span className="text-sm text-gray-500">
                            {metric.currentValue}
                            {metric.unit && ` ${metric.unit}`}
                          </span>
                        </div>
                        {metric.targetValue && (
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{
                                width: `${Math.min(
                                  (metric.currentValue / metric.targetValue) * 100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                          {metric.goal.title} ({metric.area.name} &gt; {metric.subarea.name})
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 