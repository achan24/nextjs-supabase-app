'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';

interface Goal {
  id: string;
  title: string;
  subarea: {
    id: string;
    name: string;
    area: {
      id: string;
      name: string;
    };
  };
}

interface GoalSelectorProps {
  selectedGoalId?: string | null;
  onGoalChange: (goalId: string | null) => void;
  placeholder?: string;
}

export default function GoalSelector({ 
  selectedGoalId, 
  onGoalChange, 
  placeholder = "Select a goal (optional)" 
}: GoalSelectorProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('life_goals')
        .select(`
          id,
          title,
          subarea:life_goal_subareas(
            id,
            name,
            area:life_goal_areas(
              id,
              name
            )
          )
        `)
        .eq('subarea.area.user_id', session.user.id)
        .order('title');

      if (error) {
        console.error('[GoalSelector] Error fetching goals:', error);
        return;
      }

      // Transform the data to match our Goal interface
      const transformedGoals = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        subarea: {
          id: item.subarea.id,
          name: item.subarea.name,
          area: {
            id: item.subarea.area.id,
            name: item.subarea.area.name
          }
        }
      }));
      setGoals(transformedGoals);
    } catch (error) {
      console.error('[GoalSelector] Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalChange = (goalId: string) => {
    onGoalChange(goalId === 'none' ? null : goalId);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="goal-selector">Link to Goal (optional)</Label>
      <Select value={selectedGoalId || 'none'} onValueChange={handleGoalChange}>
        <SelectTrigger id="goal-selector">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No goal</SelectItem>
          {loading ? (
            <SelectItem value="loading" disabled>Loading goals...</SelectItem>
          ) : (
            goals.map((goal) => (
              <SelectItem key={goal.id} value={goal.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{goal.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {goal.subarea.area.name} → {goal.subarea.name}
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
} 