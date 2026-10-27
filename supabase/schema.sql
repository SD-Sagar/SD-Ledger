-- ==============================================================================
-- SD-Ledger: Production Database Schema with Row-Level Security (RLS)
-- Copy and run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ACCOUNTS TABLE (Multiple personal bank accounts per user)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    account_index SMALLINT NOT NULL DEFAULT 1,
    bank_color TEXT DEFAULT '#059669',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TRANSACTIONS TABLE (Atomic transfers, expenses, and incomes)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    transaction_time TEXT NOT NULL DEFAULT '00:00',
    from_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    description TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RECONCILIATIONS TABLE (Bank statement reconciliation check-ins)
CREATE TABLE IF NOT EXISTS public.reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    reconciled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    actual_bank_balance NUMERIC(14, 2) NOT NULL,
    calculated_balance NUMERIC(14, 2) NOT NULL,
    difference NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. AUDIT LOGS TABLE (Full transaction audit trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. FINANCIAL NOTES TABLE (Smart sticky notes, friend dues, reminders)
CREATE TABLE IF NOT EXISTS public.financial_notes (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'REMINDER',
    amount NUMERIC(12, 2),
    due_date DATE,
    card_color TEXT NOT NULL DEFAULT 'yellow',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_transaction_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_from_acc ON public.transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_acc ON public.transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_user_acc ON public.reconciliations(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_notes_user ON public.financial_notes(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- Guarantees users can NEVER access another user's records under any circumstance
-- ------------------------------------------------------------------------------
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_notes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS POLICIES FOR ACCOUNTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
CREATE POLICY "Users can view their own accounts"
    ON public.accounts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own accounts" ON public.accounts;
CREATE POLICY "Users can create their own accounts"
    ON public.accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
CREATE POLICY "Users can update their own accounts"
    ON public.accounts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;
CREATE POLICY "Users can delete their own accounts"
    ON public.accounts FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS POLICIES FOR TRANSACTIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
CREATE POLICY "Users can create their own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions"
    ON public.transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
CREATE POLICY "Users can delete their own transactions"
    ON public.transactions FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS POLICIES FOR RECONCILIATIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own reconciliations" ON public.reconciliations;
CREATE POLICY "Users can view their own reconciliations"
    ON public.reconciliations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own reconciliations" ON public.reconciliations;
CREATE POLICY "Users can create their own reconciliations"
    ON public.reconciliations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reconciliations" ON public.reconciliations;
CREATE POLICY "Users can update their own reconciliations"
    ON public.reconciliations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reconciliations" ON public.reconciliations;
CREATE POLICY "Users can delete their own reconciliations"
    ON public.reconciliations FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS POLICIES FOR AUDIT LOGS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view their own audit logs"
    ON public.audit_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS POLICIES FOR FINANCIAL NOTES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own financial notes" ON public.financial_notes;
CREATE POLICY "Users can view their own financial notes"
    ON public.financial_notes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own financial notes" ON public.financial_notes;
CREATE POLICY "Users can create their own financial notes"
    ON public.financial_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own financial notes" ON public.financial_notes;
CREATE POLICY "Users can update their own financial notes"
    ON public.financial_notes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own financial notes" ON public.financial_notes;
CREATE POLICY "Users can delete their own financial notes"
    ON public.financial_notes FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- AUTO-UPDATE UPDATED_AT TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_accounts_updated_at ON public.accounts;
CREATE TRIGGER tr_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_transactions_updated_at ON public.transactions;
CREATE TRIGGER tr_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_financial_notes_updated_at ON public.financial_notes;
CREATE TRIGGER tr_financial_notes_updated_at
    BEFORE UPDATE ON public.financial_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
