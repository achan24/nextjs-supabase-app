-- Add goal-related foreign keys to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES life_goal_areas(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subarea_id UUID REFERENCES life_goal_subareas(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES life_goals(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_area_id ON tasks(area_id);
CREATE INDEX IF NOT EXISTS idx_tasks_subarea_id ON tasks(subarea_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_area ON tasks(user_id, area_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_subarea ON tasks(user_id, subarea_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_goal ON tasks(user_id, goal_id);

-- Add RLS policies for goal-linked tasks
CREATE POLICY "Users can view tasks linked to their goals" ON tasks
  FOR SELECT USING (
    auth.uid() = user_id OR
    (area_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM life_goal_areas 
      WHERE life_goal_areas.id = tasks.area_id 
      AND life_goal_areas.user_id = auth.uid()
    )) OR
    (subarea_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM life_goal_areas 
      JOIN life_goal_subareas ON life_goal_areas.id = life_goal_subareas.area_id
      WHERE life_goal_subareas.id = tasks.subarea_id 
      AND life_goal_areas.user_id = auth.uid()
    )) OR
    (goal_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM life_goal_areas 
      JOIN life_goal_subareas ON life_goal_areas.id = life_goal_subareas.area_id
      JOIN life_goals ON life_goal_subareas.id = life_goals.subarea_id
      WHERE life_goals.id = tasks.goal_id 
      AND life_goal_areas.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert tasks linked to their goals" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      area_id IS NULL OR EXISTS (
        SELECT 1 FROM life_goal_areas 
        WHERE life_goal_areas.id = tasks.area_id 
        AND life_goal_areas.user_id = auth.uid()
      )
    ) AND (
      subarea_id IS NULL OR EXISTS (
        SELECT 1 FROM life_goal_areas 
        JOIN life_goal_subareas ON life_goal_areas.id = life_goal_subareas.area_id
        WHERE life_goal_subareas.id = tasks.subarea_id 
        AND life_goal_areas.user_id = auth.uid()
      )
    ) AND (
      goal_id IS NULL OR EXISTS (
        SELECT 1 FROM life_goal_areas 
        JOIN life_goal_subareas ON life_goal_areas.id = life_goal_subareas.area_id
        JOIN life_goals ON life_goal_subareas.id = life_goals.subarea_id
        WHERE life_goals.id = tasks.goal_id 
        AND life_goal_areas.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update tasks linked to their goals" ON tasks
  FOR UPDATE USING (
    auth.uid() = user_id OR
    (area_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM life_goal_areas 
      WHERE life_goal_areas.id = tasks.area_id 
      AND life_goal_areas.user_id = auth.uid()
    )) OR
    (subarea_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM life_goal_areas 
      JOIN life_goal_subareas ON life_goal_areas.id = life_goal_subareas.area_id
      WHERE life_goal_subareas.id = tasks.subarea_id 
      AND life_goal_areas.user_id = auth.uid()
    )) OR
    (goal_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM life_goal_areas 
      JOIN life_goal_subareas ON life_goal_areas.id = life_goal_subareas.area_id
      JOIN life_goals ON life_goal_subareas.id = life_goals.subarea_id
      WHERE life_goals.id = tasks.goal_id 
      AND life_goal_areas.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete tasks linked to their goals" ON tasks
  FOR DELETE USING (
    auth.uid() = user_id OR
    (area_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM life_goal_areas 
      WHERE life_goal_areas.id = tasks.area_id 
      AND life_goal_areas.user_id = auth.uid()
    )) OR
    (subarea_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM life_goal_areas 
      JOIN life_goal_subareas ON life_goal_areas.id = life_goal_subareas.area_id
      WHERE life_goal_subareas.id = tasks.subarea_id 
      AND life_goal_areas.user_id = auth.uid()
    )) OR
    (goal_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM life_goal_areas 
      JOIN life_goal_subareas ON life_goal_areas.id = life_goal_subareas.area_id
      JOIN life_goals ON life_goal_subareas.id = life_goals.subarea_id
      WHERE life_goals.id = tasks.goal_id 
      AND life_goal_areas.user_id = auth.uid()
    ))
  ); 