import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { colors, fonts, radius } from '../theme';
import { NeonButton } from './ui';

/**
 * Centered "name this group" prompt. An in-screen overlay rather than a <Modal> so the tap on
 * Save/Cancel can't fall through to the contact list (see ExitPrompt). Back closes it.
 */
export function NamePrompt({
  visible,
  title,
  initial = '',
  placeholder,
  confirmLabel = 'Save',
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  initial?: string;
  placeholder?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  if (!visible) return null;
  return (
    <PromptBody
      title={title}
      initial={initial}
      placeholder={placeholder}
      confirmLabel={confirmLabel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function PromptBody({
  title,
  initial,
  placeholder,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  initial: string;
  placeholder?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [onCancel]);

  const submit = () => value.trim() && onConfirm(value.trim());

  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          style={styles.input}
          selectionColor={colors.cyan}
          maxLength={40}
        />
        <View style={styles.row}>
          <NeonButton label="Cancel" variant="ghost" compact onPress={onCancel} style={{ flex: 1 }} />
          <NeonButton label={confirmLabel} compact disabled={!value.trim()} onPress={submit} style={{ flex: 1 }} />
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
    zIndex: 60,
    elevation: 60,
    backgroundColor: 'rgba(2,3,10,0.78)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    padding: 22,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.45)',
    backgroundColor: colors.bgElevated,
  },
  title: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.text },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 20 },
});
