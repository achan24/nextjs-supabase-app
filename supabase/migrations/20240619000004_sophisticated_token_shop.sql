-- Sophisticated Token Shop (v2)
-- Extends the basic shop with time-based availability, effects, cooldowns, and budgets

-- Drop existing shop_items to recreate with new schema
DROP TABLE IF EXISTS public.shop_items CASCADE;

-- Enhanced shop catalog with sophisticated features
CREATE TABLE IF NOT EXISTS public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  price_tokens integer NOT NULL CHECK (price_tokens > 0),
  category text NOT NULL DEFAULT 'misc',
  
  -- Availability system
  availability_type text NOT NULL DEFAULT 'always',
  availability_window text DEFAULT 'always',
  
  -- Cooldown system (minutes)
  cooldown_minutes integer NOT NULL DEFAULT 0,
  
  -- Effects system (TEXT for flexibility - NO JSONB!)
  effects text NOT NULL DEFAULT '[]',
  
  -- Budget checking
  budget_check boolean NOT NULL DEFAULT false,
  
  -- Metadata
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- User budgets table
CREATE TABLE IF NOT EXISTS public.user_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_type text NOT NULL,
  limit_value integer NOT NULL,
  current_used integer NOT NULL DEFAULT 0,
  reset_period text NOT NULL DEFAULT 'daily',
  last_reset timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  
  UNIQUE(user_id, budget_type)
);

-- Item redemption cooldowns
CREATE TABLE IF NOT EXISTS public.item_cooldowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  last_redeemed_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamptz NOT NULL,
  
  UNIQUE(user_id, item_id)
);

-- RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_cooldowns ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  CREATE POLICY shop_items_select ON public.shop_items FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY user_budgets_select ON public.user_budgets FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY user_budgets_insert ON public.user_budgets FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY user_budgets_update ON public.user_budgets FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY item_cooldowns_select ON public.item_cooldowns FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY item_cooldowns_insert ON public.item_cooldowns FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY item_cooldowns_update ON public.item_cooldowns FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enhanced redeem function with cooldowns and budget checking
CREATE OR REPLACE FUNCTION public.redeem_tokens_v2(p_user_id uuid, p_item_id text, p_qty integer DEFAULT 1)
RETURNS TABLE(new_balance integer, success boolean, error_message text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_item RECORD;
  v_needed integer;
  v_cooldown_expires timestamptz;
  v_budget_ok boolean := true;
  v_current_time timestamptz := timezone('utc'::text, now());
BEGIN
  -- Get item details
  SELECT * INTO v_item FROM public.shop_items WHERE item_id = p_item_id AND is_active = true;
  IF v_item IS NULL THEN
    RETURN QUERY SELECT 0, false, 'Item not available';
    RETURN;
  END IF;
  
  v_needed := v_item.price_tokens * p_qty;
  
  -- Check cooldown
  SELECT expires_at INTO v_cooldown_expires 
  FROM public.item_cooldowns 
  WHERE user_id = p_user_id AND item_id = p_item_id AND expires_at > v_current_time;
  
  IF v_cooldown_expires IS NOT NULL THEN
    RETURN QUERY SELECT 0, false, 'Item is on cooldown until ' || v_cooldown_expires::text;
    RETURN;
  END IF;
  
  -- Check budget if required
  IF v_item.budget_check THEN
    -- For now, implement a simple daily treats budget (max 2 per day)
    SELECT COUNT(*) < 2 INTO v_budget_ok
    FROM public.token_redemptions tr
    JOIN public.shop_items si ON tr.item_id::text = si.id::text
    WHERE tr.user_id = p_user_id 
      AND si.budget_check = true
      AND tr.created_at > v_current_time - interval '1 day';
      
    IF NOT v_budget_ok THEN
      RETURN QUERY SELECT 0, false, 'Daily treat budget exceeded (max 2/day)';
      RETURN;
    END IF;
  END IF;
  
  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id, balance) VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Check token balance
  PERFORM 1 FROM public.wallets WHERE user_id = p_user_id AND balance >= v_needed;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, false, 'Insufficient balance';
    RETURN;
  END IF;
  
  -- Deduct tokens and record redemption
  UPDATE public.wallets SET balance = balance - v_needed, updated_at = v_current_time
  WHERE user_id = p_user_id;
  
  INSERT INTO public.token_redemptions(user_id, item_id, quantity, total_spent, meta)
  VALUES (p_user_id, v_item.id, p_qty, v_needed, '{"item_id": "' || p_item_id || '", "effects": ' || v_item.effects || '}');
  
  -- Set cooldown if item has one
  IF v_item.cooldown_minutes > 0 THEN
    INSERT INTO public.item_cooldowns(user_id, item_id, expires_at)
    VALUES (p_user_id, p_item_id, v_current_time + (v_item.cooldown_minutes || ' minutes')::interval)
    ON CONFLICT (user_id, item_id) 
    DO UPDATE SET 
      last_redeemed_at = v_current_time,
      expires_at = v_current_time + (v_item.cooldown_minutes || ' minutes')::interval;
  END IF;
  
  -- Return success
  SELECT balance INTO new_balance FROM public.wallets WHERE user_id = p_user_id;
  RETURN QUERY SELECT new_balance, true, 'Success'::text;
