import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PointsHistoryEntry {
  date: string;
  points: number;
  target: number;
}

interface UsePointsHistoryReturn {
  history: PointsHistoryEntry[];
  loading: boolean;
  error: Error | null;
  fetchHistory: (id: string, type: 'area' | 'subarea' | 'goal', days?: number) => Promise<void>;
}

export function usePointsHistory(): UsePointsHistoryReturn {
  const supabase = createClient();
  const [history, setHistory] = useState<PointsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async (id: string, type: 'area' | 'subarea' | 'goal', days: number = 30) => {
    setLoading(true);
    setError(null);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const formattedStartDate = startDate.toISOString().split('T')[0];

      let table: string;
      let idColumn: string;

      switch (type) {
        case 'area':
          table = 'area_points_history';
          idColumn = 'area_id';
          break;
        case 'subarea':
          table = 'subarea_points_history';
          idColumn = 'subarea_id';
          break;
        case 'goal':
          table = 'goal_points_history';
          idColumn = 'goal_id';
          break;
      }

      const { data, error: fetchError } = await supabase
        .from(table)
        .select('date, points, target')
        .eq(idColumn, id)
        .gte('date', formattedStartDate)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      // Fill in missing dates with 0 points
      const filledHistory: PointsHistoryEntry[] = [];
      const currentDate = new Date();
      const existingDates = new Set(data?.map(entry => entry.date) || []);

      for (let i = 0; i < days; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        const formattedDate = date.toISOString().split('T')[0];

        if (existingDates.has(formattedDate)) {
          const entry = data!.find(d => d.date === formattedDate)!;
          filledHistory.push(entry);
        } else {
          filledHistory.push({
            date: formattedDate,
            points: 0,
            target: 0
          });
        }
      }

      setHistory(filledHistory);
    } catch (err) {
      console.error('Error fetching points history:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { history, loading, error, fetchHistory };
} 