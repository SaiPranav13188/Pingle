import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { addToHistory, mergeHistory } from '../lib/history';
import { personalize } from '../lib/message';
import { toWhatsAppNumber } from '../lib/phone';
import { GROUPS_KEY, HISTORY_KEY, load, save, STATE_KEY } from '../lib/storage';
import type { ContactGroup, HistoryEntry, SelectedContact } from '../lib/types';
import { sendViaWhatsApp } from '../lib/whatsapp';

/** Added to numbers saved without a country code. */
export const COUNTRY_CODE = '+91';
/** Seconds Auto-next waits before opening the next chat. */
export const AUTO_NEXT_SECONDS = 3;

/** Next contact without a ✓, looking after `afterId` first and then wrapping to earlier ones. */
export function nextUnsent(selected: SelectedContact[], sentIds: string[], afterId?: string): SelectedContact | undefined {
  const start = afterId ? selected.findIndex((c) => c.id === afterId) + 1 : 0;
  const ordered = [...selected.slice(start), ...selected.slice(0, start)];
  return ordered.find((c) => !sentIds.includes(c.id));
}

export type ToastTone = 'success' | 'error' | 'info';
export type Toast = { id: number; message: string; tone: ToastTone };

type Persisted = {
  message: string;
  selected: SelectedContact[];
  sentIds: string[];
  autoNext?: boolean;
};

export type Countdown = { id: string; endsAt: number };

