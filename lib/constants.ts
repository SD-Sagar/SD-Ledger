export const APP_NAME = 'SD-Ledger';
export const APP_TAGLINE = 'Personal Finance & Two-Account Bank Ledger';
export const APP_TIMEZONE = 'Asia/Kolkata';

// Expense Categories
export const EXPENSE_CATEGORIES = [
  { id: 'Food & Dining', label: 'Food & Dining', icon: 'Utensils', color: '#f97316' },
  { id: 'Groceries', label: 'Groceries', icon: 'ShoppingCart', color: '#10b981' },
  { id: 'Rent & Housing', label: 'Rent & Housing', icon: 'Home', color: '#6366f1' },
  { id: 'Utilities & Bills', label: 'Utilities & Bills', icon: 'Zap', color: '#eab308' },
  { id: 'Travel & Commute', label: 'Travel & Commute', icon: 'Car', color: '#06b6d4' },
  { id: 'Shopping', label: 'Shopping', icon: 'ShoppingBag', color: '#ec4899' },
  { id: 'Health & Medical', label: 'Health & Medical', icon: 'HeartPulse', color: '#ef4444' },
  { id: 'Entertainment', label: 'Entertainment', icon: 'Film', color: '#8b5cf6' },
  { id: 'Education & Learning', label: 'Education & Learning', icon: 'BookOpen', color: '#3b82f6' },
  { id: 'Personal Care', label: 'Personal Care', icon: 'Sparkles', color: '#d946ef' },
  { id: 'Investments / SIP', label: 'Investments / SIP', icon: 'TrendingUp', color: '#14b8a6' },
  { id: 'Gifts & Charity', label: 'Gifts & Charity', icon: 'Gift', color: '#f43f5e' },
  { id: 'Other Expense', label: 'Other Expense', icon: 'MoreHorizontal', color: '#64748b' },
] as const;

// Income Sources
export const INCOME_SOURCES = [
  { id: 'Salary', label: 'Salary / Monthly Pay', icon: 'Briefcase', color: '#10b981' },
  { id: 'Freelance & Projects', label: 'Freelance & Projects', icon: 'Laptop', color: '#06b6d4' },
  { id: 'Business / Sales', label: 'Business / Sales', icon: 'Store', color: '#6366f1' },
  { id: 'Dividends & Interest', label: 'Dividends & Interest', icon: 'PieChart', color: '#8b5cf6' },
  { id: 'Cashback & Refunds', label: 'Cashback & Refunds', icon: 'RotateCcw', color: '#f59e0b' },
  { id: 'Rental Income', label: 'Rental Income', icon: 'Key', color: '#14b8a6' },
  { id: 'Gifts & Allowance', label: 'Gifts & Allowance', icon: 'Gift', color: '#ec4899' },
  { id: 'Other Income', label: 'Other Income', icon: 'PlusCircle', color: '#64748b' },
] as const;

export const ACCOUNT_COLORS = [
  { name: 'Emerald Teal', from: '#059669', to: '#0d9488', text: '#ffffff', border: '#10b981' },
  { name: 'Indigo Violet', from: '#4f46e5', to: '#7c3aed', text: '#ffffff', border: '#6366f1' },
  { name: 'Amber Gold', from: '#d97706', to: '#b45309', text: '#ffffff', border: '#f59e0b' },
  { name: 'Cyan Blue', from: '#0284c7', to: '#0369a1', text: '#ffffff', border: '#0ea5e9' },
  { name: 'Rose Coral', from: '#e11d48', to: '#be123c', text: '#ffffff', border: '#f43f5e' },
  { name: 'Slate Dark', from: '#334155', to: '#1e293b', text: '#ffffff', border: '#475569' },
];

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_USER_EMAIL = 'demo@sd-ledger.local';

// Storage & Optimization Limits
export const MAX_AUDIT_TRAIL_LIMIT = 50; // Maximum chronological audit trail events retained/displayed
export const TRANSACTION_HISTORY_MONTHS_LIMIT = 6; // Transaction history limit in months (6 months)
export const RESOLVED_NOTES_RETENTION_DAYS = 5; // Timeline to keep resolved notes before auto-cleanup (5 days)

