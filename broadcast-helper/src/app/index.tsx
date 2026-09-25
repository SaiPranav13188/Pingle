import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Keyboard, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { AppMenu } from '../components/AppMenu';
import { AutoNextCard, ProgressStrip } from '../components/AutoNext';
import { ContactRow, NumberPicker, SelectedRow } from '../components/ContactRows';
import { EmptyState } from '../components/EmptyState';
import { NamePrompt } from '../components/NamePrompt';
import { ExitPrompt } from '../components/ExitPrompt';
import { BroadcastGlyph, ContactsArt } from '../components/Illustrations';
import { Screen } from '../components/Screen';
import { NeonButton, PressableScale, tapHaptic } from '../components/ui';
import { LONG_MESSAGE_CHARS, NAME_TOKEN } from '../lib/message';
import type { DeviceContact, SelectedContact } from '../lib/types';
import { useStore } from '../state/AppStore';
import { useDeviceContacts } from '../state/useDeviceContacts';
import { colors, fonts, radius } from '../theme';

type Item =
  | { kind: 'heading'; key: string; label: string; action?: 'clear' }
  | { kind: 'selected'; key: string; contact: SelectedContact; order: number }
  | { kind: 'contact'; key: string; contact: DeviceContact };

function toSelected(c: DeviceContact, phone: string): SelectedContact {
  return { id: c.id, name: c.name, firstName: c.firstName, phone, thumbnail: c.thumbnail };
}