type Store = {
  hydrated: boolean;
  message: string;
  /** In the order they were picked — shown top to bottom. */
  selected: SelectedContact[];
  sentIds: string[];
  /** Contact whose WhatsApp chat is open right now (waiting for the user to come back). */
  pendingId: string | null;
  /** True once everyone selected has been sent to. */
  allSent: boolean;
  history: HistoryEntry[];
  groups: ContactGroup[];
  /** Auto-next: after coming back from WhatsApp, open the next chat by itself. */
  autoNext: boolean;
  /** Running Auto-next countdown, if any. */
  countdown: Countdown | null;
  toast: Toast | null;
  setMessage: (text: string) => void;
  select: (contact: SelectedContact) => void;
  unselect: (id: string) => void;
  clearSelection: () => void;
  startNew: () => void;
  send: (id: string) => Promise<void>;
  reuse: (entry: HistoryEntry) => void;
  deleteHistoryEntry: (id: string) => void;
  saveGroup: (g: { id?: string; name: string; contacts: SelectedContact[] }) => ContactGroup;
  deleteGroup: (id: string) => void;
  /** Replaces the current selection with the group's members. */
  applyGroup: (group: ContactGroup) => void;
  setAutoNext: (on: boolean) => void;
  pauseCountdown: () => void;
  /** Skip the rest of the countdown and open the chat now. */
  openNow: () => void;
  showToast: (message: string, tone?: ToastTone) => void;
};

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <AppStoreProvider>');
  return ctx;
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<SelectedContact[]>([]);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [autoNext, setAutoNextState] = useState(true);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set when WhatsApp is opened; `leftApp` flips once Pingle actually goes to the background. */
  const awaitingReturn = useRef<{ id: string; leftApp: boolean } | null>(null);

  // Restore everything, so coming back from WhatsApp still works if Android restarted the app.
  useEffect(() => {
    Promise.all([
      load<Persisted | null>(STATE_KEY, null),
      load<HistoryEntry[]>(HISTORY_KEY, []),
      load<ContactGroup[]>(GROUPS_KEY, []),
    ]).then(([s, h, g]) => {
      if (s) {
        setMessage(s.message ?? '');
        setSelected(s.selected ?? []);
        setSentIds(s.sentIds ?? []);
        setAutoNextState(s.autoNext ?? true);
      }
      setHistory(mergeHistory(h));
      setGroups(g);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) save(STATE_KEY, { message, selected, sentIds, autoNext } satisfies Persisted);
  }, [hydrated, message, selected, sentIds, autoNext]);

  const showToast = useCallback((text: string, tone: ToastTone = 'info') => {
    setToast({ id: Date.now(), message: text, tone });
  }, []);

  const updateHistory = useCallback((fn: (prev: HistoryEntry[]) => HistoryEntry[]) => {
    setHistory((prev) => {
      const next = fn(prev);
      save(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const allSent = selected.length > 0 && selected.every((c) => sentIds.includes(c.id));

  // Latest values for the AppState listener below (it's registered once).
  const latest = useRef({ message, selected, sentIds, autoNext });
  useEffect(() => {
    latest.current = { message, selected, sentIds, autoNext };
  }, [message, selected, sentIds, autoNext]);

  // `send` is recreated as state changes; the countdown timer always calls the newest one.
  const sendRef = useRef<(id: string) => Promise<void>>(async () => {});

  const pauseCountdown = useCallback(() => {
    if (countdownTimer.current) clearTimeout(countdownTimer.current);
    countdownTimer.current = null;
    setCountdown(null);
  }, []);

  const startCountdown = useCallback((id: string) => {
    if (countdownTimer.current) clearTimeout(countdownTimer.current);
    setCountdown({ id, endsAt: Date.now() + AUTO_NEXT_SECONDS * 1000 });
    countdownTimer.current = setTimeout(() => {
      countdownTimer.current = null;
      setCountdown(null);
      // Only open WhatsApp if Pingle is still on screen.
      if (AppState.currentState === 'active') sendRef.current(id);
    }, AUTO_NEXT_SECONDS * 1000);
  }, []);

  useEffect(() => () => {
    if (countdownTimer.current) clearTimeout(countdownTimer.current);
  }, []);

  /** Ticks a contact and records it under this message's history entry. */
  const markSent = useCallback(
    (id: string) => {
      const { message: msg, selected: sel, sentIds: sent } = latest.current;
      const contact = sel.find((c) => c.id === id);
      if (!contact) return;
      const nextSent = sent.includes(id) ? sent : [...sent, id];
      setSentIds(nextSent);
      updateHistory((prev) => addToHistory(prev, msg, contact, Date.now()));
      const next = nextUnsent(sel, nextSent, id);
      if (!next) showToast('All sent! Saved to History ✓', 'success');
      else if (latest.current.autoNext) startCountdown(next.id);
    },
    [showToast, startCountdown, updateHistory],
  );

  // WhatsApp gives no "sent" callback, so a contact counts as sent when the user comes back
  // to Pingle after its chat was opened (Send, then Back).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      // Leaving Pingle during a countdown cancels it — never open a chat behind the user's back.
      if (state === 'background' && countdownTimer.current) pauseCountdown();
      const waiting = awaitingReturn.current;
      if (!waiting) return;
      if (state === 'background') waiting.leftApp = true;
      if (state === 'active' && waiting.leftApp) {
        awaitingReturn.current = null;
        setPendingId(null);
        markSent(waiting.id);
      }
    });
    return () => sub.remove();
  }, [markSent, pauseCountdown]);

  const select = useCallback((contact: SelectedContact) => {
    setSelected((prev) => (prev.some((c) => c.id === contact.id) ? prev : [...prev, contact]));
  }, []);

  const unselect = useCallback((id: string) => {
    pauseCountdown();
    setSelected((prev) => prev.filter((c) => c.id !== id));
    setSentIds((prev) => prev.filter((x) => x !== id));
  }, [pauseCountdown]);

  const clearSelection = useCallback(() => {
    pauseCountdown();
    setSelected([]);
    setSentIds([]);
  }, [pauseCountdown]);

  const startNew = useCallback(() => {
    pauseCountdown();
    awaitingReturn.current = null;
    setPendingId(null);
    setMessage('');
    setSelected([]);
    setSentIds([]);
  }, [pauseCountdown]);

  const send = useCallback(
    async (id: string) => {
      pauseCountdown();
      const contact = selected.find((c) => c.id === id);
      if (!contact) return;
      if (!message.trim()) {
        showToast('Type your message first', 'error');
        return;
      }
      const waNumber = toWhatsAppNumber(contact.phone, COUNTRY_CODE);
      if (!waNumber) {
        showToast(`${contact.name}'s number doesn't look valid`, 'error');
        return;
      }

      awaitingReturn.current = { id, leftApp: false };
      setPendingId(id);
      const result = await sendViaWhatsApp(waNumber, personalize(message, contact.firstName));
      if (result === 'failed') {
        awaitingReturn.current = null;
        setPendingId(null);
        showToast('Could not open WhatsApp. Is it installed?', 'error');
      }
    },
    [message, pauseCountdown, selected, showToast],
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const openNow = useCallback(() => {
    const target = countdown?.id;
    pauseCountdown();
    if (target) send(target);
  }, [countdown, pauseCountdown, send]);

  const setAutoNext = useCallback(
    (on: boolean) => {
      setAutoNextState(on);
      if (!on) pauseCountdown();
    },
    [pauseCountdown],
  );

  const reuse = useCallback((entry: HistoryEntry) => {
    pauseCountdown();
    setMessage(entry.message);
    setSelected(entry.recipients.map(({ id, name, firstName, phone, thumbnail }) => ({ id, name, firstName, phone, thumbnail })));
    setSentIds([]);
  }, [pauseCountdown]);

  const updateGroups = useCallback((fn: (prev: ContactGroup[]) => ContactGroup[]) => {
    setGroups((prev) => {
      const next = fn(prev);
      save(GROUPS_KEY, next);
      return next;
    });
  }, []);

  const saveGroup: Store['saveGroup'] = useCallback(
    ({ id, name, contacts }) => {
      const group: ContactGroup = {
        id: id ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: name.trim() || 'Untitled group',
        contacts,
        updatedAt: Date.now(),
      };
      updateGroups((prev) => [group, ...prev.filter((g) => g.id !== group.id)]);
      return group;
    },
    [updateGroups],
  );

  const deleteGroup = useCallback((id: string) => updateGroups((prev) => prev.filter((g) => g.id !== id)), [updateGroups]);

  const applyGroup = useCallback((group: ContactGroup) => {
    pauseCountdown();
    awaitingReturn.current = null;
    setPendingId(null);
    setSelected(group.contacts);
    setSentIds([]);
  }, [pauseCountdown]);

  const deleteHistoryEntry = useCallback(
    (id: string) => updateHistory((prev) => prev.filter((h) => h.id !== id)),
    [updateHistory],
  );

  const value = useMemo<Store>(
    () => ({
      hydrated,
      message,
      selected,
      sentIds,
      pendingId,
      allSent,
      history,
      groups,
      toast,
      setMessage,
      select,
      unselect,
      clearSelection,
      startNew,
      send,
      reuse,
      deleteHistoryEntry,
      saveGroup,
      deleteGroup,
      applyGroup,
      autoNext,
      countdown,
      setAutoNext,
      pauseCountdown,
      openNow,
      showToast,
    }),
    [
      hydrated, message, selected, sentIds, pendingId, allSent, history, toast, select, unselect, clearSelection,
      startNew, send, reuse, deleteHistoryEntry, groups, saveGroup, deleteGroup, applyGroup, autoNext, countdown,
      setAutoNext, pauseCountdown, openNow, showToast,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