END;
$$;

-- Seed sophisticated shop items

-- Morning (05:00-12:00) - things you actually want
INSERT INTO public.shop_items (item_id, title, description, price_tokens, category, availability_type, availability_window, cooldown_minutes, effects, budget_check, sort_order) VALUES
('music_time', 'Music Time', 'Unlock 30 minutes of guilt-free 80s music listening', 5, 'entertainment', 'daily', 'morning', 180, '[{"type":"permission","value":"music_time","duration":30},{"type":"notification","value":"Music time unlocked! Enjoy your 80s tunes!"}]', false, 1),
('learning_session', 'Learning Session', 'Unlock time to learn something new (only after chores done)', 8, 'permission', 'daily', 'morning', 240, '[{"type":"permission","value":"learning_time","duration":60},{"type":"notification","value":"Learning time unlocked! Dive into something new!"}]', false, 2),
('coffee_treat', 'Coffee Treat', 'Get a nice coffee from your favorite cafe', 6, 'treat', 'daily', 'morning', 180, '[{"type":"treat","value":"coffee"},{"type":"notification","value":"Coffee treat unlocked! Go get that nice coffee!"}]', true, 3),
('sunrise_walk', 'Sunrise Walk', 'Permission for morning walk/exercise', 4, 'permission', 'daily', 'morning', 120, '[{"type":"permission","value":"sunrise_walk","duration":30},{"type":"notification","value":"Sunrise walk unlocked! Get some fresh air!"}]', false, 4),
('news_time', 'News Time', '15 minutes of guilt-free news reading', 3, 'entertainment', 'daily', 'morning', 90, '[{"type":"permission","value":"news_time","duration":15},{"type":"notification","value":"News time unlocked! Catch up on the world!"}]', false, 5),
('creative_time', 'Creative Time', '45 minutes for creative projects', 7, 'permission', 'daily', 'morning', 300, '[{"type":"permission","value":"creative_time","duration":45},{"type":"notification","value":"Creative time unlocked! Express yourself!"}]', false, 6);

-- Afternoon (12:00-18:00) - things you actually want
INSERT INTO public.shop_items (item_id, title, description, price_tokens, category, availability_type, availability_window, cooldown_minutes, effects, budget_check, sort_order) VALUES
('me_time', 'Me Time', 'Guilt-free "me time" (only after productive work)', 10, 'permission', 'daily', 'afternoon', 240, '[{"type":"permission","value":"me_time","duration":45},{"type":"notification","value":"Me time unlocked! Enjoy guilt-free relaxation!"}]', false, 7),
('lunch_upgrade', 'Lunch Upgrade', 'Upgrade your lunch to something nicer than planned', 8, 'treat', 'daily', 'afternoon', 240, '[{"type":"treat","value":"lunch_upgrade"},{"type":"notification","value":"Lunch upgrade unlocked! Eat something you''ll actually enjoy!"}]', true, 8),
('skip_one_task', 'Skip One Task', 'Skip one task you don''t want to do today', 15, 'permission', 'daily', 'afternoon', 1440, '[{"type":"permission","value":"skip_task"},{"type":"notification","value":"Task skip unlocked! You can skip one thing today!"}]', false, 9),
('gaming_break', 'Gaming Break', '1 hour of guilt-free gaming', 12, 'entertainment', 'daily', 'afternoon', 360, '[{"type":"permission","value":"gaming_break","duration":60},{"type":"notification","value":"Gaming break unlocked! Have some fun!"}]', false, 10),
('social_media_time', 'Social Media Time', '30 minutes of social media browsing', 6, 'entertainment', 'daily', 'afternoon', 180, '[{"type":"permission","value":"social_media","duration":30},{"type":"notification","value":"Social media time unlocked! Catch up with friends!"}]', false, 11),
('exercise_permission', 'Exercise Permission', 'Permission to skip workout today', 9, 'permission', 'daily', 'afternoon', 1440, '[{"type":"permission","value":"skip_exercise"},{"type":"notification","value":"Exercise skip unlocked! Rest day approved!"}]', false, 12);

