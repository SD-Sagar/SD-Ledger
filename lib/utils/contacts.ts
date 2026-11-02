import { SavedContact, FinancialNote } from '../types';
import { getSupabase } from '../supabase/client';

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
  const nowIso = new Date().toISOString();

  // 1. Check if contact already exists by exact phone digits
  const existingByPhoneIdx = current.findIndex((c) => cleanDigits(c.phone) === digits);

  if (existingByPhoneIdx >= 0) {
    const existing = current[existingByPhoneIdx];
    // CRITICAL: NEVER overwrite an existing friend's name (e.g. "Munshi") with an arbitrary note title (e.g. "rar" or "Dinner share")!
    // Only update name if existing was empty or a generic placeholder.
    const isGenericPlaceholder =
      !existing.name ||
      existing.name.toLowerCase() === 'friend' ||
      existing.name.toLowerCase() === 'unknown' ||
      existing.name.toLowerCase() === 'null';

    const preservedName = isGenericPlaceholder ? trimmedName : existing.name;

    const resultContact: SavedContact = {
      ...existing,
      name: preservedName,
      phone: digits,
      updated_at: nowIso,
    };
    const updatedList = [...current];
    updatedList[existingByPhoneIdx] = resultContact;
    setSavedContacts(updatedList);
    return resultContact;
  }

  // 2. Check if contact exists by name (exact match)
  const existingByNameIdx = current.findIndex(
    (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (existingByNameIdx >= 0) {
    const existing = current[existingByNameIdx];
    const resultContact: SavedContact = {
      ...existing,
      name: trimmedName,
      phone: digits,
      updated_at: nowIso,
    };
    const updatedList = [...current];
    updatedList[existingByNameIdx] = resultContact;
    setSavedContacts(updatedList);
    return resultContact;
  }

  // 3. Brand new contact
  const resultContact: SavedContact = {
    id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: trimmedName,
    phone: digits,
    created_at: nowIso,
    updated_at: nowIso,
  };
  setSavedContacts([resultContact, ...current]);
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

/**
 * Push all saved contacts from localStorage into Supabase cloud (user_contacts table, user_profiles, & auth metadata)
 */
export async function pushContactsToSupabase(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !userId || !navigator.onLine) return;
  const contacts = getSavedContacts();
  if (!contacts || contacts.length === 0) return;

  // 1. Upsert into public.user_contacts table
  try {
    for (const c of contacts) {
      await supabase.from('user_contacts').upsert(
        {
          id: c.id,
          user_id: userId,
          name: c.name,
          phone: cleanDigits(c.phone),
          created_at: c.created_at || new Date().toISOString(),
          updated_at: c.updated_at || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }
  } catch (err) {
    console.warn('Could not upsert into user_contacts table:', err);
  }

  // 2. Also save into user_profiles.saved_contacts via UPDATE to avoid not-null email constraint
  try {
    const { error: upErr } = await supabase
      .from('user_profiles')
      .update({
        saved_contacts: contacts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (upErr) {
      // Fallback
      await supabase.from('user_profiles').upsert(
        {
          id: userId,
          saved_contacts: contacts,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }
  } catch (err) {
    console.warn('Could not save contacts to user_profiles:', err);
  }

  // 3. Persist to auth user_metadata for 100% cloud resilience across all origins
  try {
    await supabase.auth.updateUser({
      data: {
        saved_contacts: contacts,
      },
    });
  } catch {
    // non-blocking
  }
}

/**
 * Pull all saved contacts from Supabase cloud into localStorage
 */
export async function pullContactsFromSupabase(userId: string): Promise<SavedContact[]> {
  const supabase = getSupabase();
  if (!supabase || !userId || !navigator.onLine) return getSavedContacts();

  let remoteContacts: SavedContact[] = [];

  // 1. Try user_contacts table first
  try {
    const { data, error } = await supabase
      .from('user_contacts')
      .select('*')
      .eq('user_id', userId);
    if (!error && Array.isArray(data) && data.length > 0) {
      remoteContacts = data.map((d) => ({
        id: d.id,
        name: d.name,
        phone: cleanDigits(d.phone),
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
    }
  } catch {
    // non-blocking
  }

  // 2. Fallback to user_profiles.saved_contacts
  if (remoteContacts.length === 0) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('saved_contacts')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data?.saved_contacts && Array.isArray(data.saved_contacts)) {
        remoteContacts = data.saved_contacts.map((c: SavedContact) => ({
          ...c,
          phone: cleanDigits(c.phone),
        }));
      }
    } catch {
      // non-blocking
    }
  }

  // 3. Fallback to auth user_metadata.saved_contacts
  if (remoteContacts.length === 0) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.saved_contacts && Array.isArray(user.user_metadata.saved_contacts)) {
        remoteContacts = user.user_metadata.saved_contacts.map((c: SavedContact) => ({
          ...c,
          phone: cleanDigits(c.phone),
        }));
      }
    } catch {
      // non-blocking
    }
  }

  if (remoteContacts.length > 0) {
    const local = getSavedContacts();
    const map = new Map<string, SavedContact>();

    // Remote contacts from Supabase are the true authoritative source:
    // They are inserted first so they take priority over stale local test data!
    remoteContacts.forEach((c) => {
      const key = cleanDigits(c.phone);
      if (key) map.set(key, c);
    });

    // Add any unique local contacts that aren't in remote yet
    local.forEach((c) => {
      const key = cleanDigits(c.phone);
      if (key && !map.has(key)) {
        map.set(key, c);
      }
    });

    const merged = Array.from(map.values());
    setSavedContacts(merged);
    return merged;
  }

  return getSavedContacts();
}

/**
 * Delete contact from Supabase cloud (user_contacts table & user_profiles.saved_contacts)
 */
export async function deleteContactFromSupabase(userId: string, contactId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !userId || !navigator.onLine) return;
  try {
    await supabase.from('user_contacts').delete().eq('id', contactId).eq('user_id', userId);
  } catch (err) {
    console.warn('Could not delete contact from user_contacts table:', err);
  }

  try {
    const remaining = getSavedContacts();
    await supabase.from('user_profiles').update({
      saved_contacts: remaining,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);

    await supabase.auth.updateUser({
      data: { saved_contacts: remaining },
    });
  } catch (err) {
    console.warn('Could not update saved_contacts on user_profiles after delete:', err);
  }
}


