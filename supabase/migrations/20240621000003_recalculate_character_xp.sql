-- Recalculate character XP based on cleaned-up points history
-- This fixes the inflated XP from the duplicate entries we just cleaned up

-- First, let's see what the current total points are
DO $$
DECLARE
  total_points numeric;
  total_xp integer;
  current_level integer;
  remaining_xp integer;
  required_xp integer;
  user_id uuid;
BEGIN
  -- Get the first user (assuming single user for now)
  SELECT id INTO user_id FROM auth.users LIMIT 1;
  
  IF user_id IS NOT NULL THEN
    -- Calculate total points using the fixed function
    SELECT get_user_total_points(user_id) INTO total_points;
    
    -- Calculate XP (10 XP per point)
    total_xp := total_points * 10;
    
    -- Calculate level and remaining XP
    current_level := 1;
    remaining_xp := total_xp;
    
    -- Level up until we can't anymore
    WHILE remaining_xp >= (200 * (1 + (current_level * 0.3) + (POWER(current_level, 1.4) * 0.1))) LOOP
      remaining_xp := remaining_xp - (200 * (1 + (current_level * 0.3) + (POWER(current_level, 1.4) * 0.1)));
      current_level := current_level + 1;
    END LOOP;
    
    -- Calculate required XP for next level
    required_xp := 200 * (1 + (current_level * 0.3) + (POWER(current_level, 1.4) * 0.1));
    
    -- Update character record
    UPDATE characters 
    SET 
      level = current_level,
      xp = remaining_xp
    WHERE user_id = user_id;
    
    -- Log the results
    RAISE NOTICE 'Recalculated character XP: Total points: %, Total XP: %, Level: %, Remaining XP: %, Required XP: %', 
      total_points, total_xp, current_level, remaining_xp, required_xp;
  END IF;
END $$; 