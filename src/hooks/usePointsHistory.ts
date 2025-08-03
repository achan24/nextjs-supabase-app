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

  const fetchHistory = useCallback(async (id: string, type: 'area' | 'subarea' | 'goal', days?: number) => {
    setLoading(true);
    setError(null);
    try {
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

      // Fetch ALL history, not just last 30 days
      const { data, error: fetchError } = await supabase
        .from(table)
        .select('date, points, target')
        .eq(idColumn, id)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setHistory([]);
        return;
      }

      // Get the date range from first to last entry
      const firstDate = new Date(data[data.length - 1].date);
      const lastDate = new Date(data[0].date);
      const today = new Date();
      
      // Create a complete history with all days from first entry to today
      const filledHistory: PointsHistoryEntry[] = [];
      const existingDates = new Set(data.map(entry => entry.date));
      const currentDate = new Date(firstDate);
      
      while (currentDate <= today) {
        const formattedDate = currentDate.toISOString().split('T')[0];
        
        if (existingDates.has(formattedDate)) {
          const entry = data.find(d => d.date === formattedDate)!;
          filledHistory.push(entry);
        } else {
          filledHistory.push({
            date: formattedDate,
            points: 0,
            target: 0
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
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