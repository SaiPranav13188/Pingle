import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';
import { AvatarStack, NeonButton, PressableScale } from '../components/ui';
import type { ContactGroup } from '../lib/types';
import { useStore } from '../state/AppStore';
import { colors, fonts, radius } from '../theme';

const ACCENTS = [colors.magenta, colors.cyan, colors.green, colors.violet];

export default function Groups() {
  const { groups, deleteGroup, applyGroup, showToast } = useStore();

  const use = (g: ContactGroup) => {
    applyGroup(g);
    showToast(`“${g.name}” selected · swipe each person to send`, 'success');
    router.back();
  };

  const remove = (g: ContactGroup) =>
    Alert.alert('Delete group?', `“${g.name}” will be removed. Your phone contacts are not affected.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteGroup(g.id);
          showToast('Group deleted', 'info');
        },
      },
    ]);

  const newGroup = () => router.push('/group-edit');

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.roundBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Groups</Text>
          <Text style={styles.subtitle}>Saved sets of contacts, ready to reuse.</Text>
        </View>
        <PressableScale onPress={newGroup} style={styles.roundBtn} accessibilityLabel="New group">
          <Ionicons name="add" size={24} color={colors.cyan} />
        </PressableScale>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            art={<Ionicons name="people-circle-outline" size={90} color={colors.magenta} />}
            title="No groups yet"
            text="Group people you message together — Family, Work Team, Building committee — and pick them in one tap."
            action={<NeonButton label="Create group" icon="people" onPress={newGroup} />}
          />
        }
        renderItem={({ item: g, index }) => {
          const accent = ACCENTS[index % ACCENTS.length];
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50)} layout={LinearTransition}>
              <PressableScale onPress={() => use(g)} style={[styles.card, { borderLeftColor: accent }]}>
                <View style={styles.top}>
                  <View style={[styles.icon, { backgroundColor: accent + '22' }]}>
                    <Ionicons name="people" size={20} color={accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={styles.count}>
                      {g.contacts.length} {g.contacts.length === 1 ? 'contact' : 'contacts'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push({ pathname: '/group-edit', params: { id: g.id } })}
                    hitSlop={8}
                    style={styles.smallBtn}
                    accessibilityLabel={`Edit ${g.name}`}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.text} />
                  </Pressable>
                  <Pressable onPress={() => remove(g)} hitSlop={8} style={styles.smallBtn} accessibilityLabel={`Delete ${g.name}`}>
                    <Ionicons name="trash-outline" size={18} color={colors.red} />
                  </Pressable>
                </View>
                <View style={styles.bottom}>
                  <AvatarStack people={g.contacts} max={6} size={30} />
                  <Text style={[styles.use, { color: accent }]}>
                    Select <Ionicons name="arrow-forward" size={13} color={accent} />
                  </Text>
                </View>
              </PressableScale>
            </Animated.View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 },
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
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: colors.border,
    backgroundColor: 'rgba(14,18,48,0.85)',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  count: { fontFamily: fonts.body, fontSize: 13, color: colors.textDim, marginTop: 2 },
  smallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  use: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
