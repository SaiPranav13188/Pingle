import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useEffect } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import type { DeviceContact, SelectedContact } from '../lib/types';
import { colors, fonts, gradients } from '../theme';
import { Avatar, GlassCard, PressableScale, tapHaptic } from './ui';

export const ROW_HEIGHT = 72;
/** Fraction of the row width you must drag before releasing triggers a send. */
const SEND_THRESHOLD = 0.35;

/** Pulsing "›››" that hints the row can be swiped. */
function SwipeHint() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 700 })), -1);
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + t.value * 0.55, transform: [{ translateX: t.value * 6 }] }));
  return (
    <Animated.View style={[{ flexDirection: 'row' }, style]}>
      <Ionicons name="chevron-forward" size={14} color={colors.green} />
      <Ionicons name="chevron-forward" size={14} color={colors.green} style={{ marginLeft: -8 }} />
      <Ionicons name="chevron-forward" size={14} color={colors.green} style={{ marginLeft: -8 }} />
    </Animated.View>
  );
}

/** A selected contact: swipe right to open their WhatsApp chat with the message. */
export const SelectedRow = memo(function SelectedRow({
  contact,
  order,
  sent,
  waiting,
  onSend,
  onRemove,
}: {
  contact: SelectedContact;
  order: number;
  sent: boolean;
  waiting: boolean;
  onSend: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const tx = useSharedValue(0);
  const width = useSharedValue(360);
  const armed = useSharedValue(false);

  const pan = Gesture.Pan()
    .activeOffsetX(12)
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      tx.value = Math.max(0, e.translationX);
      const nowArmed = tx.value > width.value * SEND_THRESHOLD;
      if (nowArmed !== armed.value) {
        armed.value = nowArmed;
        scheduleOnRN(tapHaptic);
      }
    })
    .onEnd(() => {
      if (armed.value) {
        scheduleOnRN(onSend, contact.id);
        tx.value = withSequence(withTiming(width.value, { duration: 160 }), withTiming(width.value, { duration: 250 }), withSpring(0, { damping: 16 }));
      } else {
        tx.value = withSpring(0, { damping: 16 });
      }
      armed.value = false;
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const revealStyle = useAnimatedStyle(() => {
    const p = Math.min(1, tx.value / (width.value * SEND_THRESHOLD));
    return { opacity: interpolate(p, [0, 0.2, 1], [0, 0.7, 1]), transform: [{ scale: 0.8 + p * 0.2 }] };
  });

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.selectedWrap} onLayout={(e) => (width.value = e.nativeEvent.layout.width)}>
      {/* Revealed behind the row while dragging */}
      <LinearGradient colors={gradients.whatsapp} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.reveal}>
        <Animated.View style={[styles.revealInner, revealStyle]}>
          <Ionicons name="logo-whatsapp" size={24} color="#05060F" />
          <Text style={styles.revealText}>Send</Text>
        </Animated.View>
      </LinearGradient>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.selectedRow, sent && styles.sentRow, rowStyle]}>
          <View style={[styles.badge, sent && styles.badgeSent]}>
            {sent ? <Ionicons name="checkmark" size={16} color="#05060F" /> : <Text style={styles.badgeText}>{order}</Text>}
          </View>
          <Avatar name={contact.name} uri={contact.thumbnail} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {contact.name}
            </Text>
            {waiting ? (
              <Text style={[styles.sub, { color: colors.green }]}>Tap Send, then press Back</Text>
            ) : sent ? (
              <Text style={[styles.sub, { color: colors.green }]}>Sent ✓</Text>
            ) : (
              <View style={styles.hintRow}>
                <Text style={[styles.sub, { color: colors.textDim }]}>Swipe to send</Text>
                <SwipeHint />
              </View>
            )}
          </View>
          {waiting ? (
            <ActivityIndicator color={colors.green} />
          ) : (
            <Pressable onPress={() => onRemove(contact.id)} hitSlop={10} accessibilityLabel={`Remove ${contact.name}`}>
              <Ionicons name="close-circle" size={22} color={colors.textFaint} />
            </Pressable>
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

/** A contact in the list: tap to add (or, with `checked`, to toggle). */
export const ContactRow = memo(function ContactRow({
  contact,
  onPress,
  checked = false,
  subtitle: subtitleOverride,
}: {
  contact: DeviceContact;
  onPress: (c: DeviceContact) => void;
  checked?: boolean;
  /** Shown instead of the default number line (e.g. the number chosen for a group). */
  subtitle?: string;
}) {
  const noPhone = contact.phones.length === 0;
  const subtitle = subtitleOverride ?? (noPhone
    ? 'No phone number'
    : contact.phones.length > 1
      ? `${contact.phones.length} numbers · tap to choose`
      : contact.phones[0].number);
  return (
    <Pressable onPress={() => onPress(contact)} style={[styles.row, checked && styles.rowChecked]} android_ripple={{ color: 'rgba(0,240,255,0.12)' }}>
      <View style={{ opacity: noPhone ? 0.4 : 1 }}>
        <Avatar name={contact.name} uri={contact.thumbnail} size={40} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, noPhone && { color: colors.textFaint }]} numberOfLines={1}>
          {contact.name}
        </Text>
        <Text style={[styles.sub, noPhone && { color: colors.amber }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.check, checked && styles.checkOn]}>
        {checked && <Ionicons name="checkmark" size={18} color="#05060F" />}
      </View>
    </Pressable>
  );
});

/** Bottom sheet for contacts with more than one number. */
export function NumberPicker({ contact, onClose, onPick }: { contact: DeviceContact | null; onClose: () => void; onPick: (phone: string) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!contact} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn} style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {contact && (
          <Animated.View entering={SlideInDown.springify().damping(18)} style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={contact.name} uri={contact.thumbnail} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{contact.name}</Text>
                <Text style={styles.sub}>Which number uses WhatsApp?</Text>
              </View>
            </View>
            <View style={{ marginTop: 16, gap: 10 }}>
              {contact.phones.map((p) => (
                <PressableScale key={p.number} onPress={() => onPick(p.number)}>
                  <GlassCard style={styles.phoneOption}>
                    <Ionicons name="call-outline" size={18} color={colors.cyan} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{p.number}</Text>
                      <Text style={styles.sub}>{p.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                  </GlassCard>
                </PressableScale>
              ))}
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  selectedWrap: { height: ROW_HEIGHT, marginHorizontal: 12, marginBottom: 8, borderRadius: 18, overflow: 'hidden' },
  reveal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, justifyContent: 'center', paddingLeft: 22 },
  revealInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revealText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#05060F' },
  selectedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.45)',
    backgroundColor: '#0E1430',
  },
  sentRow: { backgroundColor: '#0B1A1A', borderColor: 'rgba(37,211,102,0.25)' },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.cyan,
  },
  badgeSent: { backgroundColor: colors.green, borderColor: colors.green },
  badgeText: { fontFamily: fonts.number, fontSize: 13, color: colors.cyan },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 },
  name: { fontFamily: fonts.bodyMedium, color: colors.text, fontSize: 16 },
  sub: { fontFamily: fonts.body, color: colors.textDim, fontSize: 13, marginTop: 2 },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.textFaint, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  rowChecked: { backgroundColor: 'rgba(0,240,255,0.06)' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(2,3,10,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.textFaint, marginBottom: 16 },
  sheetTitle: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.text },
  phoneOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
});
