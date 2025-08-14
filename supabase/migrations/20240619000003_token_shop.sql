-- Token Shop (v1)

-- Shop catalog
CREATE TABLE IF NOT EXISTS public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price_tokens integer NOT NULL CHECK (price_tokens > 0),
  cadence text NOT NULL DEFAULT 'always', -- daily | weekly | monthly | always
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Redemptions
CREATE TABLE IF NOT EXISTS public.token_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_spent integer NOT NULL CHECK (total_spent > 0),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_redemptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY shop_items_select ON public.shop_items FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY redemptions_select ON public.token_redemptions FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY redemptions_insert ON public.token_redemptions FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Redeem RPC: deducts from wallet and records redemption atomically
CREATE OR REPLACE FUNCTION public.redeem_tokens_v1(p_user_id uuid, p_item_id uuid, p_qty integer)
RETURNS TABLE(new_balance integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_price integer;
  v_needed integer;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    p_qty := 1;
  END IF;

  SELECT price_tokens INTO v_price FROM public.shop_items WHERE id = p_item_id AND is_active = true;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Item not available';
  END IF;
  v_needed := v_price * p_qty;

  -- Ensure wallet row exists
  INSERT INTO public.wallets (user_id, balance) VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Check balance
  PERFORM 1 FROM public.wallets WHERE user_id = p_user_id AND balance >= v_needed;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct and insert redemption
  UPDATE public.wallets SET balance = balance - v_needed, updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id RETURNING balance INTO new_balance;

  INSERT INTO public.token_redemptions(user_id, item_id, quantity, total_spent)
  VALUES (p_user_id, p_item_id, p_qty, v_needed);

  RETURN;
END;
$$;

-- Seed a basic catalog
INSERT INTO public.shop_items (title, description, price_tokens, cadence)
SELECT 'Coffee Treat', 'Small local cafe drink', 3, 'daily'
WHERE NOT EXISTS (SELECT 1 FROM public.shop_items);

INSERT INTO public.shop_items (title, description, price_tokens, cadence)
SELECT 'Movie Night', 'Rent/stream a movie', 12, 'weekly'
WHERE NOT EXISTS (SELECT 1 FROM public.shop_items WHERE title = 'Movie Night');

INSERT INTO public.shop_items (title, description, price_tokens, cadence)
SELECT 'Tool Upgrade', 'Small plugin/app or course credit', 25, 'monthly'
WHERE NOT EXISTS (SELECT 1 FROM public.shop_items WHERE title = 'Tool Upgrade');


