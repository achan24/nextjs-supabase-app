-- Update any existing records that have priority 3 (old default) to 5 (new default)
UPDATE life_goal_subareas 
SET priority = 5 
WHERE priority = 3;

UPDATE life_goals 
SET priority = 5 
WHERE priority = 3;
