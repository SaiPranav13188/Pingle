import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SlideInDown,
  SlideOutDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import type { SelectedContact } from '../lib/types';
import type { Countdown } from '../state/AppStore';
import { colors, fonts, gradients, radius } from '../theme';
import { Avatar, NeonButton, tapHaptic } from './ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** "7 of 20 sent" with a filling bar, plus the Auto-next on/off switch. */
export function ProgressStrip({
  sent,
  total,
  autoNext,
  onToggleAutoNext,
}: {
  sent: number;
  total: number;
  autoNext: boolean;
  onToggleAutoNext: () => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fill = useSharedValue(0);
  const done = total > 0 && sent === total;

  useEffect(() => {
    fill.value = withTiming(total ? (sent / total) * trackWidth : 0, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [fill, sent, total, trackWidth]);

  const fillStyle = useAnimatedStyle(() => ({ width: fill.value }));

  return (
    <View style={styles.strip}>
      <View style={styles.stripRow}>
        <Text style={styles.stripText}>
          <Text style={[styles.stripNum, done && { color: colors.green }]}>{sent}</Text> of{' '}
          <Text style={styles.stripNum}>{total}</Text> sent
        </Text>
        <Pressable
          onPress={() => {
            tapHaptic();
            onToggleAutoNext();
          }}
          hitSlop={8}
          style={[styles.toggle, autoNext && styles.toggleOn]}
          accessibilityRole="switch"
          accessibilityState={{ checked: autoNext }}
          accessibilityLabel="Auto-next"
        >
          <Ionicons name="flash" size={13} color={autoNext ? '#05060F' : colors.textDim} />
          <Text style={[styles.toggleText, autoNext && { color: '#05060F' }]}>Auto-next {autoNext ? 'on' : 'off'}</Text>
        </Pressable>
      </View>
      <View style={styles.track} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.fill, fillStyle]}>
          <LinearGradient
            colors={done ? gradients.whatsapp : gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const RING = 58;
const STROKE = 5;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

/** Card shown after coming back from WhatsApp: counts down, then opens the next chat. */
export function AutoNextCard({
  countdown,
  contact,
  onPause,
  onOpenNow,
}: {
  countdown: Countdown;
  contact: SelectedContact;
  onPause: () => void;
  onOpenNow: () => void;
}) {
  // The parent re-creates this card (key = endsAt) for every countdown, so these run once per countdown.
  const [totalMs] = useState(() => Math.max(1, countdown.endsAt - Date.now()));
  const [secondsLeft, setSecondsLeft] = useState(() => Math.ceil(totalMs / 1000));
  const progress = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(0, { duration: totalMs, easing: Easing.linear });
    const tick = setInterval(() => setSecondsLeft(Math.max(1, Math.ceil((countdown.endsAt - Date.now()) / 1000))), 200);
    return () => clearInterval(tick);
  }, [countdown.endsAt, progress, totalMs]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - progress.value) }));
  const who = contact.firstName ?? contact.name;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.duration(200)}
      style={styles.cardWrap}
      pointerEvents="box-none"
    >
      <Pressable onPress={onPause} style={styles.card} accessibilityLabel={`Opening ${who}. Tap to pause`}>
        <View style={styles.ring}>
          <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
            <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(255,255,255,0.1)" strokeWidth={STROKE} fill="none" />
            <AnimatedCircle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              stroke={colors.green}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${CIRC} ${CIRC}`}
              animatedProps={ringProps}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </Svg>
          <Text style={styles.ringNum}>{secondsLeft}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.whoRow}>
            <Avatar name={contact.name} uri={contact.thumbnail} size={22} />
            <Text style={styles.cardTitle} numberOfLines={1}>
              Opening {who} in {secondsLeft}…
            </Text>
          </View>
          <Text style={styles.cardSub}>Auto-next · tap to pause</Text>
        </View>
      </Pressable>
      <View style={styles.cardActions}>
        <NeonButton label="Pause" icon="pause" variant="ghost" compact onPress={onPause} style={{ flex: 1 }} />
        <NeonButton
          label="Open now"
          icon="logo-whatsapp"
          variant="whatsapp"
          compact
          onPress={onOpenNow}
          style={{ flex: 1.3 }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  strip: { marginHorizontal: 16, marginBottom: 10 },
  stripRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  stripText: { fontFamily: fonts.body, fontSize: 14, color: colors.textDim },
  stripNum: { fontFamily: fonts.number, fontSize: 15, color: colors.text },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOn: { backgroundColor: colors.green, borderColor: colors.green },
  toggleText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textDim },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, overflow: 'hidden' },
  cardWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 30,
    elevation: 30,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.55)',
    backgroundColor: 'rgba(11,13,34,0.98)',
  },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringNum: { fontFamily: fonts.number, fontSize: 22, color: colors.text },
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  cardSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textDim, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
