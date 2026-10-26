'use client';

import React, { useState } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Rocket,
  Code2,
  Lock,
} from 'lucide-react';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQL_SCHEMA = `-- ==============================================================================
-- SD-Ledger: Production Database Schema with Row-Level Security (RLS)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ACCOUNTS (Multiple personal bank accounts)
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

-- 2. TRANSACTIONS
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

-- 3. RECONCILIATIONS
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

-- 4. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own accounts" ON public.accounts
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own transactions" ON public.transactions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own reconciliations" ON public.reconciliations
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own audit logs" ON public.audit_logs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

export function SupabaseGuideModal({ isOpen, onClose }: SupabaseGuideModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'supabase' | 'vercel'>('supabase');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Supabase & Vercel Deployment Guide
              </h2>
              <p className="text-xs text-zinc-400">
                Step-by-step setup for full cloud sync and production deployment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 my-4 shrink-0">
          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === 'supabase'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>1. Supabase & RLS Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('vercel')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === 'vercel'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Rocket className="h-3.5 w-3.5" />
            <span>2. Vercel Deployment</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-zinc-300">
          {activeTab === 'supabase' ? (
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                    1
                  </span>
                  Create a Free Supabase Project
                </h3>
                <p className="text-zinc-400 mb-2">
                  Visit <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline inline-flex items-center gap-1">supabase.com <ExternalLink className="h-3 w-3" /></a> and create a new project. Choose region (e.g. Mumbai, India <code>ap-south-1</code> for lowest latency).
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                      2
                    </span>
                    Run Database & Row Level Security (RLS) Schema
                  </h3>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-zinc-700 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied SQL' : 'Copy SQL Script'}</span>
                  </button>
                </div>
                <p className="text-zinc-400 mb-3">
                  In your Supabase dashboard, click <strong>SQL Editor</strong> &gt; <strong>New Query</strong>, paste the schema below, and click <strong>Run</strong>.
                </p>

                <pre className="rounded-xl bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-52 border border-zinc-800">
                  {SQL_SCHEMA}
                </pre>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                    3
                  </span>
                  Copy API Credentials
                </h3>
                <p className="text-zinc-400 mb-2">
                  In Supabase, go to <strong>Project Settings</strong> &gt; <strong>API</strong> and copy:
                </p>
                <ul className="list-disc list-inside space-y-1 text-zinc-300 font-mono text-[11px]">
                  <li><strong>Project URL</strong> (e.g. <code>https://xyzcompany.supabase.co</code>)</li>
                  <li><strong>Project API Keys: anon public</strong></li>
                </ul>
                <p className="text-zinc-400 mt-2">
                  You can enter them directly in the <strong>Config</strong> tab in SD-Ledger&apos;s Sign In modal or put them in <code>.env.local</code>:
                </p>
                <div className="mt-2 rounded-lg bg-zinc-950 p-2.5 font-mono text-[11px] text-emerald-400 border border-zinc-800">
                  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co<br />
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Vercel Step 1 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                    1
                  </span>
                  Push Code to GitHub
                </h3>
                <p className="text-zinc-400 mb-2">
                  Initialize git and push your repository to your GitHub account:
                </p>
                <div className="rounded-lg bg-zinc-950 p-2.5 font-mono text-[11px] text-zinc-300 border border-zinc-800 space-y-1">
                  <div>git add .</div>
                  <div>git commit -m &quot;feat: complete SD-Ledger implementation&quot;</div>
                  <div>git branch -M main</div>
                  <div>git remote add origin https://github.com/&lt;your-username&gt;/sd-ledger.git</div>
                  <div>git push -u origin main</div>
                </div>
              </div>

              {/* Vercel Step 2 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                    2
                  </span>
                  Import Project into Vercel
                </h3>
                <p className="text-zinc-400">
                  Visit <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-emerald-400 underline inline-flex items-center gap-1">vercel.com/new <ExternalLink className="h-3 w-3" /></a>, select your GitHub repository <strong>sd-ledger</strong>, and select Next.js framework preset.
                </p>
              </div>

              {/* Vercel Step 3 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                    3
                  </span>
                  Set Environment Variables on Vercel
                </h3>
                <p className="text-zinc-400 mb-2">
                  Under <strong>Environment Variables</strong> in Vercel project setup, add:
                </p>
                <div className="rounded-lg bg-zinc-950 p-2.5 font-mono text-[11px] text-zinc-300 border border-zinc-800 space-y-1">
                  <div><strong className="text-emerald-400">NEXT_PUBLIC_SUPABASE_URL</strong> = https://your-project.supabase.co</div>
                  <div><strong className="text-emerald-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> = your-anon-key</div>
                </div>
                <p className="text-zinc-400 mt-2">
                  Click <strong>Deploy</strong>! Vercel will build and deploy SD-Ledger with full HTTPS and worldwide edge performance.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