-- Evening (18:00-24:00) - things you actually want
INSERT INTO public.shop_items (item_id, title, description, price_tokens, category, availability_type, availability_window, cooldown_minutes, effects, budget_check, sort_order) VALUES
('evening_entertainment', 'Evening Entertainment', 'Unlock evening entertainment time', 12, 'permission', 'daily', 'evening', 1440, '[{"type":"permission","value":"evening_entertainment","duration":120},{"type":"notification","value":"Evening entertainment unlocked! Enjoy your night!"}]', false, 13),
('dinner_out', 'Dinner Out', 'Go out for dinner instead of cooking', 18, 'treat', 'daily', 'evening', 1440, '[{"type":"treat","value":"dinner_out"},{"type":"notification","value":"Dinner out unlocked! No cooking tonight!"}]', true, 14),
('evening_break', 'Evening Break', 'Take the evening off from work - no guilt', 20, 'permission', 'daily', 'evening', 1440, '[{"type":"permission","value":"evening_off"},{"type":"notification","value":"Evening off unlocked! Relax guilt-free!"}]', false, 15),
('tv_movie_time', 'TV/Movie Time', '2 hours of TV/movies', 10, 'entertainment', 'daily', 'evening', 1440, '[{"type":"permission","value":"tv_movie_time","duration":120},{"type":"notification","value":"TV/Movie time unlocked! Enjoy some entertainment!"}]', false, 16),
('social_drink', 'Social Drink', 'Permission for social drinking', 14, 'permission', 'daily', 'evening', 1440, '[{"type":"permission","value":"social_drink"},{"type":"notification","value":"Social drink unlocked! Enjoy responsibly!"}]', false, 17),
('late_night_permission', 'Late Night Permission', 'Stay up late guilt-free', 16, 'permission', 'daily', 'evening', 1440, '[{"type":"permission","value":"late_night"},{"type":"notification","value":"Late night permission unlocked! No early bedtime!"}]', false, 18);

-- Weekly Rotations (reset Mondays 00:00)
INSERT INTO public.shop_items (item_id, title, description, price_tokens, category, availability_type, availability_window, cooldown_minutes, effects, budget_check, sort_order) VALUES
('dating_app_time', 'Dating App Time', 'Unlock 1 hour of dating app browsing/swiping', 25, 'permission', 'weekly', 'always', 10080, '[{"type":"permission","value":"dating_app","duration":60},{"type":"notification","value":"Dating app time unlocked! Go find that girlfriend!"}]', false, 19),
('friend_outreach', 'Friend Outreach', 'Permission to reach out to potential friends', 20, 'permission', 'weekly', 'always', 10080, '[{"type":"permission","value":"friend_outreach"},{"type":"notification","value":"Friend outreach unlocked! Time to build connections!"}]', false, 20),
('money_making_time', 'Money-Making Time', 'Dedicated time to work on money-making projects', 30, 'permission', 'weekly', 'always', 10080, '[{"type":"permission","value":"money_making","duration":120},{"type":"notification","value":"Money-making time unlocked! Focus on building wealth!"}]', false, 21),
('hobby_time', 'Hobby Time', '2 hours for your hobbies', 18, 'permission', 'weekly', 'always', 10080, '[{"type":"permission","value":"hobby_time","duration":120},{"type":"notification","value":"Hobby time unlocked! Pursue your passions!"}]', false, 22),
('home_project', 'Home Project', 'Permission for home improvement', 22, 'permission', 'weekly', 'always', 10080, '[{"type":"permission","value":"home_project"},{"type":"notification","value":"Home project unlocked! Make your space better!"}]', false, 23),
('weekend_activity', 'Weekend Activity', 'Plan weekend outing', 28, 'permission', 'weekly', 'always', 10080, '[{"type":"permission","value":"weekend_activity"},{"type":"notification","value":"Weekend activity unlocked! Plan something fun!"}]', false, 24);

