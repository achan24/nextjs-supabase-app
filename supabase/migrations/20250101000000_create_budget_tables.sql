-- Create budget_transactions table
CREATE TABLE budget_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount != 0),
    category TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create budget_targets table
CREATE TABLE budget_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    monthly_limit NUMERIC NOT NULL CHECK (monthly_limit > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, category)
);

-- Create indexes
CREATE INDEX budget_transactions_user_id_idx ON budget_transactions(user_id);
CREATE INDEX budget_transactions_date_idx ON budget_transactions(date);
CREATE INDEX budget_transactions_category_idx ON budget_transactions(category);
CREATE INDEX budget_transactions_user_date_idx ON budget_transactions(user_id, date);

CREATE INDEX budget_targets_user_id_idx ON budget_targets(user_id);
CREATE INDEX budget_targets_category_idx ON budget_targets(category);

-- Create RLS policies for budget_transactions
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget transactions" ON budget_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget transactions" ON budget_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget transactions" ON budget_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget transactions" ON budget_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for budget_targets
ALTER TABLE budget_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget targets" ON budget_targets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget targets" ON budget_targets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget targets" ON budget_targets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget targets" ON budget_targets
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_budget_transactions_updated_at 
    BEFORE UPDATE ON budget_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_targets_updated_at 
    BEFORE UPDATE ON budget_targets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

