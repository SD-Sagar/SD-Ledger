# SD-Ledger — Personal Bank Ledger & Finance Tracker

**SD-Ledger** is a modern, responsive, offline-first personal finance application built with **Next.js**, **IndexedDB**, and **Supabase**. It is designed around tracking personal bank accounts (starts with two, allows unlimited additions), atomic two-way transfers, bank statement reconciliation, and Row-Level Security (RLS).

---

## Table of Contents
1. [Key Features](#key-features)
2. [Prerequisites & Installation](#prerequisites--installation)
3. [Environment Configuration](#environment-configuration)
4. [Supabase Setup & RLS Database Schema](#supabase-setup--rls-database-schema)
5. [How Offline Mode & Cloud Sync Works](#how-offline-mode--cloud-sync-works)
6. [How to Use the Backup CSV](#how-to-use-the-backup-csv)
7. [Deploying to Vercel](#deploying-to-vercel)
8. [Deploying to Render](#deploying-to-render)
9. [Project Structure](#project-structure)

---

## Key Features

- **Personal Account Management**: Starts with a friendly setup wizard for your first two personal bank accounts, and allows adding unlimited accounts anytime (*ICICI Bank, Cash Wallet, Kotak 811, Business Accounts*, etc.).
- **Zero Banking Credentials Required**: No real account numbers or net-banking passwords are ever asked or stored.
- **Daily Recordkeeping**: Prominent dashboard buttons for **Add Expense**, **Add Income**, and **Transfer Money**.
- **Atomic Two-Way Transfers**: Moving money between accounts updates both balances in a single atomic transaction.
- **Bank Statement Reconciliation**: Distinguishes calculated ledger balances from actual bank balances entered during statement check-ins, highlighting exact discrepancies (`₹0 difference` for balanced accounts).
- **Searchable, Date-Filterable Ledger**: Search by description, category, amount, or account. Filter by presets (*Today, Yesterday, This Week, This Month, Last Month, Custom Date Range*).
- **Offline-First with IndexedDB**: Full functionality when disconnected from the internet. All entries save instantly to your browser's IndexedDB.
- **Bidirectional Cloud Sync**: Flushes offline changes to Supabase and pulls remote updates when online.
- **1-Click Offline-to-Cloud Migration**: If you start recording transactions in offline/demo mode, you can migrate all offline data to your Supabase account upon logging in with a single tap.
- **Data Portability**: Instant CSV export, complete JSON database backup, and schema-validated JSON restore.
- **Transaction Audit Trail**: Immutable chronological log of all creations, edits, deletions, and reconciliations.
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

> **Note**: Even if you haven't created a Supabase project yet, SD-Ledger will run in **Local Offline Mode** with full IndexedDB storage. You can also enter your Supabase keys directly inside the application under **Supabase Setup** in the top navigation bar.

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

-- 5. AUDIT LOGS TABLE
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

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own reconciliations" ON public.reconciliations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
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
When you tap the **Sync Cloud Now** button:
1. **Flushes Local Queue**: The sync engine reads any pending actions (`create`, `update`, `delete`) queued in IndexedDB while offline and uploads them to Supabase using idempotent upserts (`onConflict: 'id'`).
2. **Pulls Remote Updates**: Downloads the latest accounts, transactions, and reconciliations for your authenticated user from Supabase.
3. **Merges into IndexedDB**: Updates your local browser cache so all views, charts, and balances reflect the latest state.
4. **Visual Toast Feedback**: Displays a green notification confirming: *"Cloud Sync Complete: Local and cloud records are fully up to date."*

### 2. Automatic Online/Offline Detection
- If you lose internet connectivity, an amber **Offline** badge appears. You can continue adding expenses, incomes, transfers, and accounts normally; they are safely stored in IndexedDB.
- As soon as your internet connection returns, SD-Ledger detects the `online` event and automatically pushes all pending changes to Supabase in the background.

### 3. Migrating Offline Demo Data to Your Cloud Account
- If you start testing SD-Ledger in **Offline Mode** and later create or log in to a Supabase account, SD-Ledger detects your offline entries.
- A banner appears on your dashboard: **"Offline Local Entries Detected"**.
- Tapping **"Sync Offline Data to Cloud"** updates the user ownership of those offline records and uploads them to your Supabase account.

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

### How to Use the CSV in Excel or Google Sheets:
1. **Open**: In Excel or Google Sheets, go to **File &rarr; Open** or **Import** and select the `.csv` file.
2. **Monthly Summary (Pivot Table)**:
   - Select all columns &rarr; Insert **Pivot Table**.
   - Rows: `Category / Source`
   - Values: Sum of `Amount (INR)`
   - Columns or Filters: `Type` (set to `EXPENSE`)
   - You now have an exact breakdown of your monthly expenditure.
3. **Sharing with Accountant / CA**: The CSV can be directly shared with your tax consultant or Chartered Accountant for annual tax filing and bank reconciliation.

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

### Step 3: Configure Project Settings (Field-by-Field Reference)

When importing your project, Vercel displays the **Configure Project** screen. Here is exactly what to enter into each field:

| Field Name | What to Select / Enter | Notes & Guidance |
| :--- | :--- | :--- |
| **Vercel Scope / Team** | Select your account (e.g. `SD-Sagar (Hobby)`) | Choose the personal Hobby account or team where you want the project deployed. |
| **Project Name** | `sd-ledger` | Defaults to your GitHub repo name. This defines your production domain: `https://sd-ledger.vercel.app` (or `sd-ledger-<username>.vercel.app`). |
| **Framework Preset** | `Next.js` | Vercel automatically detects Next.js 16. Leave this untouched. |
| **Root Directory** | `./` | Leave as `./` (project root). Only edit if the Next.js app is inside a monorepo subfolder. |
| **Build and Output Settings** | Leave all toggles **Unchecked** (Default) | Vercel automatically uses `npm run build` (`next build`), output directory `.next`, and install command `npm install`. |
| **Environment Variables** | **Add the 2 variables below** | Expand this accordion section to input your Supabase cloud credentials. |

#### Environment Variables to Add:

1. **Variable 1: Supabase URL**
   - **Key**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Your Supabase Project URL (e.g., `https://xyzproject.supabase.co` from Supabase *Project Settings &rarr; API*)
   - **Environments**: Keep all three checked (`Production`, `Preview`, `Development`)
   - Click the **Add** button.

2. **Variable 2: Supabase Anon Key**
   - **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Your Supabase `anon` public API key (long token starting with `eyJhb...` from Supabase *Project Settings &rarr; API*)
   - **Environments**: Keep all three checked (`Production`, `Preview`, `Development`)
   - Click the **Add** button.

### Step 4: Click Deploy
Click the blue **Deploy** button. Vercel will:
- Clone your repository
- Install all dependencies
- Compile the Next.js production bundle with Turbopack
- Deploy to worldwide edge CDN nodes with automatic SSL/HTTPS certificate within 60 seconds!

---

## Deploying to Render

You can host SD-Ledger on [render.com](https://render.com) using their **Web Service** tier.

### Step 1: Push Code to GitHub
Ensure your repository is pushed to GitHub.

### Step 2: Create a Web Service on Render
1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New + &rarr; Web Service**.
2. Connect your GitHub repository `sd-ledger`.
3. Configure the service settings:
   - **Name**: `sd-ledger`
   - **Environment**: `Node`
   - **Region**: Choose closest to you (e.g. Singapore / Frankfurt).
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free or Starter

### Step 3: Add Environment Variables on Render
Under **Environment Variables**, add:
- `NEXT_PUBLIC_SUPABASE_URL`: `https://your-project.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `your-anon-public-key`
- `NODE_VERSION`: `20.10.0` (optional, recommended)

Click **Create Web Service**. Render will install dependencies, build the Next.js bundle, and launch your production instance.

---

## Project Structure

```
SD-Ledger/
├── app/
│   ├── globals.css              # Dark fintech CSS theme & scrollbars
│   ├── layout.tsx               # Root layout with metadata
│   └── page.tsx                 # Main application page
├── components/
│   ├── AddAccountModal.tsx      # Modal to add additional accounts
│   ├── AddTransactionModal.tsx  # Modal for Expense and Income entry
│   ├── AuditTrailModal.tsx      # Audit trail history & snapshot viewer
│   ├── AuthModal.tsx            # Supabase Auth & Config modal
│   ├── BackupRestoreModal.tsx   # CSV export, JSON backup & restore
│   ├── Dashboard.tsx            # Main dashboard with balances & actions
│   ├── EditTransactionModal.tsx # Edit existing transaction entries
│   ├── MobileNavigation.tsx     # Mobile bottom navigation bar
│   ├── Navbar.tsx               # Header with sync status & auth controls
│   ├── ReconciliationModal.tsx  # Bank balance reconciliation
│   ├── SetupWizard.tsx          # Initial two-account setup wizard
│   ├── SupabaseGuideModal.tsx   # In-app setup & SQL script guide
│   └── UpiTeaserCard.tsx        # UPI statement auto-sync preview card
├── context/
│   ├── AuthContext.tsx          # Supabase auth & persistent session provider
│   └── LedgerContext.tsx        # Global ledger state & offline queue
├── lib/
│   ├── constants.ts             # Categories, colors, timezone constants
│   ├── db/
│   │   ├── indexedDB.ts         # IndexedDB local storage engine
│   │   └── syncEngine.ts        # Supabase sync & mutation flusher
│   ├── ledger/
│   │   └── balanceEngine.ts     # Atomic ledger balance calculations
│   ├── supabase/
│   │   └── client.ts            # Supabase client initializer
│   ├── types.ts                 # Core TypeScript definitions
│   └── utils/
│       └── formatters.ts        # Currency, Asia/Kolkata dates, CSV helpers
├── supabase/
│   └── schema.sql               # PostgreSQL tables & RLS security policies
├── .env.example                 # Example environment file
└── README.md                    # Project documentation
```

---

## License
MIT License. Built for modern, private, and resilient personal financial recordkeeping.