-- Always-On Core
INSERT INTO public.shop_items (item_id, title, description, price_tokens, category, availability_type, availability_window, cooldown_minutes, effects, budget_check, sort_order) VALUES
('ai_programming', 'AI Programming', '1 hour of guilt-free AI programming (controlled reward)', 5, 'permission', 'always', 'always', 240, '[{"type":"permission","value":"ai_programming","duration":60},{"type":"notification","value":"AI programming unlocked! Code with AI guilt-free!"}]', false, 25),
('takeout_dinner', 'Takeout Dinner', 'Order takeout instead of cooking', 15, 'treat', 'always', 'always', 1440, '[{"type":"treat","value":"takeout"},{"type":"notification","value":"Takeout unlocked! No cooking tonight!"}]', true, 26),
('extended_music', 'Extended Music Time', 'Unlock 2 hours of guilt-free music listening', 20, 'permission', 'always', 'always', 1440, '[{"type":"permission","value":"extended_music","duration":120},{"type":"notification","value":"Extended music time unlocked! Enjoy your tunes!"}]', false, 27),
('guilt_free_break', 'Guilt-Free Break', 'Take a guilt-free break from work', 12, 'permission', 'always', 'always', 240, '[{"type":"permission","value":"guilt_free_break"},{"type":"notification","value":"Guilt-free break unlocked! Relax without feeling bad!"}]', false, 28),
('reading_time', 'Reading Time', '1 hour guilt-free reading', 8, 'permission', 'always', 'always', 360, '[{"type":"permission","value":"reading_time","duration":60},{"type":"notification","value":"Reading time unlocked! Dive into a good book!"}]', false, 29),
('podcast_time', 'Podcast Time', '45 minutes podcast listening', 6, 'entertainment', 'always', 'always', 180, '[{"type":"permission","value":"podcast_time","duration":45},{"type":"notification","value":"Podcast time unlocked! Learn something new!"}]', false, 30),
('self_care_time', 'Self-Care Time', 'Permission for self-care activities', 10, 'permission', 'always', 'always', 480, '[{"type":"permission","value":"self_care","duration":60},{"type":"notification","value":"Self-care time unlocked! Take care of yourself!"}]', false, 31);

-- Monthly Events (first week of month)
INSERT INTO public.shop_items (item_id, title, description, price_tokens, category, availability_type, availability_window, cooldown_minutes, effects, budget_check, sort_order) VALUES
('dating_budget', 'Dating Budget', '€50 to spend on dating (coffee, dinner, etc.)', 50, 'treat', 'monthly', 'always', 43200, '[{"type":"treat","value":"dating_budget","amount":50},{"type":"notification","value":"Dating budget unlocked! Go find that girlfriend!"}]', true, 32),
('friend_meetup', 'Friend Meetup', 'Budget for meeting up with potential friends', 40, 'treat', 'monthly', 'always', 43200, '[{"type":"treat","value":"friend_meetup","amount":40},{"type":"notification","value":"Friend meetup unlocked! Build those connections!"}]', true, 33),
('treat_yourself', 'Treat Yourself', '€35 for personal treat', 35, 'treat', 'monthly', 'always', 43200, '[{"type":"treat","value":"treat_yourself","amount":35},{"type":"notification","value":"Treat yourself unlocked! Buy something nice!"}]', true, 34),
('mini_vacation', 'Mini Vacation', 'Budget for small trip', 60, 'treat', 'monthly', 'always', 43200, '[{"type":"treat","value":"mini_vacation","amount":100},{"type":"notification","value":"Mini vacation unlocked! Plan a getaway!"}]', true, 35),
('skill_investment', 'Skill Investment', 'Budget for learning new skill', 45, 'treat', 'monthly', 'always', 43200, '[{"type":"treat","value":"skill_investment","amount":45},{"type":"notification","value":"Skill investment unlocked! Invest in yourself!"}]', true, 36);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS shop_items_availability_idx ON public.shop_items (availability_type, availability_window, is_active);
CREATE INDEX IF NOT EXISTS shop_items_category_idx ON public.shop_items (category, is_active);
CREATE INDEX IF NOT EXISTS item_cooldowns_user_expires_idx ON public.item_cooldowns (user_id, expires_at);
CREATE INDEX IF NOT EXISTS user_budgets_user_type_idx ON public.user_budgets (user_id, budget_type);
