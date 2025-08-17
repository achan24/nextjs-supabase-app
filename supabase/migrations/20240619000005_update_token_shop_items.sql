-- Update Token Shop Items per user requirements
-- 1. Add YouTube option for 15 minutes - 5 tokens
-- 2. Change AI Programming to 10 tokens  
-- 3. Move Me Time to Always section and set to 20 tokens
-- 4. Remove exercise permission, skip one task, and news time items

-- Remove unwanted items
DELETE FROM public.shop_items WHERE item_id IN ('exercise_permission', 'skip_one_task', 'news_time');

-- Add YouTube option for 15 minutes - 5 tokens (in Always section)
INSERT INTO public.shop_items (
    item_id, 
    title, 
    description, 
    price_tokens, 
    category, 
    availability_type, 
    availability_window, 
    cooldown_minutes, 
    effects, 
    budget_check, 
    sort_order
) VALUES (
    'youtube_time', 
    'YouTube Time', 
    '15 minutes of guilt-free YouTube watching', 
    5, 
    'entertainment', 
    'always', 
    'always', 
    180, 
    '[{"type":"permission","value":"youtube_time","duration":15},{"type":"notification","value":"YouTube time unlocked! Enjoy 15 minutes of videos!"}]', 
    false, 
    37
);

-- Update AI Programming to 10 tokens
UPDATE public.shop_items 
SET price_tokens = 10 
WHERE item_id = 'ai_programming';

-- Move Me Time to Always section and set to 20 tokens
UPDATE public.shop_items 
SET 
    price_tokens = 20,
    availability_window = 'always',
    sort_order = 38
WHERE item_id = 'me_time';

