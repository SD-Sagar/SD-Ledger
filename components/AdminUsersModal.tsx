'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Trash2,
  KeyRound,
  ShieldAlert,
  UserX,
  UserCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  UserPlus,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL } from '../lib/constants';

interface AdminUserRecord {
  id: string;
  email: string;
  fullName?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  is_blocked: boolean;
}

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminUsersModal({ isOpen, onClose }: AdminUsersModalProps) {
  const { user, session } = useAuth();

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasServiceRoleKey, setHasServiceRoleKey] = useState(true);

  // Modal sub-states
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [showCreatePass, setShowCreatePass] = useState(false);

  // Change Password state
  const [passwordUser, setPasswordUser] = useState<AdminUserRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all users
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'x-admin-email': user?.email || '',
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/users', { headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users || []);
      setHasServiceRoleKey(Boolean(data.hasServiceRoleKey));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching users';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      fetchUsers();
      setIsCreatingUser(false);
      setPasswordUser(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, user]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleToggleBlock = async (targetUser: AdminUserRecord) => {
    if (targetUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      alert('The primary administrator account cannot be blocked.');
      return;
    }

    const actionText = targetUser.is_blocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${actionText} ${targetUser.email}?`)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user?.email || '',
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'toggle_block',
          userId: targetUser.id,
          isBlocked: !targetUser.is_blocked,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status');

      setSuccessMsg(data.message);
      await fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user?.email || '',
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create_user',
          email: createEmail.trim(),
          password: createPassword,
          fullName: createFullName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setSuccessMsg(data.message);
      setIsCreatingUser(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateFullName('');
      await fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'User creation failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user?.email || '',
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'change_password',
          userId: passwordUser.id,
          newPassword: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setSuccessMsg(`Password for ${passwordUser.email} has been updated!`);
      setPasswordUser(null);
      setNewPassword('');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (targetUser: AdminUserRecord) => {
    if (targetUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      alert('The primary administrator account cannot be deleted.');
      return;
    }

    if (!window.confirm(`PERMANENT ACTION: Delete user ${targetUser.email} and all their bank accounts, notes, and transactions?`)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user?.email || '',
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'delete_user',
          userId: targetUser.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      setSuccessMsg(`User ${targetUser.email} deleted.`);
      await fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 bg-amber-500/5 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Admin Control Panel
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                  Master Access
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Logged in as <strong>{ADMIN_EMAIL}</strong> &bull; Manage all registered accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="p-3 mx-4 sm:mx-6 mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 mx-4 sm:mx-6 mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Missing Service Role Key Notice */}
        {!hasServiceRoleKey && (
          <div className="p-3 mx-4 sm:mx-6 mt-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Admin Direct Password &amp; Creation Setup</strong>
              <p className="text-[11px] mt-0.5 leading-relaxed text-amber-800 dark:text-amber-300">
                To allow direct password overrides and instant user creation from this panel, paste your Supabase{' '}
                <code className="font-mono bg-amber-200/50 dark:bg-amber-900/50 px-1 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
                into your project <code className="font-mono">.env</code> file (Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; service_role).
              </p>
            </div>
          </div>
        )}

        {/* Toolbar: Search, Refresh, and Create User Button */}
        <div className="p-4 sm:px-6 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by email or name..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={isLoading}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Refresh users list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingUser(true);
                setPasswordUser(null);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create New User</span>
            </button>
          </div>
        </div>

        {/* Sub-Form: Create New User */}
        {isCreatingUser && (
          <form
            onSubmit={handleCreateUser}
            className="p-4 sm:px-6 bg-amber-50/40 dark:bg-amber-950/20 border-b border-amber-500/20 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                <span>Create New User Account</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingUser(false)}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  User Email *
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="newuser@example.com"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Password (min 6 chars) *
                </label>
                <div className="relative">
                  <input
                    type={showCreatePass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePass(!showCreatePass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showCreatePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingUser(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create User & Enable Login'}
              </button>
            </div>
          </form>
        )}

        {/* Sub-Form: Change User Password */}
        {passwordUser && (
          <form
            onSubmit={handleChangePassword}
            className="p-4 sm:px-6 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-500/20 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Change Password for: <strong>{passwordUser.email}</strong></span>
              </span>
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 mb-2">
              <div className="relative flex-1 w-full">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)..."
                  className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setPasswordUser(null)}
                  className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isSubmitting ? 'Updating...' : 'Save Password in Database'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Users List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-500 mb-2" />
              <p className="text-xs text-zinc-400">Loading registered users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <ShieldAlert className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {searchQuery ? 'No users matching search' : 'No registered users found'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                You can create a new user account using the button above.
              </p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelf = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

              return (
                <div
                  key={u.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    u.is_blocked
                      ? 'border-rose-300/80 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                      : isSelf
                      ? 'border-amber-300/80 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs'
                      : 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80'
                  }`}
                >
                  {/* Left: User Avatar + Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold uppercase shrink-0 border ${
                        u.is_blocked
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          : isSelf
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {u.email.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {u.email}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300">
                            Primary Admin
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            u.is_blocked
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {u.is_blocked ? 'Blocked' : 'Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        {u.fullName ? `${u.fullName} • ` : ''}Joined {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {!isSelf && (
                      <>
                        {/* Block / Unblock Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(u)}
                          disabled={isSubmitting}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer border ${
                            u.is_blocked
                              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                              : 'border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                          }`}
                          title={u.is_blocked ? 'Unblock user' : 'Block user from logging in'}
                        >
                          {u.is_blocked ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Unblock</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Block</span>
                            </>
                          )}
                        </button>

                        {/* Change Password */}
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordUser(u);
                            setIsCreatingUser(false);
                            setNewPassword('');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="Change user password from database"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Password</span>
                        </button>

                        {/* Delete User */}
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          disabled={isSubmitting}
                          className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Delete user and all their records"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{users.length} registered accounts</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 font-semibold cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}

