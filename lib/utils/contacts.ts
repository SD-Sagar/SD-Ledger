import { SavedContact, FinancialNote } from '../types';

const STORAGE_KEY = 'sd_saved_contacts';

function cleanDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function getSavedContacts(): SavedContact[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (c): c is SavedContact =>
          Boolean(c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.phone === 'string')
      );
    }
  } catch {
    // fallback
  }
  return [];
}

export function setSavedContacts(contacts: SavedContact[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    window.dispatchEvent(new CustomEvent('sd-contacts-updated', { detail: contacts }));
  } catch (err) {
    console.warn('Failed to save contacts to localStorage:', err);
  }
}

export function saveOrUpdateContact(name: string, phone: string): SavedContact | null {
  const trimmedName = name.trim();
  const digits = cleanDigits(phone);
  if (!trimmedName || !digits) return null;

  const current = getSavedContacts();
  const lowerName = trimmedName.toLowerCase();
  const nowIso = new Date().toISOString();

  const existingIdx = current.findIndex((c) => c.name.toLowerCase() === lowerName || cleanDigits(c.phone) === digits);

  let updatedList: SavedContact[];
  let resultContact: SavedContact;

  if (existingIdx >= 0) {
    const existing = current[existingIdx];
    resultContact = {
      ...existing,
      name: trimmedName, // update with latest casing
      phone: digits,
      updated_at: nowIso,
    };
    updatedList = [...current];
    updatedList[existingIdx] = resultContact;
  } else {
    resultContact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      phone: digits,
      created_at: nowIso,
      updated_at: nowIso,
    };
    updatedList = [resultContact, ...current];
  }

  setSavedContacts(updatedList);
  return resultContact;
}

export function deleteSavedContact(id: string): void {
  const current = getSavedContacts();
  const filtered = current.filter((c) => c.id !== id);
  setSavedContacts(filtered);
}

export function updateSavedContact(id: string, name: string, phone: string): void {
  const trimmedName = name.trim();
  const digits = cleanDigits(phone);
  if (!trimmedName || !digits) return;

  const current = getSavedContacts();
  const nowIso = new Date().toISOString();
  const updated = current.map((c) => {
    if (c.id === id) {
      return {
        ...c,
        name: trimmedName,
        phone: digits,
        updated_at: nowIso,
      };
    }
    return c;
  });
  setSavedContacts(updated);
}

/**
 * Seeds contacts from existing notes that have a phone number, without overwriting custom names.
 */
export function seedContactsFromNotes(notes: FinancialNote[]): void {
  if (typeof window === 'undefined') return;
  const current = getSavedContacts();
  const existingPhones = new Set(current.map((c) => cleanDigits(c.phone)));
  const existingNames = new Set(current.map((c) => c.name.toLowerCase()));

  const newContacts: SavedContact[] = [];
  const nowIso = new Date().toISOString();

  for (const n of notes) {
    if (n.phone_number?.trim()) {
      const digits = cleanDigits(n.phone_number);
      const name = n.title.split(/[-–—:(]/)[0].trim();
      if (digits && name && !existingPhones.has(digits) && !existingNames.has(name.toLowerCase())) {
        existingPhones.add(digits);
        existingNames.add(name.toLowerCase());
        newContacts.push({
          id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name,
          phone: digits,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
    }
  }

  if (newContacts.length > 0) {
    setSavedContacts([...current, ...newContacts]);
  }
}

