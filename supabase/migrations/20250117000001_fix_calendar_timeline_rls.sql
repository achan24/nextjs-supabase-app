-- Fix RLS policies for calendar_timeline_events to work with hardcoded user ID
-- The hardcoded user ID is: 875d44ba-8794-4d12-ba86-48e5e90dc796

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own calendar timeline events" ON calendar_timeline_events;
DROP POLICY IF EXISTS "Users can insert their own calendar timeline events" ON calendar_timeline_events;
DROP POLICY IF EXISTS "Users can update their own calendar timeline events" ON calendar_timeline_events;
DROP POLICY IF EXISTS "Users can delete their own calendar timeline events" ON calendar_timeline_events;

-- Create new policies that allow the hardcoded user ID
CREATE POLICY "Allow hardcoded user to view calendar timeline events" ON calendar_timeline_events
  FOR SELECT USING (user_id = '875d44ba-8794-4d12-ba86-48e5e90dc796'::uuid);

CREATE POLICY "Allow hardcoded user to insert calendar timeline events" ON calendar_timeline_events
  FOR INSERT WITH CHECK (user_id = '875d44ba-8794-4d12-ba86-48e5e90dc796'::uuid);

CREATE POLICY "Allow hardcoded user to update calendar timeline events" ON calendar_timeline_events
  FOR UPDATE USING (user_id = '875d44ba-8794-4d12-ba86-48e5e90dc796'::uuid);

CREATE POLICY "Allow hardcoded user to delete calendar timeline events" ON calendar_timeline_events
  FOR DELETE USING (user_id = '875d44ba-8794-4d12-ba86-48e5e90dc796'::uuid);
