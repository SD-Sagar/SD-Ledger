'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client';
import { UserProfile } from '../lib/types';
import { DEMO_USER_ID, DEMO_USER_EMAIL } from '../lib/constants';

interface AuthContextType {
  user: UserProfile | null;
  rawUser: User | null;
  session: Session | null;
  isLoading: boolean;
  isSupabaseReady: boolean;
  isDemoUser: boolean;
  authMessage: string | null;
  authError: string | null;
  clearAuthMessages: () => void;
  signUp: (email: string, pass: string, fullName?: string) => Promise<{ success: boolean; needsVerification?: boolean; error?: string }>;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  continueAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [rawUser, setRawUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const isSupabaseReady = isSupabaseConfigured();

  const clearAuthMessages = useCallback(() => {
    setAuthMessage(null);
    setAuthError(null);
  }, []);

  const continueAsDemo = useCallback(() => {
    setIsDemoUser(true);
    setUser({
      id: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      fullName: 'SD-Ledger Demo User',
      isEmailVerified: true,
    });
    setRawUser(null);
    setSession(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sd_ledger_is_demo', 'true');
    }
  }, []);

  // Initialize Auth
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      // Check if demo session was active
      if (typeof window !== 'undefined' && localStorage.getItem('sd_ledger_is_demo') === 'true') {
        continueAsDemo();
        setIsLoading(false);
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        // Fallback to demo mode if Supabase credentials are not provided
        continueAsDemo();
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Error fetching Supabase session:', error.message);
        }

        if (mounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setRawUser(initialSession.user);
            setUser({
              id: initialSession.user.id,
              email: initialSession.user.email || '',
              fullName: initialSession.user.user_metadata?.full_name || initialSession.user.email?.split('@')[0],
              isEmailVerified: Boolean(initialSession.user.email_confirmed_at),
            });
            setIsDemoUser(false);
          } else {
            // No active session: fallback to demo mode so user can explore right away
            continueAsDemo();
          }
          setIsLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (!mounted) return;
            const isDemoActive = typeof window !== 'undefined' && localStorage.getItem('sd_ledger_is_demo') === 'true';
            if (isDemoActive) {
              // User is explicitly in Offline Mode. Store session for background cloud upload/import, but keep demo profile active!
              if (newSession?.user) {
                setSession(newSession);
                setRawUser(newSession.user);
              } else {
                setSession(null);
                setRawUser(null);
              }
              continueAsDemo();
              return;
            }

            if (newSession?.user) {
              setSession(newSession);
              setRawUser(newSession.user);
              setUser({
                id: newSession.user.id,
                email: newSession.user.email || '',
                fullName: newSession.user.user_metadata?.full_name || newSession.user.email?.split('@')[0],
                isEmailVerified: Boolean(newSession.user.email_confirmed_at),
              });
              setIsDemoUser(false);
            } else {
              setSession(null);
              setRawUser(null);
              setUser(null);
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          continueAsDemo();
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [continueAsDemo]);

  // Sign Up
  const signUp = async (email: string, pass: string, fullName?: string) => {
    clearAuthMessages();
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured yet. Please configure it in settings.' };
    }

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: fullName?.trim() || '',
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      if (data.user && !data.session) {
        // Email confirmation is required
        setAuthMessage(
          'Registration successful! Please check your email inbox to verify your account before logging in.'
        );
        return { success: true, needsVerification: true };
      }

      setAuthMessage('Account created successfully! Welcome to SD-Ledger.');
      return { success: true, needsVerification: false };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  // Sign In
  const signIn = async (email: string, pass: string) => {
    clearAuthMessages();
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured yet. Please connect your Supabase project.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('sd_ledger_is_demo');
      }

      setIsDemoUser(false);
      setSession(data.session);
      setRawUser(data.user);
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        fullName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
        isEmailVerified: Boolean(data.user.email_confirmed_at),
      });

      setAuthMessage('Logged in successfully!');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  // Sign Out
  const signOut = async () => {
    clearAuthMessages();
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('sd_ledger_is_demo');
      if (user && user.id !== DEMO_USER_ID) {
        localStorage.setItem('sd_ledger_offline_synced_cloud_account', user.email || user.id);
        localStorage.setItem('sd_ledger_offline_changes_made', 'false');
      }
    }

    setUser(null);
    setRawUser(null);
    setSession(null);
    setIsDemoUser(false);
  };

  // Reset Password
  const resetPassword = async (email: string) => {
    clearAuthMessages();
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      setAuthMessage('Password reset instructions have been sent to your email.');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  // Update Password
  const updatePassword = async (password: string) => {
    clearAuthMessages();
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }
      setAuthMessage('Password updated successfully!');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  // Resend Verification Email
  const resendVerificationEmail = async (email: string) => {
    clearAuthMessages();
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      setAuthMessage('Verification email resent. Please check your inbox.');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend verification';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        rawUser,
        session,
        isLoading,
        isSupabaseReady,
        isDemoUser,
        authMessage,
        authError,
        clearAuthMessages,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        resendVerificationEmail,
        continueAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
