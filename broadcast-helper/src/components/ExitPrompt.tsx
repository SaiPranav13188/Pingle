import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { colors, fonts, radius } from '../theme';
import { NeonButton } from './ui';

/**
 * Centered "leave the app?" confirmation shown when Back is pressed on the main screen.
 * Rendered as an in-screen overlay rather than a <Modal>: on Android, closing a Modal from a
 * button press let the tap fall through and select the contact underneath.
 */
export function ExitPrompt({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="exit-outline" size={28} color={colors.cyan} />
        </View>
        <Text style={styles.title}>Do you want to leave the app?</Text>
        <View style={styles.row}>
          <NeonButton label="Cancel" variant="ghost" compact onPress={onCancel} style={{ flex: 1 }} />
          <NeonButton label="Yes" variant="danger" compact onPress={onConfirm} style={{ flex: 1 }} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 50,
    backgroundColor: 'rgba(2,3,10,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: 24,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.45)',
    backgroundColor: colors.bgElevated,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,240,255,0.1)',
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text, textAlign: 'center', marginTop: 16 },
  row: { flexDirection: 'row', gap: 12, marginTop: 22, alignSelf: 'stretch' },
});
