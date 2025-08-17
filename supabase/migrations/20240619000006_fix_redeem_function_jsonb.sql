-- Fix the redeem_tokens_v2 function to properly handle JSONB types

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
  v_meta_json jsonb;
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
  
  -- Prepare meta JSON properly
  v_meta_json := jsonb_build_object(
    'item_id', p_item_id,
    'effects', v_item.effects::jsonb
  );
  
  -- Deduct tokens and record redemption
  UPDATE public.wallets SET balance = balance - v_needed, updated_at = v_current_time
  WHERE user_id = p_user_id;
  
  INSERT INTO public.token_redemptions(user_id, item_id, quantity, total_spent, meta)
  VALUES (p_user_id, v_item.id, p_qty, v_needed, v_meta_json);
  
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

