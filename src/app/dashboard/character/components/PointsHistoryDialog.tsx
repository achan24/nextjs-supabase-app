import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePointsHistory } from '@/hooks/usePointsHistory';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

interface PointsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  type: 'area' | 'subarea' | 'goal';
  title: string;
}

interface QuickStats {
  average: number;
  best: number;
  streak: number;
}

function calculateStats(history: { points: number; target: number }[]): QuickStats {
  if (!history.length) return { average: 0, best: 0, streak: 0 };

  const points = history.map(h => h.points);
  const average = points.reduce((a, b) => a + b, 0) / history.length;
  const best = Math.max(...points);
  
  // Calculate streak (consecutive days with points > 0)
  let streak = 0;
  let currentStreak = 0;
  for (const { points } of history) {
    if (points > 0) {
      currentStreak++;
      streak = Math.max(streak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return {
    average: Number(average.toFixed(1)),
    best,
    streak
  };
}

export function PointsHistoryDialog({ open, onOpenChange, id, type, title }: PointsHistoryDialogProps) {
  const { history, loading, error, fetchHistory } = usePointsHistory();

  useEffect(() => {
    if (open && id) {
      fetchHistory(id, type);
    }
  }, [open, id, type, fetchHistory]);

  const stats = calculateStats(history);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>History for "{title}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-500">Error loading history: {error.message}</div>}
          {!loading && !error && (
            <>
              {/* Chart */}
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                      interval="preserveStartEnd"
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                      formatter={(value: number) => [value, 'Points']}
                    />
                    <Line
                      type="monotone"
                      dataKey="points"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#9ca3af"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Quick Stats */}
              <Card className="p-4">
                <div className="text-sm font-medium mb-2">Quick Stats</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{stats.average}</div>
                    <div className="text-sm text-muted-foreground">Avg/day</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.best}</div>
                    <div className="text-sm text-muted-foreground">Best</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.streak}</div>
                    <div className="text-sm text-muted-foreground">Day Streak</div>
                  </div>
                </div>
              </Card>

              {/* Table */}
              <div className="relative overflow-y-auto max-h-[300px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="text-left py-2 px-4">Date</th>
                      <th className="text-right py-2 px-4">Points</th>
                      <th className="text-right py-2 px-4">Target</th>
                      <th className="text-right py-2 px-4">% of Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry.date} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-4">{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                        <td className="text-right py-2 px-4">{entry.points}</td>
                        <td className="text-right py-2 px-4">{entry.target}</td>
                        <td className="text-right py-2 px-4">
                          {entry.target > 0 
                            ? `${Math.round((entry.points / entry.target) * 100)}%`
                            : '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 