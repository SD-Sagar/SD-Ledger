'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Send,
  Copy,
  Check,
  Download,
  AlertCircle,
  Phone,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  Share2,
  BookUser,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { FinancialNote, SavedContact } from '../lib/types';
import { formatINR, formatDisplayDate } from '../lib/utils/formatters';
import { getStoredUpiSettings, buildUpiPayUri } from '../lib/utils/upi';
import { getSavedContacts, saveOrUpdateContact } from '../lib/utils/contacts';

interface WhatsAppNudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: FinancialNote | null;
  onOpenSettings: () => void;
}

export function WhatsAppNudgeModal({
  isOpen,
  onClose,
  note,
  onOpenSettings,
}: WhatsAppNudgeModalProps) {
  const { notes, updateNote } = useLedger();

  const [recipientPhone, setRecipientPhone] = useState('');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [includeQrLink, setIncludeQrLink] = useState(true);
  const [canShareFile, setCanShareFile] = useState(false);
  const [hasContactPicker, setHasContactPicker] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [savedContactsList, setSavedContactsList] = useState<SavedContact[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSavedContactsList(getSavedContacts());
      const onUpdate = () => setSavedContactsList(getSavedContacts());
      window.addEventListener('sd-contacts-updated', onUpdate);
      return () => window.removeEventListener('sd-contacts-updated', onUpdate);
    }
  }, []);

  // Check feature support for Web Share API and Contact Picker
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      if (navigator.canShare) {
        try {
          const dummyFile = new File(['test'], 'test.png', { type: 'image/png' });
          setCanShareFile(navigator.canShare({ files: [dummyFile] }));
        } catch {
          setCanShareFile(false);
        }
      }
      if ('contacts' in navigator && 'ContactsManager' in window) {
        setHasContactPicker(true);
      }
    }
  }, []);

  // Load UPI settings
  const upiSettings = useMemo(() => {
    if (!isOpen) return { upiId: '', payeeName: 'Sagar Dey' };
    return getStoredUpiSettings();
  }, [isOpen]);

  const hasUpi = Boolean(upiSettings.upiId && upiSettings.upiId.includes('@'));
  const currentDue = note?.amount != null && note.amount > 0 ? note.amount : 0;

  // Extract friend name and note reason (from description or parsed title)
  const { friendName, noteReason } = useMemo(() => {
    if (!note) return { friendName: 'Friend', noteReason: '' };

    const titleTrim = note.title.trim();
    const descTrim = note.description?.trim() || '';

    // Description is the primary reason for what the money is for (e.g. "Dinner share")
    let reason = descTrim;

    // Check if title has parenthetical/dash syntax: "Rahul (Dinner share)" or "Rahul - Lunch"
    const splitMatch = titleTrim.match(/^([^(—–-]+)\s*[\(\-—–]\s*([^)]*)\)?$/);
    let extractedName = titleTrim;

    if (splitMatch) {
      extractedName = splitMatch[1].trim();
      if (!reason && splitMatch[2]) {
        reason = splitMatch[2].trim();
      }
    }

    const finalFriendName = extractedName || 'Friend';

    // If reason is still empty and title was NOT just the friend's name, treat title as reason
    if (!reason && titleTrim.toLowerCase() !== finalFriendName.toLowerCase()) {
      reason = titleTrim;
    }

    return { friendName: finalFriendName, noteReason: reason };
  }, [note]);

  // Build a memory book of friend contacts across existing notes & local storage
  const savedContacts = useMemo(() => {
    const map = new Map<string, string>();
    // 1. From all ledger notes
    notes.forEach((n) => {
      if (n.phone_number?.trim()) {
        const nameKey = n.title.split(/[-–—:(]/)[0].trim().toLowerCase();
        if (nameKey && !map.has(nameKey)) {
          map.set(nameKey, n.phone_number.trim());
        }
      }
    });
    // 2. From saved contacts directory in localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sd_contacts_book');
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'string' && v.trim() && !map.has(k.toLowerCase())) {
              map.set(k.toLowerCase(), v.trim());
            }
          });
        }
      } catch {
        // ignore
      }
    }
    return map;
  }, [notes]);

  const suggestedPhone = useMemo(() => {
    if (!friendName || friendName === 'Friend') return null;
    return savedContacts.get(friendName.toLowerCase()) || null;
  }, [friendName, savedContacts]);

  // Construct standard template based on condition of the note
  const defaultTemplate = useMemo(() => {
    if (!note) return '';

    const senderName = upiSettings.payeeName || 'Sagar';
    const upiUri = hasUpi
      ? buildUpiPayUri({
          upiId: upiSettings.upiId,
          payeeName: senderName,
          amount: currentDue,
          noteTitle: noteReason || note.title.trim(),
        })
      : '';

    // Direct QR code image link encoded with exact amount
    const qrImageUrl = (hasUpi && currentDue > 0 && upiUri)
      ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(upiUri)}`
      : '';

    // Standardized UPI payment section
    const buildUpiSection = () => {
      if (!hasUpi || currentDue <= 0) return '';

      const payLine = `Pay instantly via UPI (Tap below to pay Exact ${formatINR(currentDue)}):\n👉 ${upiUri}`;
      const orLine = `— or —`;
      const upiIdLine = `UPI ID: ${upiSettings.upiId}`;
      const qrLine = qrImageUrl
        ? `📸 Scan & Pay QR Code (Exact ${formatINR(currentDue)}):\n👉 ${qrImageUrl}`
        : '';

      if (includeQrLink && qrLine) {
        return `\n\n${payLine}\n\n${orLine}\n\n${qrLine}\n\n${upiIdLine}`;
      } else {
        return `\n\n${payLine}\n\n${orLine}\n\n${upiIdLine}\n(Scan the attached QR code image)`;
      }
    };

    // Reason phrase: e.g. ' for "Dinner share"' or empty if no description and title was just the friend's name
    const forReasonPhrase = noteReason ? ` for "${noteReason}"` : '';

    // Condition 1: Note has partial payments history
    if (note.payment_history && note.payment_history.length > 0 && currentDue > 0) {
      const totalPaid = note.payment_history.reduce((sum, p) => sum + p.amount, 0);
      const originalTotal = (note.original_amount != null && note.original_amount > currentDue)
        ? note.original_amount
        : totalPaid + currentDue;

      return `Hi ${friendName},

Friendly reminder from ${senderName} regarding the remaining ${formatINR(currentDue)} (${formatINR(totalPaid)} received of ${formatINR(originalTotal)})${forReasonPhrase}.${buildUpiSection()}${note.due_date ? `\nTarget Date: ${formatDisplayDate(note.due_date)}` : ''}

Thank you!`;
    }

    // Condition 2: Khata entry where they owe money
    if (note.type === 'THEY_OWE_ME' && currentDue > 0) {
      return `Hi ${friendName},

Friendly reminder from ${senderName} regarding ${formatINR(currentDue)}${forReasonPhrase}.${buildUpiSection()}${note.due_date ? `\nDue Date: ${formatDisplayDate(note.due_date)}` : ''}

Thank you!`;
    }

    // Condition 3: Reminder note
    if (note.type === 'REMINDER') {
      return `Hi ${friendName},

Gentle reminder from ${senderName} regarding: "${noteReason || note.title.trim()}".${
        currentDue > 0 && hasUpi
          ? `\n\nAmount: ${formatINR(currentDue)}${buildUpiSection()}`
          : currentDue > 0
          ? `\n\nAmount: ${formatINR(currentDue)}`
          : ''
      }${note.due_date ? `\nDate: ${formatDisplayDate(note.due_date)}` : ''}

Thank you!`;
    }

    // Fallback condition
    return `Hi ${friendName},

Note from ${senderName} regarding: "${noteReason || note.title.trim()}".${
      currentDue > 0 ? `\nAmount: ${formatINR(currentDue)}` : ''
    }

Thank you!`;
  }, [note, friendName, noteReason, upiSettings, hasUpi, currentDue, includeQrLink]);

  // Sync state when modal opens or note/template changes
  useEffect(() => {
    if (isOpen && note) {
      // Auto-fill from note or saved contact for this friend
      const initialPhone = note.phone_number || suggestedPhone || '';
      setRecipientPhone(initialPhone);
      setPhoneSaved(false);
      setMessageText(defaultTemplate);
      setCopied(false);
      setQrCopied(false);
    }
  }, [isOpen, note, suggestedPhone, defaultTemplate]);

  // Persist phone number to note and local contact book
  const persistPhoneNumber = (phoneToSave: string) => {
    if (!note) return;
    const cleanDigits = phoneToSave.replace(/\D/g, '');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      // 1. Update note in LedgerContext
      if (note.phone_number !== cleanDigits) {
        try {
          await updateNote({
            ...note,
            phone_number: cleanDigits || null,
          });
          setPhoneSaved(true);
          setTimeout(() => setPhoneSaved(false), 2500);
        } catch (err) {
          console.warn('Failed to auto-update note phone number:', err);
        }
      }

      // 2. Save into saved contacts directory
      if (friendName && friendName !== 'Friend' && cleanDigits) {
        saveOrUpdateContact(friendName, cleanDigits);
      }
    }, 400);
  };

  // Pick contact directly using Web Contact Picker API (supported on mobile Chrome/Android)
  const handlePickFromContacts = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contacts = await (navigator as any).contacts.select(['name', 'tel'], {
        multiple: false,
      });
      if (contacts && contacts[0] && contacts[0].tel && contacts[0].tel.length > 0) {
        const rawTel = contacts[0].tel[0].replace(/\D/g, '');
        setRecipientPhone(rawTel);
        persistPhoneNumber(rawTel);
      }
    } catch (err) {
      console.warn('Contact picker cancelled or unsupported:', err);
    }
  };

  // Generate QR Data URL client-side
  useEffect(() => {
    if (!isOpen || !hasUpi || currentDue <= 0 || !note) {
      setQrDataUrl(null);
      return;
    }

    let isMounted = true;
    const upiUri = buildUpiPayUri({
      upiId: upiSettings.upiId,
      payeeName: upiSettings.payeeName || 'Sagar',
      amount: currentDue,
      noteTitle: noteReason || note.title.trim(),
    });

    QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate UPI QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, hasUpi, currentDue, note, noteReason, upiSettings]);

  if (!isOpen || !note) return null;

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Could not copy message to clipboard:', err);
    }
  };

  const handleCopyQrImage = async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      if (typeof window !== 'undefined' && 'ClipboardItem' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = new (window as any).ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setQrCopied(true);
        setTimeout(() => setQrCopied(false), 3000);
      }
    } catch (err) {
      console.warn('Could not copy QR image to clipboard:', err);
    }
  };

  // Direct native share of the exact QR image file + text message
  const handleShareActualQr = async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `UPI-QR-${friendName}-${currentDue}.png`, { type: 'image/png' });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: messageText,
          title: `UPI Payment - ${formatINR(currentDue)}`,
        });
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('Native share failed:', err);
      }
    }
  };

  const handleSendWhatsApp = async () => {
    // Ensure any typed phone number is saved
    persistPhoneNumber(recipientPhone);

    // Also auto-copy QR image to clipboard so user can easily paste in chat if desired
    if (qrDataUrl) {
      try {
        const res = await fetch(qrDataUrl);
        const blob = await res.blob();
        if (typeof window !== 'undefined' && 'ClipboardItem' in window) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const item = new (window as any).ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setQrCopied(true);
        }
      } catch {
        // non-blocking
      }
    }

    const encoded = encodeURIComponent(messageText);

    // Clean phone number (strip whitespace, dashes, plus)
    const rawDigits = recipientPhone.replace(/\D/g, '');

    let targetUrl: string;
    if (rawDigits.length >= 10) {
      // If 10 digits Indian mobile, prepend 91
      const finalNumber = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
      targetUrl = `https://wa.me/${finalNumber}?text=${encoded}`;
    } else {
      // Forward/Search contact state in WhatsApp
      targetUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `UPI-QR-${friendName}-${currentDue}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 sm:p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
              {/* WhatsApp Green Icon */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.27 7.5C9.09 7.5 8.79 7.56 8.54 7.84C8.29 8.11 7.58 8.77 7.58 10.12C7.58 11.47 8.56 12.77 8.7 12.95C8.84 13.13 10.63 15.89 13.37 17.07C14.02 17.35 14.53 17.52 14.93 17.65C15.58 17.86 16.18 17.83 16.65 17.76C17.17 17.68 18.25 17.11 18.48 16.46C18.71 15.81 18.71 15.26 18.64 15.14C18.57 15.02 18.39 14.96 18.12 14.82C17.85 14.68 16.5 14.02 16.25 13.93C16 13.84 15.82 13.79 15.64 14.07C15.46 14.35 14.94 14.96 14.78 15.14C14.62 15.32 14.46 15.34 14.19 15.2C13.92 15.06 13.05 14.78 12.02 13.86C11.22 13.15 10.68 12.27 10.52 12C10.36 11.73 10.5 11.58 10.64 11.44C10.76 11.32 10.91 11.13 11.05 10.97C11.19 10.81 11.24 10.7 11.33 10.52C11.42 10.34 11.38 10.18 11.31 10.04C11.24 9.9 10.69 8.54 10.46 8C10.24 7.47 10.01 7.54 9.85 7.53C9.7 7.53 9.52 7.5 9.27 7.5Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Send WhatsApp Payment Nudge
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Personalized reminder with direct UPI pay link &amp; scan QR
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

        {/* Modal Body */}
        <div className="space-y-4 pt-4">
          {/* UPI Status Warning if no UPI is configured */}
          {!hasUpi && (
            <div className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-200 block">
                    No UPI ID Configured Yet
                  </span>
                  <p className="text-amber-700 dark:text-amber-400 text-[11px] mt-0.5">
                    Add your UPI ID in Settings so the WhatsApp reminder includes a 1-tap payment
                    link and dynamic QR code.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="px-3 py-1 text-[11px] font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-xs shrink-0 cursor-pointer"
              >
                Configure UPI
              </button>
            </div>
          )}

          {/* Recipient WhatsApp Phone Input: Half size on PC with Pick Existing & Import */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Friend&apos;s WhatsApp Number (Optional)</span>
              </label>
              {phoneSaved && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in duration-150">
                  <Check className="w-3 h-3" />
                  <span>Saved to note</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Left Column (Half size on PC): Phone Number Input */}
              <div className="relative">
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => {
                    setRecipientPhone(e.target.value);
                    persistPhoneNumber(e.target.value);
                  }}
                  placeholder="e.g. 7319332362"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              {/* Right Column (Half size on PC): Pick Existing Contact & Mobile Import */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <select
                    value=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const found = savedContactsList.find((c) => c.id === selectedId);
                      if (found) {
                        setRecipientPhone(found.phone);
                        persistPhoneNumber(found.phone);
                      }
                    }}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer truncate"
                  >
                    <option value="">
                      {savedContactsList.length > 0 ? '👤 Pick Saved Friend...' : 'No Saved Contacts'}
                    </option>
                    {savedContactsList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {hasContactPicker && (
                  <button
                    type="button"
                    onClick={handlePickFromContacts}
                    className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold shadow-xs shrink-0 transition-colors cursor-pointer"
                    title="Pick contact from your phone"
                  >
                    <BookUser className="w-3.5 h-3.5" />
                    <span className="sm:hidden">Import</span>
                    <span className="hidden sm:inline">Phone</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Suggestion Pill from Previous Notes if field is empty or changed */}
            {suggestedPhone && recipientPhone.replace(/\D/g, '') !== suggestedPhone.replace(/\D/g, '') && (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">Saved for {friendName}:</span>
                <button
                  type="button"
                  onClick={() => {
                    setRecipientPhone(suggestedPhone);
                    persistPhoneNumber(suggestedPhone);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  <span>{suggestedPhone} (Tap to fill)</span>
                </button>
              </div>
            )}
          </div>

          {/* Clean, Well-Organized Dynamic QR Code & Amount Bar */}
          {hasUpi && qrDataUrl && currentDue > 0 && (
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Left: Thumbnail & Details */}
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                <div
                  onClick={handleDownloadQr}
                  className="p-1.5 bg-white rounded-xl shadow-xs border border-zinc-200 dark:border-zinc-700 shrink-0 cursor-pointer hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 transition-all"
                  title="Click to download full QR image"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="UPI QR"
                    className="w-14 h-14 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      Dynamic UPI QR
                    </span>
                    <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30 whitespace-nowrap">
                      Exact {formatINR(currentDue)}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block mt-0.5 truncate max-w-[200px] sm:max-w-[240px]">
                    {upiSettings.upiId}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-0.5">
                    Scan to pay or copy/save image below
                  </span>
                </div>
              </div>

              {/* Right: Action Buttons with whitespace-nowrap */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleCopyQrImage}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                  title="Copy QR image to clipboard (Ctrl+V into WhatsApp)"
                >
                  {qrCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Copy Image</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                  title="Download QR code image file"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          )}

          {/* QR Copied Helper Hint */}
          {qrCopied && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>QR Image Copied!</strong> If you want to attach the image file in WhatsApp, simply press{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border font-mono text-[10px]">
                  Ctrl+V
                </kbd>{' '}
                (or tap Paste).
              </span>
            </div>
          )}

          {/* Editable WhatsApp Message Area with Dynamic QR Link Toggle */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Personalized WhatsApp Message</span>
              </label>
              <div className="flex items-center gap-3">
                {hasUpi && currentDue > 0 && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 select-none">
                    <input
                      type="checkbox"
                      checked={includeQrLink}
                      onChange={(e) => setIncludeQrLink(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Include QR preview link</span>
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => setMessageText(defaultTemplate)}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Reset to default template"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
            <textarea
              rows={9}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3.5 text-xs text-zinc-900 dark:text-white leading-relaxed focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors font-sans resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Copied Message!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {canShareFile && (
                <button
                  type="button"
                  onClick={handleShareActualQr}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                  title="Share actual QR image file directly into WhatsApp"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share QR Image + Text</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {recipientPhone.trim() ? 'Open WhatsApp Chat' : 'Forward on WhatsApp'}
                </span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
