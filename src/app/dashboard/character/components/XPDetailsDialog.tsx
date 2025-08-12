'use client'

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';

type DailyXP = { date: string; pointsFromGoals: number; pointsFallback: number; xp: number };
type TotalRow = { id: string; name: string; points: number; xp: number };

interface XPDetailsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  days?: number;
}

export default function XPDetailsDialog({ open, onOpenChange, days = 14 }: XPDetailsDialogProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [daily, setDaily] = useState<DailyXP[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [rangeDays, setRangeDays] = useState<number | 'all'>(90);
  const [areaTotals, setAreaTotals] = useState<TotalRow[]>([]);
  const [subareaTotals, setSubareaTotals] = useState<TotalRow[]>([]);
  const [goalTotals, setGoalTotals] = useState<TotalRow[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Range for the daily chart (binds to rangeDays; 'all' caps to 180d for readability)
        const chartDays = typeof rangeDays === 'number' ? rangeDays : 180;
        const start = new Date();
        start.setDate(start.getDate() - (chartDays - 1));
        const startStr = start.toISOString().split('T')[0];

        // Goal history per day
        const { data: gph } = await supabase
          .from('goal_points_history')
          .select('date, points')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .order('date', { ascending: true });

        // Area history per day (fallback when no goal rows for that day)
        const { data: aph } = await supabase
          .from('area_points_history')
          .select('date, points')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .order('date', { ascending: true });

        const goalDailyMap = new Map<string, number>();
        (gph || []).forEach(r => goalDailyMap.set(r.date as string, (goalDailyMap.get(r.date as string) || 0) + Number(r.points || 0)));

        const areaDailyMap = new Map<string, number>();
        (aph || []).forEach(r => areaDailyMap.set(r.date as string, (areaDailyMap.get(r.date as string) || 0) + Number(r.points || 0)));

        const out: DailyXP[] = [];
        const today = new Date();
        for (let i = chartDays - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toISOString().split('T')[0];
          const fromGoals = goalDailyMap.get(key) || 0;
          const fallback = fromGoals > 0 ? 0 : (areaDailyMap.get(key) || 0);
          out.push({
            date: key,
            pointsFromGoals: fromGoals,
            pointsFallback: fallback,
            xp: (fromGoals + fallback) * 10,
          });
        }
        setDaily(out);

        // Recent contributing goal entries with hierarchy (most informative for user)
        const { data: recentGoal } = await supabase
          .from('goal_points_history')
          .select(`date, points, life_goals!inner(title, life_goal_subareas!inner(name, life_goal_areas!inner(name)))`)
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(30);
        setRecent(recentGoal || []);

        // Aggregates over selectable range (default 90d, or all time)
        const rangeStart = (() => {
          if (rangeDays === 'all') return null;
          const d = new Date();
          d.setDate(d.getDate() - (rangeDays - 1));
          return d.toISOString().split('T')[0];
        })();

        let aggQuery = supabase
          .from('goal_points_history')
          .select(`points, date, life_goals!inner(id, title, life_goal_subareas!inner(id, name, life_goal_areas!inner(id, name)))`)
          .eq('user_id', user.id)
          .order('date', { ascending: true });
        if (rangeStart) aggQuery = aggQuery.gte('date', rangeStart);
        const { data: aggRows } = await aggQuery;

        const areaAggMap = new Map<string, TotalRow>();
        const subAggMap = new Map<string, TotalRow>();
        const goalAggMap = new Map<string, TotalRow>();
        (aggRows || []).forEach((r: any) => {
          const pts = Number(r.points || 0);
          const area = r.life_goals?.life_goal_subareas?.life_goal_areas;
          const sub = r.life_goals?.life_goal_subareas;
          const goal = r.life_goals;
          if (area) {
            const key = String(area.id);
            const prev = areaAggMap.get(key) || { id: key, name: String(area.name), points: 0, xp: 0 };
            prev.points += pts; prev.xp = prev.points * 10; areaAggMap.set(key, prev);
          }
          if (sub) {
            const key = String(sub.id);
            const prev = subAggMap.get(key) || { id: key, name: String(sub.name), points: 0, xp: 0 };
            prev.points += pts; prev.xp = prev.points * 10; subAggMap.set(key, prev);
          }
          if (goal) {
            const key = String(goal.id);
            const prev = goalAggMap.get(key) || { id: key, name: String(goal.title), points: 0, xp: 0 };
            prev.points += pts; prev.xp = prev.points * 10; goalAggMap.set(key, prev);
          }
        });
        const sortDesc = (a: TotalRow, b: TotalRow) => b.points - a.points;
        setAreaTotals(Array.from(areaAggMap.values()).sort(sortDesc));
        setSubareaTotals(Array.from(subAggMap.values()).sort(sortDesc));
        setGoalTotals(Array.from(goalAggMap.values()).sort(sortDesc));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, rangeDays, supabase]);

  const totals = useMemo(() => {
    const totalPoints = daily.reduce((s, d) => s + (d.pointsFromGoals + d.pointsFallback), 0);
    const fromGoals = daily.reduce((s, d) => s + d.pointsFromGoals, 0);
    const fromFallback = daily.reduce((s, d) => s + d.pointsFallback, 0);
    return { totalXP: totalPoints * 10, fromGoals, fromFallback };
  }, [daily]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>XP Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 flex flex-wrap gap-4">
              <span><strong>Total XP</strong>: {totals.totalXP}</span>
              <span><strong>Points from goals</strong>: {totals.fromGoals}</span>
              <span><strong>Fallback (area-only days)</strong>: {totals.fromFallback}</span>
            </div>
            <div className="ml-auto text-xs text-gray-600 flex items-center gap-1">
              Range:
              <select
                value={rangeDays}
                onChange={(e) => setRangeDays((e.target.value === 'all' ? 'all' : Number(e.target.value)))}
                className="border rounded px-2 py-1 text-xs"
              >
                <option value={14}>14d</option>
                <option value={30}>30d</option>
                <option value={90}>90d</option>
                <option value={365}>365d</option>
                <option value={'all'}>All time</option>
              </select>
            </div>
          </div>

          <div className="h-56 bg-white border rounded-md">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily.map(d => ({
                label: `${format(new Date(d.date), 'MMM d')}`,
                xp: d.xp,
                fromGoals: d.pointsFromGoals * 10,
                fallbackXP: d.pointsFallback * 10,
              }))} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any, n: any) => [v, n === 'xp' ? 'XP' : n]} />
                <Line type="monotone" dataKey="xp" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="Daily XP" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Aggregates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-md">
              <div className="px-3 py-2 text-sm font-medium">Totals by Area</div>
              <div className="max-h-56 overflow-auto divide-y">
                {areaTotals.length === 0 && <div className="p-3 text-xs text-gray-500">No data</div>}
                {areaTotals.slice(0, 20).map(a => (
                  <div key={a.id} className="px-3 py-2 text-xs flex items-center justify-between">
                    <div className="truncate mr-2">{a.name}</div>
                    <div className="font-medium">{a.points} pts</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border rounded-md">
              <div className="px-3 py-2 text-sm font-medium">Totals by Subarea</div>
              <div className="max-h-56 overflow-auto divide-y">
                {subareaTotals.length === 0 && <div className="p-3 text-xs text-gray-500">No data</div>}
                {subareaTotals.slice(0, 20).map(s => (
                  <div key={s.id} className="px-3 py-2 text-xs flex items-center justify-between">
                    <div className="truncate mr-2">{s.name}</div>
                    <div className="font-medium">{s.points} pts</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border rounded-md">
              <div className="px-3 py-2 text-sm font-medium">Totals by Goal</div>
              <div className="max-h-56 overflow-auto divide-y">
                {goalTotals.length === 0 && <div className="p-3 text-xs text-gray-500">No data</div>}
                {goalTotals.slice(0, 20).map(g => (
                  <div key={g.id} className="px-3 py-2 text-xs flex items-center justify-between">
                    <div className="truncate mr-2">{g.name}</div>
                    <div className="font-medium">{g.points} pts</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Recent XP sources (goals)</div>
            <div className="max-h-56 overflow-auto border rounded-md divide-y">
              {loading && (
                <div className="p-3 text-sm text-gray-500">Loading…</div>
              )}
              {!loading && recent.length === 0 && (
                <div className="p-3 text-sm text-gray-500">No recent goal history found.</div>
              )}
              {!loading && recent.map((r, idx) => (
                <div key={idx} className="p-3 text-sm flex items-center justify-between">
                  <div className="mr-4 truncate">
                    <div className="font-medium truncate">{r.life_goals?.title || 'Goal'}</div>
                    <div className="text-gray-500 truncate">
                      {r.life_goals?.life_goal_subareas?.name} · {r.life_goals?.life_goal_subareas?.life_goal_areas?.name}
                    </div>
                  </div>
                  <div className="text-gray-500 mr-4 w-24 text-right">{format(new Date(r.date), 'MMM d')}</div>
                  <div className="font-medium w-16 text-right">+{Number(r.points || 0) * 10} XP</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


