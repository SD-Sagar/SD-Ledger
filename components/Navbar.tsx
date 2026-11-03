'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import {
  CloudUpload,
  CloudDownload,
  Wifi,
  WifiOff,
  ShieldCheck,
  Download,
  Database,
  User,
  LogOut,
  Sun,
  Moon,
  ArrowLeftRight,
  MoreVertical,
  Calculator,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { DEMO_USER_ID, ADMIN_EMAIL } from '../lib/constants';
import { BrandLogo } from './BrandLogo';
import { NotificationCenter } from './NotificationCenter';
import { UserSettingsModal } from './UserSettingsModal';
import { AdminUsersModal } from './AdminUsersModal';

interface NavbarProps {
  onOpenAuth: (prompt?: string) => void;
  onOpenBackup: () => void;
  onOpenCalculator: () => void;
  onOpenAuditTrail: () => void;
  onOpenSupabaseGuide?: () => void;
}

export function Navbar({
  onOpenAuth,
  onOpenBackup,
  onOpenCalculator,
  onOpenAuditTrail,
  onOpenSupabaseGuide,
}: NavbarProps) {
  const { user, isDemoUser, signOut } = useAuth();
  const {
    syncStatus,
    uploadOfflineToCloud,
    pullLatestFromCloud,
    pushLocalDataToCloud,
    linkedCloudAccount,
    clearLocalData,
  } = useLedger();
  const { theme, toggleTheme } = useTheme();

  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [clearDataOnSwitch, setClearDataOnSwitch] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushingCloud, setIsPushingCloud] = useState(false);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const menuRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Listen for global request to open settings (e.g. from WhatsApp nudge)
  useEffect(() => {
    const handleOpenSettingsEvent = () => setShowSettingsModal(true);
    window.addEventListener('sd-open-settings', handleOpenSettingsEvent);
    return () => window.removeEventListener('sd-open-settings', handleOpenSettingsEvent);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleUserDropdownOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleUserDropdownOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleUserDropdownOutside);
    };
  }, [showUserDropdown]);

  const handlePushClick = async () => {
    if (!navigator.onLine) {
      alert('Device is currently offline. Connect to the internet to push to cloud.');
      return;
    }
    setIsPushingCloud(true);
    await pushLocalDataToCloud();
    setIsPushingCloud(false);
    setShowMoreMenu(false);
  };

  // Close mobile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  const handleUploadClick = async () => {
    if (!navigator.onLine) {
      alert('Device is currently offline. Connect to the internet to upload changes to the cloud.');
      return;
    }

    const res = await uploadOfflineToCloud();
    if (res && res.requiresAuth) {
      onOpenAuth(res.message || 'Please sign in with your linked cloud account to upload offline changes.');
    }
  };

  const handlePullClick = async () => {
    if (!navigator.onLine) {
      alert('Device is currently offline. Connect to the internet to pull latest cloud data.');
      return;
    }
    setIsPulling(true);
    await pullLatestFromCloud();
    setIsPulling(false);
    setShowMoreMenu(false);
  };

  const handleConfirmSwitch = async () => {
    if (clearDataOnSwitch) {
      await clearLocalData(DEMO_USER_ID);
    }
    setShowSwitchModal(false);
    onOpenAuth('Sign in with the new cloud account you wish to link and import into offline mode:');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
          {/* Brand Logo with Creative Dynamic Dark/White Theme Reaction */}
          <div className="shrink-0 min-w-0">
            <BrandLogo
              size="md"
              subtext="Offline-First • Smart Merge • Supabase Cloud Sync"
            />
          </div>

          {/* Navigation Action Tools & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Logged-in only tools & sync controls */}
            {user && (
              <>
                {/* OFFLINE MODE: Linked Cloud Badge with Live Sync & Upload Buttons (Desktop/Tablet only; on mobile in bottom dock) */}
                {isDemoUser && (
                  <div className="hidden sm:flex items-center gap-1 sm:gap-1.5">
                    {/* Linked Cloud Account Badge + Quick Live Sync */}
                    <div
                      className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-cyan-300/80 dark:border-cyan-800/80 bg-cyan-50/90 dark:bg-cyan-950/60 p-1 sm:px-2.5 sm:py-1 text-xs font-medium text-cyan-800 dark:text-cyan-300 shadow-sm"
                      title={linkedCloudAccount ? `Linked Cloud: ${linkedCloudAccount}. Click Live Sync to pull latest cloud records.` : 'No cloud account linked yet'}
                    >
                      <Database className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 hidden sm:inline" />
                      <span className="hidden sm:inline max-w-[130px] truncate text-[11px] font-medium">
                        {linkedCloudAccount ? linkedCloudAccount : 'No Cloud'}
                      </span>

                      {/* Live Sync / Pull latest button */}
                      <button
                        type="button"
                        onClick={handlePullClick}
                        disabled={isPulling || syncStatus.isSyncing}
                        title="Live Sync: Pull latest updated data from cloud"
                        className="flex items-center gap-1 rounded-lg bg-cyan-200/60 dark:bg-cyan-900/60 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold text-cyan-900 dark:text-cyan-200 hover:bg-cyan-300/60 dark:hover:bg-cyan-800/60 transition-colors disabled:opacity-50"
                      >
                        <CloudDownload className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isPulling ? 'animate-bounce text-cyan-600 dark:text-cyan-300' : ''}`} />
                        <span className="hidden sm:inline">{isPulling ? 'Pulling...' : 'Live Sync'}</span>
                      </button>
                    </div>

                    {/* Upload to Cloud Button */}
                    <button
                      onClick={handleUploadClick}
                      disabled={syncStatus.isSyncing}
                      title={
                        syncStatus.pendingCount > 0
                          ? `${syncStatus.pendingCount} pending offline changes. Click to upload to cloud.`
                          : 'Upload offline changes to linked cloud account'
                      }
                      className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-emerald-600 px-2 sm:px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors disabled:opacity-50"
                    >
                      <CloudUpload
                        className={`h-3.5 w-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`}
                      />
                      <span className="hidden sm:inline">
                        {syncStatus.isSyncing
                          ? 'Uploading...'
                          : syncStatus.pendingCount > 0
                          ? `Upload (${syncStatus.pendingCount})`
                          : 'Upload'}
                      </span>
                      {syncStatus.pendingCount > 0 && (
                        <span className="sm:hidden text-[10px] bg-emerald-800 px-1.5 py-0.2 rounded-full font-mono">
                          {syncStatus.pendingCount}
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {/* Online mode: Push Localhost Data to Cloud Button (Desktop/Tablet only; on mobile in bottom dock) */}
                {!isDemoUser && (
                  <div className="hidden sm:flex items-center gap-1 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={handlePushClick}
                      disabled={isPushingCloud}
                      title="Push localhost ledger data directly to Supabase Cloud"
                      className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
                    >
                      <CloudUpload className={`h-3.5 w-3.5 ${isPushingCloud ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{isPushingCloud ? 'Pushing...' : 'Push to Cloud'}</span>
                    </button>

                    <div className="hidden lg:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-950/60 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <Wifi className="h-3.5 w-3.5" />
                      <span>Online Engine</span>
                    </div>
                  </div>
                )}

                {/* 48-Hour Financial Radar Notifications Center */}
                <NotificationCenter />
              </>
            )}

            {/* Dark / Light Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 p-2 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-indigo-600 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Quick Calculator Button (Desktop & Tablet only; on mobile it is in the bottom dock) */}
            <button
              type="button"
              onClick={onOpenCalculator}
              title="Quick Calculator (Keyboard Supported)"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-2 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-xs"
            >
              <Calculator className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Calculator</span>
            </button>

            {/* DESKTOP-ONLY QUICK UTILITIES & MOBILE MORE MENU (Visible only when user is active) */}
            {user && (
              <>
                {/* Audit Trail Button */}
                <button
                  onClick={onOpenAuditTrail}
                  title="Audit Trail Log"
                  className="hidden xl:flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Audit Trail</span>
                </button>

                {/* Backup / Export Button */}
                <button
                  onClick={onOpenBackup}
                  title="CSV Export & JSON Backup / Restore"
                  className="hidden xl:flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white"
                >
                  <Download className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Backup</span>
                </button>

                {/* Switch Account (Desktop) */}
                {isDemoUser && (
                  <button
                    type="button"
                    onClick={() => setShowSwitchModal(true)}
                    title="Switch Cloud Account"
                    className="hidden xl:flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Switch</span>
                  </button>
                )}

                {/* LAPTOPS (<1280px), TABLETS & MOBILE "MORE" DROPDOWN MENU */}
                <div className="relative xl:hidden" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    title="More Options"
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 p-2 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>

                  {showMoreMenu && (
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                      {/* Mobile Profile Card */}
                      <div className="sm:hidden px-3 py-2 mb-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                              {user.fullName || user.email}
                            </p>
                            <span className="inline-block rounded bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
                              {isDemoUser ? 'Offline Workspace' : 'Online Account'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Settings & UPI Profile Option in mobile menu */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowSettingsModal(true);
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors text-left"
                      >
                        <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Settings &amp; UPI Profile</span>
                      </button>

                      {/* Admin Control Panel (Mobile Menu - only for deysagar1999@gmail.com) */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setShowAdminModal(true);
                          }}
                          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors text-left"
                        >
                          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span>Admin Control Panel</span>
                        </button>
                      )}

                      {isDemoUser && (
                        <>
                          <button
                            onClick={handlePullClick}
                            disabled={isPulling || syncStatus.isSyncing}
                            className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors text-left disabled:opacity-50"
                          >
                            <div className="flex items-center gap-2">
                              <CloudDownload className={`h-4 w-4 text-cyan-600 dark:text-cyan-400 ${isPulling ? 'animate-bounce' : ''}`} />
                              <span>Live Sync (Pull Cloud)</span>
                            </div>
                            {isPulling && <span className="text-[10px] text-cyan-500 animate-pulse">Pulling...</span>}
                          </button>

                          <button
                            onClick={() => {
                              setShowMoreMenu(false);
                              setShowSwitchModal(true);
                            }}
                            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                          >
                            <ArrowLeftRight className="h-4 w-4 text-cyan-500" />
                            <span>Switch Cloud Account</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          onOpenBackup();
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                      >
                        <Download className="h-4 w-4 text-teal-500" />
                        <span>Backup / Export</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          onOpenAuditTrail();
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                      >
                        <ShieldCheck className="h-4 w-4 text-indigo-500" />
                        <span>Audit Trail Log</span>
                      </button>

                      <div className="sm:hidden pt-1 mt-1 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out / Exit Offline</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Desktop User Profile & Closable Settings Dropdown List */}
            {user ? (
              <div className="relative hidden sm:block" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2 sm:px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="max-w-[70px] sm:max-w-[100px] truncate hidden md:inline">
                    {user.fullName || user.email}
                  </span>
                  {isDemoUser && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
                      Offline
                    </span>
                  )}
                </button>

                {/* Closable Dropdown List with Settings & UPI Configuration */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2.5 mb-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {user.fullName || 'SD-Ledger User'}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {user.email}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          setShowSettingsModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer"
                      >
                        <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <span>Settings &amp; UPI Profile</span>
                          <span className="block text-[10px] text-zinc-400 font-normal">
                            Configure UPI for WhatsApp &amp; QR
                          </span>
                        </div>
                      </button>

                      {/* Admin Control Panel (Desktop Dropdown - only for deysagar1999@gmail.com) */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserDropdown(false);
                            setShowAdminModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors text-left cursor-pointer"
                        >
                          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <div>
                            <span className="flex items-center gap-1.5 font-bold">
                              Admin Control Panel
                              <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] text-amber-700 dark:text-amber-300">Admin</span>
                            </span>
                            <span className="block text-[10px] text-zinc-400 font-normal">
                              Manage users, passwords, block/unblock
                            </span>
                          </div>
                        </button>
                      )}

                      {/* Backup / Export & Restore */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenBackup();
                        }}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left cursor-pointer"
                      >
                        <Download className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        <div>
                          <span>Backup / Export</span>
                          <span className="block text-[10px] text-zinc-400 font-normal">
                            CSV export &amp; JSON account restore
                          </span>
                        </div>
                      </button>

                      {/* Audit Trail Log */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenAuditTrail();
                        }}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left cursor-pointer"
                      >
                        <ShieldCheck className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        <div>
                          <span>Audit Trail Log</span>
                          <span className="block text-[10px] text-zinc-400 font-normal">
                            Activity timeline &amp; edit tracking
                          </span>
                        </div>
                      </button>

                      {/* Live Sync Pull (Offline / Demo mode) */}
                      {isDemoUser && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserDropdown(false);
                            handlePullClick();
                          }}
                          disabled={isPulling || syncStatus.isSyncing}
                          className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors text-left cursor-pointer disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <CloudDownload className={`h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0 ${isPulling ? 'animate-bounce' : ''}`} />
                            <div>
                              <span>Live Sync (Pull Cloud)</span>
                              <span className="block text-[10px] text-zinc-400 font-normal">
                                Refresh latest cloud balances
                              </span>
                            </div>
                          </div>
                          {isPulling && <span className="text-[10px] text-cyan-500 animate-pulse">Pulling...</span>}
                        </button>
                      )}

                      {isDemoUser ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserDropdown(false);
                            setShowSwitchModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left cursor-pointer"
                        >
                          <ArrowLeftRight className="h-4 w-4 text-zinc-400 shrink-0" />
                          <span>Switch Cloud Account</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserDropdown(false);
                            onOpenAuth();
                          }}
                          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left cursor-pointer"
                        >
                          <User className="h-4 w-4 text-zinc-400 shrink-0" />
                          <span>Account Credentials</span>
                        </button>
                      )}

                      <div className="pt-1 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserDropdown(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="h-4 w-4 shrink-0" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth()}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 hover:shadow-emerald-500/20"
              >
                <User className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SWITCH / CHANGE ACCOUNT CONFIRMATION MODAL */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center gap-3 text-cyan-600 dark:text-cyan-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Switch Cloud Account</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Change linked user account</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mt-2">
              You are currently linked to <strong className="font-semibold text-zinc-900 dark:text-white">{linkedCloudAccount || 'No account'}</strong>.
              Switching allows you to link and import bank accounts from a different Supabase cloud account into this offline workspace.
            </p>

            <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearDataOnSwitch}
                  onChange={(e) => setClearDataOnSwitch(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-[11px]">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                    Remove local cached ledger for this account
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    If checked, clears local offline IndexedDB cache to populate fresh from the new cloud account.
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitch}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition-colors"
              >
                Proceed & Switch Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Settings & UPI Profile Modal */}
      <UserSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Primary Admin Control Panel Modal */}
      <AdminUsersModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />
    </>
  );
}
