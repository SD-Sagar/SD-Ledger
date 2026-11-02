'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Trash2,
  Edit2,
  Phone,
  BookUser,
  Check,
  UserPlus,
  Sparkles,
  ExternalLink,
  StickyNote,
} from 'lucide-react';
import { SavedContact } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { DEMO_USER_ID } from '../lib/constants';
import {
  getSavedContacts,
  saveOrUpdateContact,
  deleteSavedContact,
  updateSavedContact,
  pushContactsToSupabase,
  pullContactsFromSupabase,
  deleteContactFromSupabase,
} from '../lib/utils/contacts';

interface SavedContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContactForNote?: (contact: SavedContact) => void;
}

export function SavedContactsModal({
  isOpen,
  onClose,
  onSelectContactForNote,
}: SavedContactsModalProps) {
  const { user } = useAuth();
  const { linkedCloudUserId } = useLedger();
  const effectiveUid = user?.id && user.id !== DEMO_USER_ID ? user.id : (linkedCloudUserId || undefined);

  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Reload contacts from storage
  const reloadContacts = () => {
    setContacts(getSavedContacts());
  };

  useEffect(() => {
    if (isOpen) {
      reloadContacts();
      setIsAdding(false);
      setEditingId(null);
      setFormError(null);

      // Auto-pull fresh cloud contacts from Supabase when opening directory
      if (effectiveUid && navigator.onLine) {
        pullContactsFromSupabase(effectiveUid)
          .then((updated) => setContacts(updated))
          .catch(console.warn);
      }
    }
  }, [isOpen, effectiveUid]);

  // Listen for contacts updates from other components
  useEffect(() => {
    const handleUpdate = () => reloadContacts();
    window.addEventListener('sd-contacts-updated', handleUpdate);
    return () => window.removeEventListener('sd-contacts-updated', handleUpdate);
  }, []);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q.replace(/\D/g, ''))
    );
  }, [contacts, searchQuery]);

  const handleStartAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormPhone('');
    setFormError(null);
    setIsAdding(true);
  };

  const handleStartEdit = (contact: SavedContact) => {
    setIsAdding(false);
    setEditingId(contact.id);
    setFormName(contact.name);
    setFormPhone(contact.phone);
    setFormError(null);
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormName('');
    setFormPhone('');
    setFormError(null);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = formPhone.replace(/\D/g, '');
    const cleanName = formName.trim();

    if (!cleanName) {
      setFormError('Please enter a friend or contact name.');
      return;
    }
    if (!cleanDigits || cleanDigits.length < 10) {
      setFormError('Please enter a valid 10-digit phone or WhatsApp number.');
      return;
    }

    if (editingId) {
      updateSavedContact(editingId, cleanName, cleanDigits);
    } else {
      saveOrUpdateContact(cleanName, cleanDigits);
    }

    if (effectiveUid) {
      pushContactsToSupabase(effectiveUid).catch(console.warn);
    }

    reloadContacts();
    handleCancelForm();
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}" from saved contacts?`)) {
      deleteSavedContact(id);
      if (effectiveUid) {
        deleteContactFromSupabase(effectiveUid, id).catch(console.warn);
      }
      reloadContacts();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
              <BookUser className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Saved Contacts &amp; Directory
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  {contacts.length} saved
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Quickly pick saved friends when creating notes or sending nudges
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

        {/* Toolbar: Search + Add Button */}
        <div className="p-4 sm:px-6 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or number..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
          {!isAdding && !editingId && (
            <button
              type="button"
              onClick={handleStartAdd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Contact</span>
            </button>
          )}
        </div>

        {/* Add / Edit Form Drawer */}
        {(isAdding || editingId) && (
          <form
            onSubmit={handleSaveForm}
            className="p-4 sm:px-6 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-500/20 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{editingId ? 'Edit Friend Contact' : 'New Friend Contact'}</span>
              </span>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {formError && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mb-2 font-medium">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Friend&apos;s Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rahul or Munsaf"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  WhatsApp Number *
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 7319332362"
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                {editingId ? 'Update Contact' : 'Save to Directory'}
              </button>
            </div>
          </form>
        )}

        {/* Contacts List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-10">
              <BookUser className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {searchQuery ? 'No contacts found matching search' : 'No saved contacts yet'}
              </p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1">
                {searchQuery
                  ? 'Try a different name or number query'
                  : 'Whenever you save a note with a phone number, it gets remembered here automatically!'}
              </p>
              {!searchQuery && !isAdding && (
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Contact</span>
                </button>
              )}
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3 sm:p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 hover:border-emerald-500/40 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center justify-between gap-3 shadow-2xs"
              >
                {/* Left: Avatar + Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-xs font-extrabold shrink-0 uppercase">
                    {contact.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block truncate">
                      {contact.name}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{contact.phone}</span>
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {onSelectContactForNote && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectContactForNote(contact);
                        onClose();
                      }}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold transition-colors cursor-pointer"
                      title="Create a new note with this friend pre-filled"
                    >
                      <StickyNote className="w-3 h-3" />
                      <span>New Note</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStartEdit(contact)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Edit contact"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(contact.id, contact.name)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Delete contact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{contacts.length} total saved contacts</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

