-- Minimal token system primitives (v1)

-- Wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Mint events for auditability
CREATE TABLE IF NOT EXISTS public.token_mints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Basic RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_mints ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY wallets_select ON public.wallets FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY wallets_upsert ON public.wallets FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY wallets_update ON public.wallets FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY token_mints_select ON public.token_mints FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY token_mints_insert ON public.token_mints FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Mint tokens RPC to keep logic server-side
CREATE OR REPLACE FUNCTION public.mint_tokens_v1(p_user_id uuid, p_amount integer, p_meta jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.token_mints (user_id, amount, meta)
  VALUES (p_user_id, p_amount, COALESCE(p_meta, '{}'::jsonb));

  INSERT INTO public.wallets (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.wallets.balance + EXCLUDED.balance,
    updated_at = timezone('utc'::text, now());
END;
$$;


