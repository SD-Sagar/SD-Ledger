'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .catch((err) => {
            console.warn('SD-Ledger PWA Service Worker registration:', err);
          });
      });
    }

    // Capture beforeinstallprompt for Android / Chrome install banner
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Check if user previously dismissed
      const dismissed = localStorage.getItem('sd_pwa_install_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowBanner(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('sd_pwa_install_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  if (!showBanner || !installPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 rounded-2xl border border-emerald-500/40 bg-zinc-950/95 p-4 shadow-2xl text-white backdrop-blur-md animate-in slide-in-from-bottom-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white">Install SD-Ledger App</h4>
          <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
            Add to home screen for 1-tap full-screen launch and 100% offline access.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
            >
              Install App
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

