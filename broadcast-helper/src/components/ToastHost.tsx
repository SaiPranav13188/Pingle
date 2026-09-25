import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast, useStore } from '../state/AppStore';
import { colors, fonts } from '../theme';

const toneStyle = {
  success: { color: colors.green, icon: 'checkmark-circle' },
  error: { color: colors.red, icon: 'alert-circle' },
  info: { color: colors.cyan, icon: 'information-circle' },
} as const;

export function ToastHost() {
  const { toast } = useStore();
  const insets = useSafeAreaInsets();
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setDismissedId(toast.id), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const visible: Toast | null = toast && toast.id !== dismissedId ? toast : null;
  if (!visible) return null;
  const tone = toneStyle[visible.tone];
  return (
    <Animated.View
      key={visible.id}
      entering={FadeInUp.springify().damping(16)}
      exiting={FadeOutUp}
      pointerEvents="none"
      style={[styles.toast, { top: insets.top + 10, borderColor: tone.color + '88', shadowColor: tone.color }]}
    >
      <Ionicons name={tone.icon} size={22} color={tone.color} />
      <Text style={styles.text}>{visible.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(11,13,34,0.96)',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  text: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 },
});
