-- Create trait_sessions table
CREATE TABLE IF NOT EXISTS public.trait_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id uuid,
    t_start timestamptz NOT NULL,
    t_end timestamptz,
    duration_min integer CHECK (duration_min >= 0),
    events jsonb DEFAULT '[]'::jsonb NOT NULL,
    self_report jsonb DEFAULT '{}'::jsonb NOT NULL,
    task_classification jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create trait_xp_records table
CREATE TABLE IF NOT EXISTS public.trait_xp_records (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES trait_sessions(id) ON DELETE CASCADE NOT NULL,
    trait_name text NOT NULL,
    base_xp integer NOT NULL CHECK (base_xp >= 0),
    multipliers jsonb DEFAULT '{}'::jsonb NOT NULL,
    final_xp integer NOT NULL CHECK (final_xp >= 0),
    quest_text text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create task_trait_tags table
CREATE TABLE IF NOT EXISTS public.task_trait_tags (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    trait_tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    task_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    auto_classified boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.trait_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trait_xp_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_trait_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for trait_sessions
CREATE POLICY "Users can view own trait sessions"
    ON public.trait_sessions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own trait sessions"
    ON public.trait_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own trait sessions"
    ON public.trait_sessions FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own trait sessions"
    ON public.trait_sessions FOR DELETE
    USING (user_id = auth.uid());

-- Create policies for trait_xp_records
CREATE POLICY "Users can view own trait XP records"
    ON public.trait_xp_records FOR SELECT
    USING (exists (
        select 1 from trait_sessions
        where trait_sessions.id = trait_xp_records.session_id
        and trait_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own trait XP records"
    ON public.trait_xp_records FOR INSERT
    WITH CHECK (exists (
        select 1 from trait_sessions
        where trait_sessions.id = session_id
        and trait_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own trait XP records"
    ON public.trait_xp_records FOR UPDATE
    USING (exists (
        select 1 from trait_sessions
        where trait_sessions.id = trait_xp_records.session_id
        and trait_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own trait XP records"
    ON public.trait_xp_records FOR DELETE
    USING (exists (
        select 1 from trait_sessions
        where trait_sessions.id = trait_xp_records.session_id
        and trait_sessions.user_id = auth.uid()
    ));

-- Create policies for task_trait_tags
CREATE POLICY "Users can view own task trait tags"
    ON public.task_trait_tags FOR SELECT
    USING (exists (
        select 1 from tasks
        where tasks.id = task_trait_tags.task_id
        and tasks.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own task trait tags"
    ON public.task_trait_tags FOR INSERT
    WITH CHECK (exists (
        select 1 from tasks
        where tasks.id = task_id
        and tasks.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own task trait tags"
    ON public.task_trait_tags FOR UPDATE
    USING (exists (
        select 1 from tasks
        where tasks.id = task_trait_tags.task_id
        and tasks.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own task trait tags"
    ON public.task_trait_tags FOR DELETE
    USING (exists (
        select 1 from tasks
        where tasks.id = task_trait_tags.task_id
        and tasks.user_id = auth.uid()
    ));

-- Create indexes
CREATE INDEX trait_sessions_user_id_idx ON trait_sessions(user_id);
CREATE INDEX trait_sessions_task_id_idx ON trait_sessions(task_id);
CREATE INDEX trait_sessions_t_start_idx ON trait_sessions(t_start);

CREATE INDEX trait_xp_records_session_id_idx ON trait_xp_records(session_id);
CREATE INDEX trait_xp_records_trait_name_idx ON trait_xp_records(trait_name);
CREATE INDEX trait_xp_records_created_at_idx ON trait_xp_records(created_at);

CREATE INDEX task_trait_tags_task_id_idx ON task_trait_tags(task_id);
CREATE INDEX task_trait_tags_auto_classified_idx ON task_trait_tags(auto_classified);