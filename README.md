# SD-Ledger — Personal Bank Ledger & Finance Tracker

**SD-Ledger** is a modern, responsive, offline-first personal finance application built with **Next.js**, **IndexedDB**, and **Supabase**. It is designed around tracking personal bank accounts (starts with two, allows unlimited additions), atomic two-way transfers, bank statement reconciliation, financial sticky notes & dues, Groww-style interactive growth charts, and Row-Level Security (RLS).

---

## Table of Contents
1. [Key Features](#key-features)
2. [Prerequisites & Installation](#prerequisites--installation)
3. [Environment Configuration](#environment-configuration)
4. [Supabase Setup & RLS Database Schema](#supabase-setup--rls-database-schema)
5. [How Offline Mode & Cloud Sync Works](#how-offline-mode--cloud-sync-works)
6. [Financial Sticky Notes & Smart Dues](#financial-sticky-notes--smart-dues)
7. [How to Use the Backup CSV](#how-to-use-the-backup-csv)
8. [Deploying to Vercel](#deploying-to-vercel)
9. [Deploying to Render](#deploying-to-render)
10. [Project Structure](#project-structure)

---

## Key Features

- **Personal Account Management**: Starts with a friendly setup wizard for your first two personal bank accounts, and allows adding unlimited accounts anytime (*ICICI Bank, Cash Wallet, Kotak 811, Business Accounts*, etc.).
- **Zero Banking Credentials Required**: No real account numbers or net-banking passwords are ever asked or stored.
- **Bespoke Theme-Reactive Brand Identity**: Custom-crafted vector Wallet & Ledger icon carrying an embossed **SD** monogram, peeking statement tab, golden security clasp, and dual credit/debit indicators. Automatically shifts colors between Light and Dark mode.
- **Dynamic App & Favicon Generator**: Programmatically generates high-res favicons and mobile touch icons (`app/icon.tsx`) matching the bespoke SD wallet brand mark.
- **Smart Sticky Notes & Dues Tracker**: Digital sticky notes pinboard for tracking money you owe (*Owed By Me*), money owed to you (*Owed To Me*), and general payment reminders. Features color tags, due dates, and instant search.
- **1-Click Auto-Settle to Ledger**: Resolving a note can automatically post an atomic **Expense** or **Income** directly into your chosen bank account with instant balance updates.
- **Groww-Style Financial Trend Chart**: Interactive SVG area chart tracking your financial trajectory across 1W, 1M, 3M, 6M, 1Y, and ALL timeframes. Dynamically toggles between Total Net Liquidity, specific bank accounts, expenses-only, or incomes-only.
- **Segmented Clean Navigation**: Clean tabbed dashboard (*Overview, Accounts, Ledger, Notes & Dues, Statement Reconciliation*) that keeps mobile and desktop layouts clutter-free.
- **Daily Recordkeeping**: Prominent dashboard buttons for **Add Expense**, **Add Income**, and **Transfer Money**.
- **Atomic Two-Way Transfers**: Moving money between accounts updates both balances in a single atomic transaction.
- **Bank Statement Reconciliation**: Distinguishes calculated ledger balances from actual bank balances entered during statement check-ins, highlighting exact discrepancies (`₹0 difference` for balanced accounts).
- **Searchable, Date-Filterable Ledger**: Search by description, category, amount, or account. Filter by presets (*Today, Yesterday, This Week, This Month, Last Month, Custom Date Range*).
- **Offline-First with IndexedDB**: Full functionality when disconnected from the internet. All entries save instantly to your browser's IndexedDB.
- **Bidirectional Cloud Sync**: Flushes offline changes to Supabase and pulls remote updates when online.
- **Cloud-Linked Offline Mode**: In offline mode, link to your online Supabase account to import accounts and sync mutations bidirectionally.
- **Data Portability**: Instant CSV export, complete JSON database backup, and schema-validated JSON restore.
- **Transaction Audit Trail**: Immutable chronological log of all creations, edits, deletions, and reconciliations, synced across cloud devices.
- **UPI & Bank Auto-Sync Teaser**: Modern preview card for planned on-device SMS and PDF statement parsing.

---

## Prerequisites & Installation

### Requirements
- **Node.js**: v18.18 or higher (Node 20+ recommended)
- **npm** or **pnpm** or **yarn**

### Local Installation
```bash
# 1. Clone repository
git clone https://github.com/<your-username>/sd-ledger.git
cd sd-ledger

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Environment Configuration

Create a `.env.local` or `.env` file in the root directory:

```env
# Supabase Project URL (from Supabase Dashboard -> Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anon Public Key (from Supabase Dashboard -> Project Settings -> API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Note**: Even if you haven't created a Supabase project yet, SD-Ledger runs in **Local Offline Mode** with full IndexedDB storage. You can also enter your Supabase keys directly inside the application under **Supabase Configuration** in the sign-in modal.

---

## Supabase Setup & RLS Database Schema

### Step 1: Create a Project
1. Log in to [supabase.com](https://supabase.com).
2. Click **New Project** and name it `sd-ledger`.
3. Choose your database password and select a region (e.g. `ap-south-1` Mumbai, India).

### Step 2: Run Database Schema Script
1. In your Supabase dashboard, click **SQL Editor** on the left menu.
2. Click **+ New Query**.
3. Copy the script below (also found in `supabase/schema.sql`) and click **Run**:

```sql
-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ACCOUNTS TABLE
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

-- 3. TRANSACTIONS TABLE
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

-- 4. RECONCILIATIONS TABLE
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

-- 5. FINANCIAL NOTES & DUES TABLE
CREATE TABLE IF NOT EXISTS public.financial_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT NOT NULL DEFAULT 'REMINDER' CHECK (type IN ('OWED_BY_ME', 'OWED_TO_ME', 'REMINDER')),
    amount NUMERIC(14, 2),
    person_name TEXT,
    color TEXT NOT NULL DEFAULT 'AMBER' CHECK (color IN ('AMBER', 'EMERALD', 'ROSE', 'CYAN', 'VIOLET')),
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'SETTLED', 'CANCELLED')),
    settled_at TIMESTAMPTZ,
    settled_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. AUDIT LOGS TABLE
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

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own reconciliations" ON public.reconciliations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own financial notes" ON public.financial_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own audit logs" ON public.audit_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Step 3: Copy Your Keys
Go to **Project Settings** &rarr; **API** and copy:
1. **Project URL**
2. **Project API Keys &rarr; anon (public)**

Paste them into your `.env.local` or directly into the in-app Supabase Configuration modal.

---

## How Offline Mode & Cloud Sync Works

### 1. What Happens When You Tap "Sync Cloud Now"?
When you tap the **Sync Cloud Now** or **Live Sync** button:
1. **Flushes Local Queue**: The sync engine reads any pending actions (`create`, `update`, `delete`) queued in IndexedDB while offline and uploads them to Supabase using idempotent upserts (`onConflict: 'id'`).
2. **Pulls Remote Updates**: Downloads the latest accounts, transactions, reconciliations, notes, and audit logs for your authenticated user.
3. **Merges into IndexedDB**: Updates your local browser cache so all views, charts, and balances reflect the latest state.
4. **Visual Toast Feedback**: Displays a green notification confirming: *"Cloud Sync Complete: Local and cloud records are fully up to date."*

### 2. Automatic Online/Offline Detection
- If you lose internet connectivity, an amber **Offline** badge appears. You can continue recording expenses, incomes, transfers, and notes; they are safely stored in IndexedDB.
- When internet connection returns, SD-Ledger detects the `online` event and automatically pushes all pending mutations to Supabase in the background.

---

## Financial Sticky Notes & Smart Dues

SD-Ledger includes a smart sticky notes pinboard specifically built for personal finance:

1. **Note Categories**:
   - **Owed By Me** (*Money you need to pay back*): Displays in warm Amber/Rose tags with quick-settle action.
   - **Owed To Me** (*Money someone owes you*): Displays in vibrant Emerald tags with quick-collect action.
   - **Financial Reminder**: General reminders for bills, loan EMIs, rent, or subscriptions.
2. **1-Click Auto-Settle to Ledger**:
   - When you tap **Settle / Resolve** on a note, a modal opens letting you pick which Bank Account was used.
   - For *Owed By Me*, it automatically creates an **Expense** from that account.
   - For *Owed To Me*, it automatically logs an **Income** into that account.
   - The note is marked as `SETTLED`, keeping your dues checklist and ledger in lockstep.
3. **Offline & Cloud Sync**:
   - Notes are stored locally in IndexedDB and synchronized with the `financial_notes` table in Supabase.

---

## How to Use the Backup CSV

SD-Ledger provides CSV export for spreadsheets, tax filing, and data backups.

### How to Export:
1. **From the Dashboard**: In the Transaction History section, click **Export Filtered to CSV** to download transactions matching your active filters.
2. **From the Navigation Bar**: Click **Backup** &rarr; **Export to CSV** to export your entire history.

### What is in the CSV File?
The CSV file includes 10 standardized columns:
- **Transaction ID**: Unique UUID of the record.
- **Date**: Transaction date (`YYYY-MM-DD`).
- **Time (IST)**: Time of transaction in India Standard Time (`HH:mm`).
- **Type**: `EXPENSE`, `INCOME`, or `TRANSFER`.
- **Amount (INR)**: Numerical value with 2 decimal places.
- **Account / From Account**: Display name of the deducting or source account.
- **To Account**: Display name of receiving account (for Incomes and Transfers).
- **Category / Source**: Category (e.g. *Groceries, Utilities, Rent*) or Income Source (e.g. *Salary, Freelance*).
- **Description**: User notes or memo.
- **Created At**: Timestamp when entry was logged.

---

## Deploying to Vercel

Vercel is the premier hosting platform for Next.js applications with native edge rendering and zero-configuration builds.

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "feat: complete SD-Ledger"
git branch -M main
git remote add origin https://github.com/<your-username>/sd-ledger.git
git push -u origin main
```

### Step 2: Import into Vercel
1. Visit [vercel.com/new](https://vercel.com/new).
2. Connect your GitHub account and click **Import** next to your `sd-ledger` repository.

### Step 3: Configure Project Settings

| Field Name | What to Select / Enter | Notes & Guidance |
| :--- | :--- | :--- |
| **Project Name** | `sd-ledger` | Defaults to repo name. Domain will be `https://sd-ledger.vercel.app`. |
| **Framework Preset** | `Next.js` | Vercel automatically detects Next.js 16 with Turbopack. |
| **Root Directory** | `./` | Leave as root `./`. |
| **Environment Variables** | `NEXT_PUBLIC_SUPABASE_URL`<br>`NEXT_PUBLIC_SUPABASE_ANON_KEY` | Add your Supabase URL and anon public key. |

Click **Deploy**. Vercel will build and deploy SD-Ledger with worldwide CDN edge performance and automated HTTPS certificates.

---

## Deploying to Render

You can also host SD-Ledger on [render.com](https://render.com) using their **Web Service** tier:
1. Connect your repository on [dashboard.render.com](https://dashboard.render.com).
2. Set Build Command: `npm install && npm run build`
3. Set Start Command: `npm start`
4. Add environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Project Structure

```
SD-Ledger/
├── app/
│   ├── globals.css                # Dark & light fintech CSS theme & tokens
│   ├── icon.tsx                   # Dynamic Next.js app & favicon generator
│   ├── layout.tsx                 # Root layout with fonts & metadata
│   └── page.tsx                   # Main app container & welcome screen
├── components/
│   ├── AddAccountModal.tsx        # Modal to add additional bank accounts
│   ├── AddEditNoteModal.tsx       # Create/edit sticky notes & dues
│   ├── AddTransactionModal.tsx    # Modal for Expense and Income entry
│   ├── AuditTrailModal.tsx        # Cloud-synced audit trail history viewer
│   ├── AuthModal.tsx              # Supabase Auth & Config modal
│   ├── BackupRestoreModal.tsx     # CSV export, JSON backup & restore
│   ├── BrandLogo.tsx              # Dynamic theme-reactive SD wallet logo
│   ├── Dashboard.tsx              # Segmented dashboard & Groww growth charts
│   ├── EditTransactionModal.tsx   # Edit existing transaction entries
│   ├── FinancialNotesSection.tsx  # Sticky notes board & dues tracker
│   ├── MobileNavigation.tsx       # Mobile bottom navigation bar
│   ├── Navbar.tsx                 # Header with sync status & auth controls
│   ├── ReconciliationModal.tsx    # Bank statement balance reconciliation
│   ├── SettleNoteModal.tsx        # 1-click auto-settle note into bank account
│   ├── SetupWizard.tsx            # Initial two-account setup wizard
│   ├── SupabaseGuideModal.tsx     # In-app setup & SQL script guide
│   └── UpiTeaserCard.tsx          # UPI statement auto-sync preview card
├── context/
│   ├── AuthContext.tsx            # Supabase auth & persistent session provider
│   ├── LedgerContext.tsx          # Global ledger state, notes, & offline queue
│   └── ThemeContext.tsx           # Light/Dark mode provider with persistence
├── lib/
│   ├── constants.ts               # Categories, colors, timezone constants
│   ├── db/
│   │   ├── indexedDB.ts           # IndexedDB local storage engine (stores accounts, txns, notes)
│   │   └── syncEngine.ts          # Supabase bidirectional sync engine
│   ├── ledger/
│   │   └── balanceEngine.ts       # Atomic ledger balance calculations
│   ├── supabase/
│   │   └── client.ts              # Supabase client initializer
│   ├── types.ts                   # Core TypeScript definitions
│   └── utils/
│       └── formatters.ts          # Currency, Asia/Kolkata dates, CSV helpers
├── supabase/
│   └── schema.sql                 # Production PostgreSQL tables & RLS security policies
├── .env.example                   # Example environment file
└── README.md                      # Complete project documentation
```

---

## License
MIT License. Built for modern, private, and resilient personal financial recordkeeping.
