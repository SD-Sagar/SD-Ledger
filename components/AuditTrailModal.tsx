'use client';

import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { formatDisplayDateTime } from '../lib/utils/formatters';
import {
  X,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  Edit3,
  Trash2,
  Scale,
  Sparkles,
  Database,
} from 'lucide-react';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuditTrailModal({ isOpen, onClose }: AuditTrailModalProps) {
  const { auditLogs } = useLedger();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredLogs = auditLogs.filter((log) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      log.summary.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.entity_type.toLowerCase().includes(query)
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return {
          icon: <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />,
          color: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60',
        };
      case 'UPDATE':
        return {
          icon: <Edit3 className="h-3.5 w-3.5 text-indigo-400" />,
          color: 'bg-indigo-950/40 text-indigo-400 border-indigo-900/60',
        };
      case 'DELETE':
        return {
          icon: <Trash2 className="h-3.5 w-3.5 text-rose-400" />,
          color: 'bg-rose-950/40 text-rose-400 border-rose-900/60',
        };
      case 'RECONCILE':
        return {
          icon: <Scale className="h-3.5 w-3.5 text-teal-400" />,
          color: 'bg-teal-950/40 text-teal-400 border-teal-900/60',
        };
      case 'SETUP':
        return {
          icon: <Sparkles className="h-3.5 w-3.5 text-amber-400" />,
          color: 'bg-amber-950/40 text-amber-400 border-amber-900/60',
        };
      default:
        return {
          icon: <Database className="h-3.5 w-3.5 text-zinc-400" />,
          color: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Transaction Audit Trail</h2>
              <p className="text-[11px] text-zinc-400">
                Immutable chronological log of all ledger modifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="my-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit events by summary, action, or entity..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              No audit trail events recorded yet.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const isExpanded = expandedId === log.id;

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.color}`}
                      >
                        {badge.icon}
                        <span>{log.action}</span>
                      </span>
                      <span className="text-xs text-white font-medium">
                        {log.summary}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
                      <span>{formatDisplayDateTime(log.created_at)}</span>
                      {log.details && (
                        <span>
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON Inspector */}
                  {isExpanded && log.details && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <p className="text-[10px] font-semibold text-zinc-400 mb-1">
                        Event Metadata & Snapshot Diff:
                      </p>
                      <pre className="rounded-lg bg-zinc-950 p-2.5 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-48">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
