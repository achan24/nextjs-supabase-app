import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePointsHistory } from '@/hooks/usePointsHistory';
import { format, subDays, isSameMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
  
  // Sort history by date (oldest to newest)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Create a function to format X-axis ticks
  const formatXAxisTick = (date: string, index: number) => {
    const currentDate = new Date(date);
    const prevDate = index > 0 ? new Date(sortedHistory[index - 1].date) : null;

    // If it's the first date or the month changed, show the month
    if (!prevDate || !isSameMonth(currentDate, prevDate)) {
      return format(currentDate, 'MMM d');
    }
    // Otherwise just show the day
    return format(currentDate, 'd');
  };

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
                  <LineChart data={sortedHistory}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      vertical={true}
                      horizontal={true}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date, index) => formatXAxisTick(date, index)}
                      interval={0}
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      height={25}
                      tickMargin={5}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      width={25}
                    />
                    <Tooltip
                      labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                      formatter={(value: number) => [value, 'Points']}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="points"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                      activeDot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#9ca3af"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={{ r: 2, fill: '#9ca3af', strokeWidth: 0 }}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Quick Stats */}
              <Card className="p-3">
                <div className="text-xs font-medium mb-1">Quick Stats</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold">{stats.average}</div>
                    <div className="text-xs text-muted-foreground">Avg/day</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{stats.best}</div>
                    <div className="text-xs text-muted-foreground">Best</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{stats.streak}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                </div>
              </Card>

              {/* Table */}
              <div className="relative overflow-y-auto max-h-[350px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="text-left py-1.5 px-3">Date</th>
                      <th className="text-right py-1.5 px-3">Points</th>
                      <th className="text-right py-1.5 px-3">Target</th>
                      <th className="text-right py-1.5 px-3">% of Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((entry) => (
                      <tr key={entry.date} className="border-b hover:bg-muted/50">
                        <td className="py-1.5 px-3">{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                        <td className="text-right py-1.5 px-3">{entry.points}</td>
                        <td className="text-right py-1.5 px-3">{entry.target}</td>
                        <td className="text-right py-1.5 px-3">
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