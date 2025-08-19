-- Create budget planner tables (separate from existing budget tracking)
-- This allows users to plan their spending before the week starts

-- Create budget_plans table
CREATE TABLE budget_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    total_budget NUMERIC NOT NULL CHECK (total_budget > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure one plan per user per week
    UNIQUE(user_id, week_start)
);

-- Create budget_plan_items table
CREATE TABLE budget_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES budget_plans(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    planned_amount NUMERIC NOT NULL CHECK (planned_amount > 0),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX budget_plans_user_id_idx ON budget_plans(user_id);
CREATE INDEX budget_plans_week_start_idx ON budget_plans(week_start);
CREATE INDEX budget_plan_items_plan_id_idx ON budget_plan_items(plan_id);
CREATE INDEX budget_plan_items_category_idx ON budget_plan_items(category);
CREATE INDEX budget_plan_items_day_of_week_idx ON budget_plan_items(day_of_week);
CREATE INDEX budget_plan_items_plan_day_idx ON budget_plan_items(plan_id, day_of_week);

-- Enable Row Level Security
ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_plan_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budget_plans
CREATE POLICY "Users can view own budget plans" ON budget_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget plans" ON budget_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget plans" ON budget_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget plans" ON budget_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for budget_plan_items
CREATE POLICY "Users can view own budget plan items" ON budget_plan_items
    FOR SELECT USING (
        plan_id IN (
            SELECT id FROM budget_plans WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own budget plan items" ON budget_plan_items
    FOR INSERT WITH CHECK (
        plan_id IN (
            SELECT id FROM budget_plans WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own budget plan items" ON budget_plan_items
    FOR UPDATE USING (
        plan_id IN (
            SELECT id FROM budget_plans WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own budget plan items" ON budget_plan_items
    FOR DELETE USING (
        plan_id IN (
            SELECT id FROM budget_plans WHERE user_id = auth.uid()
        )
    );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_budget_plans_updated_at 
    BEFORE UPDATE ON budget_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_plan_items_updated_at 
    BEFORE UPDATE ON budget_plan_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
