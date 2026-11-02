import { UserUpiSettings } from '../types';

const STORAGE_KEY = 'sd_user_upi_settings';

export function getStoredUpiSettings(): UserUpiSettings {
  if (typeof window === 'undefined') {
    return { upiId: '', payeeName: 'Sagar Dey' };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        upiId: parsed.upiId?.trim() || '',
        payeeName: parsed.payeeName?.trim() || 'Sagar Dey',
      };
    }
  } catch {
    // fallback
  }
  return { upiId: '', payeeName: 'Sagar Dey' };
}

export function saveStoredUpiSettings(settings: UserUpiSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        upiId: settings.upiId.trim(),
        payeeName: settings.payeeName.trim(),
      })
    );
    window.dispatchEvent(
      new CustomEvent('sd-upi-settings-updated', { detail: settings })
    );
  } catch {
    // ignore
  }
}

/**
 * Builds standard NPCI UPI payment deep link
 * Format: upi://pay?pa=<UPI_ID>&pn=<NAME>&am=<AMOUNT>&cu=INR&tn=<NOTE>
 */
export function buildUpiPayUri(params: {
  upiId: string;
  payeeName: string;
  amount?: number | null;
  noteTitle?: string;
}): string {
  const { upiId, payeeName, amount, noteTitle } = params;
  if (!upiId) return '';

  const queryParts: string[] = [
    `pa=${encodeURIComponent(upiId)}`,
    `pn=${encodeURIComponent(payeeName || 'SD-Ledger User')}`,
    'cu=INR',
  ];

  if (amount != null && amount > 0) {
    queryParts.push(`am=${amount.toFixed(2)}`);
  }

  if (noteTitle) {
    // Keep transaction note short and clean
    const cleanNote = noteTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim().substring(0, 30);
    queryParts.push(`tn=${encodeURIComponent(cleanNote || 'Settlement')}`);
  }

  return `upi://pay?${queryParts.join('&')}`;
}

