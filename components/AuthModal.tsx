'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getSupabaseConfig,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
} from '../lib/supabase/client';
import {
  X,
  Mail,
  Lock,
  User,
  KeyRound,
  Database,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptMessage?: string | null;
  initialTab?: TabType;
}

type TabType = 'signin' | 'signup' | 'forgot' | 'settings';

export function AuthModal({ isOpen, onClose, promptMessage, initialTab }: AuthModalProps) {
  const {
    user,
    isDemoUser,
    isSupabaseReady,
    authMessage,
    authError,
    clearAuthMessages,
    signIn,
    signUp,
    resetPassword,
    resendVerificationEmail,
    continueAsDemo,
    signOut,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Synchronize initialTab if changed
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Supabase Custom Config state
  const config = getSupabaseConfig();
  const [customUrl, setCustomUrl] = useState(config.url);
  const [customKey, setCustomKey] = useState(config.anonKey);
  const [configSavedNotice, setConfigSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setLocalError(null);
    clearAuthMessages();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const res = await signIn(email, password);
    setIsSubmitting(false);
    if (res.success) {
      onClose();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Please enter email and password.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const res = await signUp(email, password, fullName);
    setIsSubmitting(false);
    if (res.success && !res.needsVerification) {
      onClose();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email) {
      setLocalError('Please enter your account email.');
      return;
    }

    setIsSubmitting(true);
    await resetPassword(email);
    setIsSubmitting(false);
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl || !customKey) {
      setLocalError('Both Supabase URL and Anon Key are required.');
      return;
    }
    saveCustomSupabaseConfig(customUrl, customKey);
    setConfigSavedNotice(true);
    setTimeout(() => {
      setConfigSavedNotice(false);
      window.location.reload();
    }, 1200);
  };

  const handleClearConfig = () => {
    clearCustomSupabaseConfig();
    setCustomUrl('');
    setCustomKey('');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showText={false} interactive={false} />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {activeTab === 'signin' && 'Sign In to SD-Ledger'}
                {activeTab === 'signup' && 'Create Your Account'}
                {activeTab === 'forgot' && 'Reset Password'}
                {activeTab === 'settings' && 'Supabase Configuration'}
              </h2>
              <p className="text-xs text-zinc-400">
                {activeTab === 'settings'
                  ? 'Connect your personal Supabase project'
                  : 'Isolated data with Row Level Security'}
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

        {/* Prompt banner for Offline Sync credential request */}
        {promptMessage && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="leading-relaxed">{promptMessage}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 mt-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium">
          <button
            onClick={() => handleTabChange('signin')}
            className={`py-1.5 rounded-lg transition-colors ${
              activeTab === 'signin'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => handleTabChange('signup')}
            className={`py-1.5 rounded-lg transition-colors ${
              activeTab === 'signup'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            onClick={() => handleTabChange('forgot')}
            className={`py-1.5 rounded-lg transition-colors ${
              activeTab === 'forgot'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Forgot
          </button>
          {/* Config Tab (Hidden) */}
          <button
            type="button"
            onClick={() => handleTabChange('settings')}
            style={{ display: 'none' }}
            className="hidden"
          >
            <Database className="h-3 w-3" />
            <span>Config</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {localError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{localError}</span>
          </div>
        )}
        {authError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}
        {authMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{authMessage}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-zinc-300">Password</label>
                <button
                  type="button"
                  onClick={() => handleTabChange('forgot')}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 pl-9 pr-10 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-950 transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-950 px-2 text-zinc-500">or offline mode</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                continueAsDemo();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Continue in Local Offline Mode</span>
            </button>
          </form>
        )}

        {/* TAB 2: SIGN UP */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Full Name (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Riza"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-950 transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
              <ArrowRight className="h-4 w-4" />
            </button>

            {email && (
              <button
                type="button"
                onClick={() => resendVerificationEmail(email)}
                className="w-full text-center text-[11px] text-zinc-400 hover:text-emerald-400 mt-2"
              >
                Need email verification resent? Click here
              </button>
            )}
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="mt-4 space-y-3.5">
            <p className="text-xs text-zinc-400">
              Enter the email address associated with your account. Supabase will send a password reset link to your inbox.
            </p>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-950 transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {/* TAB 4: SUPABASE CONFIGURATION (Hidden) */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSupabaseConfig} style={{ display: 'none' }} className="hidden mt-4 space-y-3.5">
            <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3 text-xs text-emerald-300">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Client-Side Supabase Keys
              </p>
              <p className="text-[11px] text-zinc-400">
                You can configure Supabase directly here. Keys are stored safely in your browser. All data isolation is enforced on Supabase with Row Level Security (RLS).
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 px-3 text-xs font-mono text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Supabase Anon Public Key
              </label>
              <input
                type="password"
                required
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 px-3 text-xs font-mono text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {configSavedNotice && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Configuration saved! Reloading SD-Ledger...</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition-colors"
              >
                Save & Connect Supabase
              </button>
              <button
                type="button"
                onClick={handleClearConfig}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Reset
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
