'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  Share2,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { FinancialNote } from '../lib/types';
import { getStoredUpiSettings, buildUpiPayUri } from '../lib/utils/upi';
import { formatINR } from '../lib/utils/formatters';

interface NoteQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: FinancialNote | null;
  onOpenSettings?: () => void;
}

export function NoteQrModal({ isOpen, onClose, note, onOpenSettings }: NoteQrModalProps) {
  const [upiSettings, setUpiSettings] = useState(() => getStoredUpiSettings());
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasShared, setHasShared] = useState(false);

  // Sync UPI settings if updated
  useEffect(() => {
    setUpiSettings(getStoredUpiSettings());
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setUpiSettings(customEvent.detail);
      } else {
        setUpiSettings(getStoredUpiSettings());
      }
    };
    window.addEventListener('sd-upi-settings-updated', handleUpdate);
    return () => window.removeEventListener('sd-upi-settings-updated', handleUpdate);
  }, [isOpen]);

  const hasUpi = Boolean(
    upiSettings.upiId && upiSettings.upiId.trim().length >= 4 && upiSettings.upiId.includes('@')
  );

  const currentAmount = typeof note?.amount === 'number' && !isNaN(note.amount) ? note.amount : 0;

  // Generate QR for this note's exact amount
  useEffect(() => {
    if (!isOpen || !note || !hasUpi) {
      setQrDataUrl(null);
      return;
    }

    let isMounted = true;
    const uri = buildUpiPayUri({
      upiId: upiSettings.upiId,
      payeeName: upiSettings.payeeName || 'Sagar Dey',
      amount: currentAmount > 0 ? currentAmount : null,
      noteTitle: note.title,
    });

    QRCode.toDataURL(uri, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating note QR:', err);
        if (isMounted) setQrDataUrl(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, note, hasUpi, upiSettings, currentAmount]);

  if (!isOpen || !note) return null;

  const upiUri = hasUpi
    ? buildUpiPayUri({
        upiId: upiSettings.upiId,
        payeeName: upiSettings.payeeName || 'Sagar Dey',
        amount: currentAmount > 0 ? currentAmount : null,
        noteTitle: note.title,
      })
    : '';

  const handleCopyLink = () => {
    if (!upiUri) return;
    navigator.clipboard.writeText(upiUri);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!upiUri) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `UPI Payment for ${note.title}`,
          text: `Please pay ${formatINR(currentAmount)} to ${upiSettings.payeeName} (${upiSettings.upiId}) via UPI:`,
          url: upiUri,
        });
        setHasShared(true);
        setTimeout(() => setHasShared(false), 2000);
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 sm:p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-tight">
                Scan to Settle Due
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Dynamic UPI QR code for this specific note
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Note Info Banner */}
        <div className="my-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 p-3.5 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block truncate">
              {note.type === 'THEY_OWE_ME' ? 'They Owe You' : 'Payment Reminder'}
            </span>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
              {note.title}
            </h4>
            {note.phone_number && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-mono">
                WhatsApp: {note.phone_number}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-semibold text-zinc-400 block uppercase">Amount</span>
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {formatINR(currentAmount)}
            </span>
          </div>
        </div>

        {/* QR Code Presentation Card */}
        {hasUpi && qrDataUrl ? (
          <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-gradient-to-b from-white via-zinc-50 to-teal-50/20 dark:from-zinc-900 dark:via-zinc-950 dark:to-teal-950/20 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center shadow-xs">
            <div className="p-2.5 bg-white rounded-2xl shadow-md border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="UPI QR Code for Note"
                className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
              />
            </div>

            <div className="mt-3.5 space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white block">
                {upiSettings.payeeName}
              </span>
              <span className="text-xs font-mono text-teal-600 dark:text-teal-400 font-semibold block">
                {upiSettings.upiId}
              </span>
              <span className="inline-block mt-2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-semibold border border-emerald-500/30">
                Any UPI App: GPay, PhonePe, Paytm, BHIM, CRED
              </span>
            </div>

            {/* Actions: Copy & Share */}
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap w-full">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-2xs cursor-pointer"
              >
                {hasCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied Link</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Pay Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{hasShared ? 'Shared' : 'Share QR'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <div>
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400">
                UPI ID Not Configured
              </h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
                Please set up your receiving UPI ID in Settings to generate QR codes with your exact note amount.
              </p>
            </div>
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure UPI ID</span>
              </button>
            )}
          </div>
        )}

        {/* Footer Back Button */}
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Notes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