export default function Home() {
  const {
    message,
    setMessage,
    selected,
    sentIds,
    pendingId,
    allSent,
    history,
    groups,
    select,
    unselect,
    clearSelection,
    startNew,
    send,
    saveGroup,
    autoNext,
    setAutoNext,
    countdown,
    pauseCountdown,
    openNow,
    showToast,
  } = useStore();

  const { contacts: all, perm, retry } = useDeviceContacts();
  const [savingGroup, setSavingGroup] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [picker, setPicker] = useState<DeviceContact | null>(null);
  const selection = useRef({ start: message.length, end: message.length });
  const [confirmExit, setConfirmExit] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuOpenRef = useRef(false);
  const openMenu = (open: boolean) => {
    if (open) {
      Keyboard.dismiss();
      pauseCountdown();
    }
    menuOpenRef.current = open;
    setMenuOpen(open);
  };

  // Back on the main screen asks before leaving the app (only while this screen is showing).
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (menuOpenRef.current) {
          menuOpenRef.current = false;
          setMenuOpen(false);
        } else {
          pauseCountdown();
          setConfirmExit((open) => !open); // Back again while the prompt is open closes it
        }
        return true;
      });
      return () => sub.remove();
    }, [pauseCountdown]),
  );

  // Typing (message or search) pauses Auto-next, so a chat never opens mid-edit.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', pauseCountdown);
    return () => sub.remove();
  }, [pauseCountdown]);

  const sentCount = selected.filter((c) => sentIds.includes(c.id)).length;
  const countdownContact = countdown ? selected.find((c) => c.id === countdown.id) : undefined;

  /** Back to a blank page. Anything already sent is safe: it was saved to History when it was ticked. */
  const resetAll = () => {
    Keyboard.dismiss();
    setQuery('');
    startNew();
    showToast(sentCount > 0 ? 'Cleared. Sent messages are saved in History' : 'Cleared', 'info');
  };

  const insertName = () => {
    const { start, end } = selection.current;
    setMessage(message.slice(0, start) + NAME_TOKEN + message.slice(end));
    const pos = start + NAME_TOKEN.length;
    selection.current = { start: pos, end: pos };
  };

  const onContactPress = useCallback(
    (c: DeviceContact) => {
      tapHaptic();
      if (c.phones.length === 0) showToast(`${c.name} has no phone number`, 'error');
      else if (c.phones.length === 1) select(toSelected(c, c.phones[0].number));
      else setPicker(c);
    },
    [select, showToast],
  );

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const matches = (name: string, phones: string[]) =>
      !q || name.toLowerCase().includes(q) || (digits.length >= 3 && phones.some((p) => p.replace(/\D/g, '').includes(digits)));

    const selectedIds = new Set(selected.map((c) => c.id));
    const out: Item[] = [];
    const shownSelected = selected
      .map((c, i) => ({ c, order: i + 1 }))
      .filter(({ c }) => matches(c.name, [c.phone]));
    if (shownSelected.length) {
      out.push({ kind: 'heading', key: 'h-selected', label: `Selected · ${selected.length}`, action: 'clear' });
      shownSelected.forEach(({ c, order }) => out.push({ kind: 'selected', key: `s-${c.id}`, contact: c, order }));
    }
    const rest = all.filter((c) => !selectedIds.has(c.id) && matches(c.name, c.phones.map((p) => p.number)));
    if (rest.length) {
      out.push({ kind: 'heading', key: 'h-all', label: shownSelected.length ? 'All contacts' : `Contacts · ${rest.length}` });
      rest.forEach((c) => out.push({ kind: 'contact', key: `c-${c.id}`, contact: c }));
    }
    return out;
  }, [all, query, selected]);


  const renderItem = useCallback(
    ({ item }: { item: Item }) => {
      if (item.kind === 'heading') {
        return (
          <View style={styles.heading}>
            <Text style={styles.headingText}>{item.label}</Text>
            {item.action === 'clear' && (
              <View style={styles.headingActions}>
                <Pressable
                  onPress={() => {
                    pauseCountdown();
                    setSavingGroup(true);
                  }}
                  hitSlop={10}
                >
                  <Text style={styles.link}>Save group</Text>
                </Pressable>
                <Pressable onPress={clearSelection} hitSlop={10}>
                  <Text style={styles.link}>Clear</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      }
      if (item.kind === 'selected') {
        return (
          <SelectedRow
            contact={item.contact}
            order={item.order}
            sent={sentIds.includes(item.contact.id)}
            waiting={pendingId === item.contact.id}
            onSend={send}
            onRemove={unselect}
          />
        );
      }
      return <ContactRow contact={item.contact} onPress={onContactPress} />;
    },
    [clearSelection, onContactPress, pauseCountdown, send, pendingId, sentIds, unselect],
  );

  const isLong = message.length > LONG_MESSAGE_CHARS;

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <BroadcastGlyph size={26} strokeWidth={7} />
        <Text style={styles.brand}>PINGLE</Text>
        <View style={{ flex: 1 }} />
        <PressableScale onPress={() => openMenu(!menuOpen)} style={styles.menuBtn} accessibilityLabel="Menu">
          <Ionicons name={menuOpen ? 'close' : 'menu'} size={22} color={colors.text} />
        </PressableScale>
      </View>

      {selected.length > 0 && (
        <ProgressStrip sent={sentCount} total={selected.length} autoNext={autoNext} onToggleAutoNext={() => setAutoNext(!autoNext)} />
      )}

      {/* Top 30%: the message */}
      <Animated.View layout={LinearTransition.duration(220)} style={searchFocused ? styles.topCollapsed : styles.top}>
        {searchFocused ? (
          <Pressable
            style={styles.collapsed}
            onPress={() => {
              Keyboard.dismiss();
              setSearchFocused(false);
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.cyan} />
            <Text style={styles.collapsedText} numberOfLines={1}>
              {message.trim() || 'Tap to write your message'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.messageCard}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              onSelectionChange={(e) => (selection.current = e.nativeEvent.selection)}
              placeholder={'Type your message here…\n\nTip: {name} becomes each person’s first name.'}
              placeholderTextColor={colors.textFaint}
              multiline
              textAlignVertical="top"
              style={styles.input}
              selectionColor={colors.cyan}
            />
            <View style={styles.toolbar}>
              <PressableScale onPress={insertName} style={styles.tokenBtn}>
                <Ionicons name="person-add-outline" size={13} color="#05060F" />
                <Text style={styles.tokenText}>{NAME_TOKEN}</Text>
              </PressableScale>
              <PressableScale
                onPress={resetAll}
                disabled={!message && selected.length === 0}
                style={styles.deleteBtn}
                accessibilityLabel="Delete message and selected contacts"
              >
                <Ionicons name="trash-outline" size={13} color={colors.red} />
                <Text style={styles.deleteText}>Delete</Text>
              </PressableScale>
              <View style={{ flex: 1 }} />
              <Text style={[styles.count, isLong && { color: colors.amber }]}>{message.length} chars</Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Bottom 70%: contacts */}
      <Animated.View layout={LinearTransition.duration(220)} style={styles.bottom}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.cyan} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search contacts"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
            selectionColor={colors.cyan}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </Pressable>
          ) : null}
        </View>

        {perm === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.cyan} size="large" />
            <Text style={styles.dim}>Loading contacts…</Text>
          </View>
        )}

        {perm === 'denied' && (
          <EmptyState
            art={<ContactsArt size={120} />}
            title="Contacts access needed"
            text="Allow access to pick who gets your message. Contacts never leave your phone."
            action={
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <NeonButton label="Allow" icon="refresh" compact onPress={retry} style={{ flex: 1 }} />
                <NeonButton label="Settings" icon="settings-outline" variant="ghost" compact onPress={() => Linking.openSettings()} style={{ flex: 1 }} />
              </View>
            }
          />
        )}

        {allSent && (
          <Animated.View entering={FadeInDown} style={styles.doneBanner}>
            <Ionicons name="checkmark-done-circle" size={26} color={colors.green} />
            <View style={{ flex: 1 }}>
              <Text style={styles.doneTitle}>All sent!</Text>
              <Text style={styles.dim}>Saved to History</Text>
            </View>
            <NeonButton label="New message" icon="add" variant="whatsapp" compact onPress={startNew} />
          </Animated.View>
        )}

        {perm === 'granted' && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ flex: 1 }}>
            <FlatList
              data={items}
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              initialNumToRender={12}
              windowSize={9}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16 }}
              ListEmptyComponent={
                <Text style={[styles.dim, { textAlign: 'center', marginTop: 30 }]}>
                  {query ? `No contacts match “${query}”.` : 'No contacts on this phone.'}
                </Text>
              }
            />
          </Animated.View>
        )}
      </Animated.View>

      {countdown && countdownContact && (
        <AutoNextCard key={countdown.endsAt} countdown={countdown} contact={countdownContact} onPause={pauseCountdown} onOpenNow={openNow} />
      )}

      <AppMenu
        visible={menuOpen}
        top={52}
        onClose={() => openMenu(false)}
        items={[
          { key: 'groups', label: 'Groups', icon: 'people-outline', badge: groups.length, onPress: () => router.push('/groups') },
          { key: 'history', label: 'History', icon: 'time-outline', badge: history.length, onPress: () => router.push('/history') },
        ]}
      />

      <NamePrompt
        visible={savingGroup}
        title="Save these contacts as a group"
        placeholder="e.g. Family, Work Team"
        onCancel={() => setSavingGroup(false)}
        onConfirm={(name) => {
          saveGroup({ name, contacts: selected });
          setSavingGroup(false);
          showToast(`Group “${name}” saved`, 'success');
        }}
      />

      <ExitPrompt
        visible={confirmExit}
        onCancel={() => setConfirmExit(false)}
        onConfirm={() => {
          setConfirmExit(false);
          BackHandler.exitApp();
        }}
      />

      <NumberPicker
        contact={picker}
        onClose={() => setPicker(null)}
        onPick={(phone) => {
          if (picker) select(toSelected(picker, phone));
          setPicker(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  brand: { fontFamily: fonts.display, fontSize: 18, color: colors.text, letterSpacing: 3 },
  top: { flex: 3 },
  bottom: { flex: 7 },
  topCollapsed: { height: 52 },
  messageCard: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.5)',
    backgroundColor: 'rgba(14,18,48,0.85)',
    overflow: 'hidden',
  },
  input: { flex: 1, padding: 16, color: colors.text, fontFamily: fonts.body, fontSize: 17, lineHeight: 24 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tokenBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.cyan, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,77,109,0.55)',
    backgroundColor: 'rgba(255,77,109,0.1)',
  },
  deleteText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.red },
  tokenText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#05060F' },
  count: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textDim },
  collapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14,18,48,0.85)',
  },
  collapsedText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textDim },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(0,240,255,0.05)',
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16, paddingVertical: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headingText: { fontFamily: fonts.displayMedium, fontSize: 11, color: colors.textDim, letterSpacing: 2, textTransform: 'uppercase' },
  headingActions: { flexDirection: 'row', gap: 18 },
  link: { fontFamily: fonts.bodyBold, color: colors.cyan, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  dim: { fontFamily: fonts.body, color: colors.textDim, fontSize: 14 },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  doneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 6,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.5)',
    backgroundColor: 'rgba(37,211,102,0.08)',
  },
  doneTitle: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 16 },
});
