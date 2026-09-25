import type { HistoryEntry, HistoryRecipient, SelectedContact } from './types';

export const HISTORY_LIMIT = 200;

/** Entries are grouped by message text; surrounding whitespace doesn't make a new entry. */
const keyOf = (message: string) => message.trim();

function upsertRecipient(recipients: HistoryRecipient[], r: HistoryRecipient): HistoryRecipient[] {
  return [...recipients.filter((x) => x.id !== r.id), r];
}

/** Records that `contact` was sent `message`: joins that message's entry (or starts one) and moves it to the top. */
export function addToHistory(list: HistoryEntry[], message: string, contact: SelectedContact, now: number): HistoryEntry[] {
  const { id, name, firstName, phone, thumbnail } = contact;
  const recipient: HistoryRecipient = { id, name, firstName, phone, thumbnail, sentAt: now };
  const existing = list.find((h) => keyOf(h.message) === keyOf(message));
  const entry: HistoryEntry = existing
    ? { ...existing, date: now, recipients: upsertRecipient(existing.recipients, recipient) }
    : { id: now.toString(36) + Math.random().toString(36).slice(2, 6), date: now, message, recipients: [recipient] };
  return [entry, ...list.filter((h) => h !== existing)].slice(0, HISTORY_LIMIT);
}

/**
 * Normalises stored history: merges entries that share a message (older versions saved one
 * entry per send) and fills in `sentAt` for recipients saved before it existed.
 */
export function mergeHistory(list: HistoryEntry[]): HistoryEntry[] {
  const byKey = new Map<string, HistoryEntry>();
  for (const h of [...list].sort((a, b) => a.date - b.date)) {
    const recipients = h.recipients.map((r) => ({ ...r, sentAt: r.sentAt ?? h.date }));
    const prev = byKey.get(keyOf(h.message));
    byKey.set(
      keyOf(h.message),
      prev
        ? { ...prev, date: Math.max(prev.date, h.date), recipients: recipients.reduce(upsertRecipient, prev.recipients) }
        : { ...h, recipients },
    );
  }
  return [...byKey.values()].sort((a, b) => b.date - a.date);
}
