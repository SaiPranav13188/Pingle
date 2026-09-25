import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { EmptyState } from '../components/EmptyState';
import { BroadcastGlyph } from '../components/Illustrations';
import { Screen } from '../components/Screen';
import { Avatar, NeonButton, PressableScale } from '../components/ui';
import type { HistoryEntry } from '../lib/types';
import { useStore } from '../state/AppStore';
import { colors, fonts, radius } from '../theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  return `${((h + 11) % 12) + 1}:${d.getMinutes().toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Today, ${formatTime(ts)}`;
  if (d.toDateString() === new Date(today.getTime() - 86400000).toDateString()) return `Yesterday, ${formatTime(ts)}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${formatTime(ts)}`;
}

export default function History() {
  const { history, reuse, deleteHistoryEntry } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  const reuseEntry = (entry: HistoryEntry) => {
    reuse(entry);
    router.back();
  };

  const remove = (entry: HistoryEntry) =>
    Alert.alert('Delete from history?', 'This only removes the record from Pingle.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteHistoryEntry(entry.id) },
    ]);

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <Text style={styles.title}>History</Text>
        <View style={{ flex: 1 }} />
        <BroadcastGlyph size={24} strokeWidth={7} />
      </View>

      <FlatList
        data={history}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
        ListEmptyComponent={
          <EmptyState
            art={<Ionicons name="time-outline" size={72} color={colors.violet} />}
            title="Nothing sent yet"
            text="Every message you send is saved here, with everyone it went to."
          />
        }
        renderItem={({ item, index }) => (
          <HistoryCard
            entry={item}
            index={index}
            open={openId === item.id}
            onToggle={() => setOpenId((id) => (id === item.id ? null : item.id))}
            onReuse={() => reuseEntry(item)}
            onDelete={() => remove(item)}
          />
        )}
      />
    </Screen>
  );
}

function HistoryCard({
  entry,
  index,
  open,
  onToggle,
  onReuse,
  onDelete,
}: {
  entry: HistoryEntry;
  index: number;
  open: boolean;
  onToggle: () => void;
  onReuse: () => void;
  onDelete: () => void;
}) {
  const count = entry.recipients.length;
  // Most recently sent first
  const recipients = [...entry.recipients].sort((a, b) => b.sentAt - a.sentAt);

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50)} layout={LinearTransition.duration(220)} style={[styles.card, open && styles.cardOpen]}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={styles.date}>{formatDate(entry.date)}</Text>
        <Text style={styles.message} numberOfLines={open ? undefined : 3}>
          {entry.message}
        </Text>
        <View style={styles.summary}>
          <Ionicons name="people" size={15} color={colors.green} />
          <Text style={styles.sentTo}>
            Sent to {count} {count === 1 ? 'person' : 'people'}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.toggleText}>{open ? 'Hide' : 'See who'}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.cyan} />
        </View>
      </Pressable>

      {open && (
        <Animated.View entering={FadeIn.duration(200)}>
          <View style={styles.list}>
            {recipients.map((r, i) => (
              <View key={r.id} style={[styles.person, i > 0 && styles.divider]}>
                <Avatar name={r.name} uri={r.thumbnail} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={styles.personSub} numberOfLines={1}>
                    {r.phone}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Ionicons name="checkmark-done" size={16} color={colors.green} />
                  <Text style={styles.personSub}>{formatDate(r.sentAt)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <NeonButton label="Use again" icon="repeat" compact onPress={onReuse} style={{ flex: 1 }} />
            <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteBtn} accessibilityLabel="Delete">
              <Ionicons name="trash-outline" size={18} color={colors.red} />
            </Pressable>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 },
  backBtn: {
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
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14,18,48,0.85)',
  },
  cardOpen: { borderColor: 'rgba(0,240,255,0.5)' },
  date: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.cyan },
  message: { fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 22, marginTop: 8 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  sentTo: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.green },
  toggleText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.cyan },
  list: {
    marginTop: 14,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  personName: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  personSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textDim, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,77,109,0.4)',
  },
});
