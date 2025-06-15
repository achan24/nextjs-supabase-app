import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LifeGoalArea,
  LifeGoalSubarea,
  LifeGoal,
  LifeGoalMilestone,
  LifeGoalMetric,
  LifeGoalMetricThreshold,
  LifeGoalTask,
  Note,
  AreaNoteLink,
  SubareaNoteLink,
  GoalNoteLink,
} from '@/types/goal';

export function useGoalSystem() {
  const [areas, setAreas] = useState<LifeGoalArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchAreas = useCallback(async () => {
    console.log('Fetching areas...');
    setLoading(true);
    setError(null);
    
    try {
      const { data: areasData, error: areasError } = await supabase
        .from('life_goal_areas')
        .select(`
          *,
          area_notes:area_note_links (
            *,
            note:notes (*)
          ),
          subareas:life_goal_subareas (
            *,
            subarea_notes:subarea_note_links (
              *,
              note:notes (*)
            ),
            goals:life_goals (
              *,
              goal_notes:goal_note_links (
                *,
                note:notes (*)
              ),
              milestones:life_goal_milestones (*),
              metrics:life_goal_metrics (
                *,
                thresholds:life_goal_metric_thresholds (*),
                sequence_contributions:life_goal_sequence_contributions (
                  *,
                  sequence:timer_sequences (*)
                )
              ),
              tasks:life_goal_tasks (
                *,
                task:tasks (*)
              )
            )
          )
        `)
        .order('created_at', { ascending: true });

      if (areasError) {
        console.error('Error fetching areas:', areasError);
        throw areasError;
      }

      console.log('Raw areas data:', areasData);
      setAreas(areasData || []);
    } catch (error) {
      console.error('Error in fetchAreas:', error);
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const addArea = useCallback(async (name: string, description?: string) => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session?.user?.id) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('life_goal_areas')
      .insert({ name, description, user_id: sessionData.session.user.id })
      .select()
      .single();

    if (error) throw error;
    await fetchAreas();
    return data;
  }, [fetchAreas]);

  const updateArea = useCallback(async (id: string, updates: Partial<LifeGoalArea>) => {
    const { error } = await supabase
      .from('life_goal_areas')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const deleteArea = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('life_goal_areas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const addSubarea = useCallback(async (areaId: string, name: string, description?: string) => {
    console.log('useGoalSystem.addSubarea called with:', { areaId, name, description });
    const { data, error } = await supabase
      .from('life_goal_subareas')
      .insert({ area_id: areaId, name, description })
      .select()
      .single();

    if (error) {
      console.error('Supabase error adding subarea:', error);
      throw error;
    }
    console.log('Subarea added to database:', data);
    await fetchAreas();
    return data;
  }, [fetchAreas]);

  const updateSubarea = useCallback(async (id: string, updates: Partial<LifeGoalSubarea>) => {
    const { error } = await supabase
      .from('life_goal_subareas')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const deleteSubarea = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('life_goal_subareas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const addGoal = useCallback(async (subareaId: string, title: string, description?: string) => {
    const { data, error } = await supabase
      .from('life_goals')
      .insert({ subarea_id: subareaId, title, description })
      .select()
      .single();

    if (error) throw error;
    await fetchAreas();
    return data;
  }, [fetchAreas]);

  const updateGoal = useCallback(async (id: string, updates: Partial<LifeGoal>) => {
    const { error } = await supabase
      .from('life_goals')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const deleteGoal = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('life_goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const addMilestone = useCallback(async (
    goalId: string,
    title: string,
    description?: string,
    dueDate?: string
  ) => {
    const { data, error } = await supabase
      .from('life_goal_milestones')
      .insert({
        goal_id: goalId,
        title,
        description,
        due_date: dueDate,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchAreas();
    return data;
  }, [fetchAreas]);

  const updateMilestone = useCallback(async (id: string, updates: Partial<LifeGoalMilestone>) => {
    const { error } = await supabase
      .from('life_goal_milestones')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const deleteMilestone = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('life_goal_milestones')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const addMetric = useCallback(async (goalId: string, name: string, type: string, unit?: string) => {
    const { data, error } = await supabase
      .from('life_goal_metrics')
      .insert({ goal_id: goalId, name, type, unit })
      .select()
      .single();

    if (error) throw error;
    await fetchAreas();
    return data;
  }, [fetchAreas]);

  const updateMetric = useCallback(async (id: string, updates: Partial<LifeGoalMetric>) => {
    const { error } = await supabase
      .from('life_goal_metrics')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const deleteMetric = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('life_goal_metrics')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const addMetricThreshold = useCallback(async (metricId: string, milestoneId: string, targetValue: number) => {
    const { data, error } = await supabase
      .from('life_goal_metric_thresholds')
      .insert({ metric_id: metricId, milestone_id: milestoneId, target_value: targetValue })
      .select()
      .single();

    if (error) throw error;
    await fetchAreas();
    return data;
  }, [fetchAreas]);

  const updateMetricThreshold = useCallback(async (id: string, updates: Partial<LifeGoalMetricThreshold>) => {
    const { error } = await supabase
      .from('life_goal_metric_thresholds')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const deleteMetricThreshold = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('life_goal_metric_thresholds')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  // Add note linking functions
  const linkNoteToArea = useCallback(async (areaId: string, noteId: string) => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session?.user?.id) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('area_note_links')
      .insert({
        area_id: areaId,
        note_id: noteId,
        user_id: sessionData.session.user.id,
        display_order: 0 // Will be updated after fetching
      })
      .select(`
        *,
        note:notes (*)
      `)
      .single();

    if (error) throw error;
    await fetchAreas();
    return data;
  }, [fetchAreas]);

  const unlinkNoteFromArea = useCallback(async (linkId: string) => {
    const { error } = await supabase
      .from('area_note_links')
      .delete()
      .eq('id', linkId);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const linkNoteToSubarea = useCallback(async (subareaId: string, noteId: string) => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session?.user?.id) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('subarea_note_links')
      .insert({
        subarea_id: subareaId,
        note_id: noteId,
        user_id: sessionData.session.user.id,
        display_order: 0 // Will be updated after fetching
      })
      .select(`
        *,
        note:notes (*)
      `)
      .single();

    if (error) throw error;
    await fetchAreas();
    return data;
  }, [fetchAreas]);

  const unlinkNoteFromSubarea = useCallback(async (linkId: string) => {
    const { error } = await supabase
      .from('subarea_note_links')
      .delete()
      .eq('id', linkId);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const linkNoteToGoal = useCallback(async (goalId: string, noteId: string) => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session?.user?.id) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('goal_note_links')
      .insert({
        goal_id: goalId,
        note_id: noteId,
        user_id: sessionData.session.user.id,
        display_order: 0 // Will be updated after fetching
      })
      .select(`
        *,
        note:notes (*)
      `)
      .single();

    if (error) throw error;
    await fetchAreas();
    return data;
  }, [fetchAreas]);

  const unlinkNoteFromGoal = useCallback(async (linkId: string) => {
    const { error } = await supabase
      .from('goal_note_links')
      .delete()
      .eq('id', linkId);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const updateNoteLinkOrder = useCallback(async (
    type: 'area' | 'subarea' | 'goal',
    linkId: string,
    newOrder: number
  ) => {
    const table = `${type}_note_links`;
    const { error } = await supabase
      .from(table)
      .update({ display_order: newOrder })
      .eq('id', linkId);

    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const addTaskToGoal = useCallback(async (goalId: string, taskId: string, timeWorth: number = 1) => {
    try {
      const { data, error } = await supabase
        .from('life_goal_tasks')
        .insert({
          goal_id: goalId,
          task_id: taskId,
          time_worth: timeWorth
        })
        .select('*, task:tasks(*)')
        .single();

      if (error) throw error;

      await fetchAreas();
      return data;
    } catch (error) {
      console.error('Error adding task to goal:', error);
      throw error;
    }
  }, [supabase, fetchAreas]);

  const updateTaskInGoal = useCallback(async (taskLinkId: string, updates: Partial<LifeGoalTask>) => {
    try {
      const { error } = await supabase
        .from('life_goal_tasks')
        .update(updates)
        .eq('id', taskLinkId);

      if (error) throw error;

      await fetchAreas();
    } catch (error) {
      console.error('Error updating task in goal:', error);
      throw error;
    }
  }, [supabase, fetchAreas]);

  const removeTaskFromGoal = useCallback(async (taskLinkId: string) => {
    try {
      const { error } = await supabase
        .from('life_goal_tasks')
        .delete()
        .eq('id', taskLinkId);

      if (error) throw error;

      await fetchAreas();
    } catch (error) {
      console.error('Error removing task from goal:', error);
      throw error;
    }
  }, [supabase, fetchAreas]);

  const addSequenceContribution = useCallback(async (
    metricId: string,
    sequenceId: string,
    contributionValue: number
  ) => {
    try {
      const { data, error } = await supabase
        .from('life_goal_sequence_contributions')
        .insert({
          metric_id: metricId,
          sequence_id: sequenceId,
          contribution_value: contributionValue
        })
        .select(`
          *,
          sequence:timer_sequences(*)
        `)
        .single();

      if (error) throw error;

      await fetchAreas();
      return data;
    } catch (error) {
      console.error('Error adding sequence contribution:', error);
      throw error;
    }
  }, [supabase, fetchAreas]);

  const removeSequenceContribution = useCallback(async (contributionId: string) => {
    try {
      const { error } = await supabase
        .from('life_goal_sequence_contributions')
        .delete()
        .eq('id', contributionId);

      if (error) throw error;

      await fetchAreas();
    } catch (error) {
      console.error('Error removing sequence contribution:', error);
      throw error;
    }
  }, [supabase, fetchAreas]);

  return {
    areas,
    loading,
    error,
    fetchAreas,
    addArea,
    updateArea,
    deleteArea,
    addSubarea,
    updateSubarea,
    deleteSubarea,
    addGoal,
    updateGoal,
    deleteGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addMetric,
    updateMetric,
    deleteMetric,
    addMetricThreshold,
    updateMetricThreshold,
    deleteMetricThreshold,
    linkNoteToArea,
    unlinkNoteFromArea,
    linkNoteToSubarea,
    unlinkNoteFromSubarea,
    linkNoteToGoal,
    unlinkNoteFromGoal,
    updateNoteLinkOrder,
    addTaskToGoal,
    updateTaskInGoal,
    removeTaskFromGoal,
    addSequenceContribution,
    removeSequenceContribution
  };
} 