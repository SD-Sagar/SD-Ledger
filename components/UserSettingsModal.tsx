'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Settings,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  User,
} from 'lucide-react';
import { getStoredUpiSettings, saveStoredUpiSettings, buildUpiPayUri } from '../lib/utils/upi';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { getSupabase } from '../lib/supabase/client';
import { DEMO_USER_ID } from '../lib/constants';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const { user } = useAuth();
  const { linkedCloudUserId } = useLedger();

  const [payeeName, setPayeeName] = useState('Sagar Dey');
  const [upiId, setUpiId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredUpiSettings();
      setPayeeName(stored.payeeName || user?.fullName || 'Sagar Dey');
      setUpiId(stored.upiId || '');
      setSaveSuccess(false);
      setHasCopied(false);

      // If local UPI ID is not set yet, attempt to fetch from user_profiles table in Supabase
      const fetchCloudUpi = async () => {
        const supabase = getSupabase();
        const effectiveUid = user && user.id !== DEMO_USER_ID ? user.id : linkedCloudUserId;
        if (supabase && effectiveUid && !stored.upiId && navigator.onLine) {
          try {
            const { data } = await supabase
              .from('user_profiles')
              .select('upi_id, full_name')
              .eq('id', effectiveUid)
              .maybeSingle();
            if (data?.upi_id) {
              setUpiId(data.upi_id);
              if (data.full_name) setPayeeName(data.full_name);
              saveStoredUpiSettings({
                upiId: data.upi_id,
                payeeName: data.full_name || stored.payeeName || 'Sagar Dey',
              });
            }
          } catch {
            // ignore
          }
        }
      };
      fetchCloudUpi();
    }
  }, [isOpen, user, linkedCloudUserId]);

  // Generate dynamic QR preview whenever UPI ID changes
  useEffect(() => {
    if (!upiId.trim() || !upiId.includes('@')) {
      setQrDataUrl(null);
      return;
    }

    const testUri = buildUpiPayUri({
      upiId: upiId.trim(),
      payeeName: payeeName.trim(),
      amount: 100, // sample preview amount
      noteTitle: 'Payment Preview',
    });

    let isMounted = true;
    QRCode.toDataURL(testUri, {
      width: 220,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (isMounted) setQrDataUrl(null);
      });

    return () => {
      isMounted = false;
    };
  }, [upiId, payeeName]);

  if (!isOpen) return null;

  const isValidUpi = upiId.trim().length >= 4 && upiId.includes('@');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPayee = payeeName.trim() || user?.fullName || 'Sagar Dey';
    const cleanUpi = upiId.trim();

    // 1. Save to local storage for offline instant availability
    saveStoredUpiSettings({
      payeeName: cleanPayee,
      upiId: cleanUpi,
    });

    // 2. Persist to Supabase database (user_profiles) if authenticated
    const supabase = getSupabase();
    const effectiveUid = user && user.id !== DEMO_USER_ID ? user.id : linkedCloudUserId;
    if (supabase && effectiveUid && navigator.onLine) {
      try {
        await supabase.from('user_profiles').upsert({
          id: effectiveUid,
          email: user?.email || '',
          full_name: cleanPayee,
          upi_id: cleanUpi,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (dbErr) {
        console.warn('Could not update UPI in user_profiles database:', dbErr);
      }
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  const copyUpiUri = () => {
    const uri = buildUpiPayUri({
      upiId: upiId.trim(),
      payeeName: payeeName.trim(),
    });
    navigator.clipboard.writeText(uri);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Ledger Profile &amp; UPI Settings
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure your UPI ID for 1-tap WhatsApp dues reminders &amp; QR codes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          {saveSuccess && (
            <div className="flex items-center gap-2 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>UPI settings saved successfully! Your reminders will now include this UPI ID.</span>
            </div>
          )}

          {/* Payee Name Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>Your Display Name / Payee Name</span>
            </label>
            <input
              type="text"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="e.g. Sagar Dey"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              required
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Appears in UPI payment requests and friendly WhatsApp messages.
            </p>
          </div>

          {/* UPI ID (VPA) Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Primary UPI ID (VPA) *</span>
              </label>
              {isValidUpi ? (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Valid Format
                </span>
              ) : (
                <span className="text-[11px] text-zinc-400 font-mono">e.g. sagar@okaxis</span>
              )}
            </div>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. sagar@okaxis, 9876543210@paytm, user@ybl"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              required
            />
          </div>

          {/* Live UPI QR & Deep Link Preview Card */}
          {isValidUpi && qrDataUrl ? (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Dynamic QR Code Preview</span>
                </div>
                <button
                  type="button"
                  onClick={copyUpiUri}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 transition-colors"
                >
                  {hasCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy UPI Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="p-2.5 bg-white rounded-2xl shadow-md border border-zinc-200 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="UPI QR Code Preview"
                    className="w-28 h-28 object-contain"
                  />
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                    {payeeName}
                  </span>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold block">
                    {upiId}
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1">
                    When you click the WhatsApp button on any due or khata note, this QR and instant
                    pay link are generated automatically for the exact outstanding amount!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Enter your UPI ID (e.g. <code>sagar@okaxis</code> or <code>mobile@paytm</code>) to
                enable instant QR generation and 1-tap WhatsApp payment reminders.
              </span>
            </div>
          )}

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Stored 100% locally on your device. Never shared with any third party.</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!isValidUpi}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save UPI Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

