import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContactRow, NumberPicker } from '../components/ContactRows';
import { EmptyState } from '../components/EmptyState';
import { ContactsArt } from '../components/Illustrations';
import { NamePrompt } from '../components/NamePrompt';
import { Screen } from '../components/Screen';
import { NeonButton, PressableScale, tapHaptic } from '../components/ui';
import type { DeviceContact, SelectedContact } from '../lib/types';
import { useStore } from '../state/AppStore';
import { useDeviceContacts } from '../state/useDeviceContacts';
import { colors, fonts, gradients, radius } from '../theme';

const toMember = (c: DeviceContact, phone: string): SelectedContact => ({
  id: c.id,
  name: c.name,
  firstName: c.firstName,
  phone,
  thumbnail: c.thumbnail,
});

/** Create a new group, or edit one (`?id=`): tick the members, then save with a name. */
export default function GroupEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { groups, saveGroup, showToast } = useStore();
  const editing = id ? groups.find((g) => g.id === id) : undefined;
  const { contacts, perm, retry } = useDeviceContacts();
  const insets = useSafeAreaInsets();

  const [members, setMembers] = useState<Map<string, SelectedContact>>(
    () => new Map((editing?.contacts ?? []).map((c) => [c.id, c])),
  );
  const [query, setQuery] = useState('');
  const [picker, setPicker] = useState<DeviceContact | null>(null);
  const [naming, setNaming] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    const digits = q.replace(/\D/g, '');
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phones.some((p) => p.number.replace(/\D/g, '').includes(digits))),
    );
  }, [contacts, query]);

  const toggle = useCallback(
    (c: DeviceContact) => {
      tapHaptic();
      if (members.has(c.id)) {
        setMembers((prev) => {
          const next = new Map(prev);
          next.delete(c.id);
          return next;
        });
      } else if (c.phones.length === 0) {
        showToast(`${c.name} has no phone number`, 'error');
      } else if (c.phones.length === 1) {
        setMembers((prev) => new Map(prev).set(c.id, toMember(c, c.phones[0].number)));
      } else {
        setPicker(c);
      }
    },
    [members, showToast],
  );

  const count = members.size;

  const renderItem = useCallback(
    ({ item }: { item: DeviceContact }) => {
      const member = members.get(item.id);
      return <ContactRow contact={item} onPress={toggle} checked={!!member} subtitle={member?.phone} />;
    },
    [members, toggle],
  );

  return (
    <Screen scroll={false} edges={['top']}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.roundBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{editing ? 'Edit group' : 'New group'}</Text>
          <Text style={styles.subtitle}>{editing ? editing.name : 'Tick the people to include.'}</Text>
        </View>
      </View>

      {perm === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.cyan} size="large" />
          <Text style={styles.dim}>Loading contacts…</Text>
        </View>
      )}

      {perm === 'denied' && (
        <EmptyState
          art={<ContactsArt size={140} />}
          title="Contacts access needed"
          text="Allow access to choose who is in this group."
          action={
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <NeonButton label="Allow" icon="refresh" compact onPress={retry} style={{ flex: 1 }} />
              <NeonButton label="Settings" icon="settings-outline" variant="ghost" compact onPress={() => Linking.openSettings()} style={{ flex: 1 }} />
            </View>
          }
        />
      )}

      {perm === 'granted' && (
        <>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.cyan} />
            <TextInput
              value={query}
              onChangeText={setQuery}
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

          <View style={styles.selBar}>
            <Animated.View key={count} entering={ZoomIn.springify()}>
              <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.countPill}>
                <Text style={styles.countText}>
                  {count} {count === 1 ? 'contact' : 'contacts'} selected
                </Text>
              </LinearGradient>
            </Animated.View>
            {count > 0 && (
              <Pressable onPress={() => setMembers(new Map())} hitSlop={8}>
                <Text style={styles.link}>Clear</Text>
              </Pressable>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(c) => c.id}
            renderItem={renderItem}
            extraData={members}
            initialNumToRender={14}
            windowSize={9}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 16 }}
            ListEmptyComponent={<Text style={[styles.dim, { textAlign: 'center', marginTop: 30 }]}>No contacts match “{query}”.</Text>}
          />

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <NeonButton
              label={editing ? 'Save group' : 'Create group'}
              icon="people"
              disabled={count === 0}
              onPress={() => setNaming(true)}
            />
          </View>
        </>
      )}

      <NumberPicker
        contact={picker}
        onClose={() => setPicker(null)}
        onPick={(phone) => {
          if (picker) setMembers((prev) => new Map(prev).set(picker.id, toMember(picker, phone)));
          setPicker(null);
        }}
      />

      <NamePrompt
        visible={naming}
        title={editing ? 'Save group' : 'Name this group'}
        initial={editing?.name}
        placeholder="e.g. Family, Work Team"
        onCancel={() => setNaming(false)}
        onConfirm={(name) => {
          saveGroup({ id: editing?.id, name, contacts: [...members.values()] });
          setNaming(false);
          showToast(`Group “${name}” saved`, 'success');
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, letterSpacing: 1 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textDim, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  dim: { fontFamily: fonts.body, color: colors.textDim, fontSize: 14 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(0,240,255,0.05)',
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16, paddingVertical: 10 },
  selBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginVertical: 12 },
  countPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  countText: { fontFamily: fonts.bodyBold, color: '#05060F', fontSize: 13 },
  link: { fontFamily: fonts.bodyBold, color: colors.cyan, fontSize: 14 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(5,6,15,0.94)',
  },
});
