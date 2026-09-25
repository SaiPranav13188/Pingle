import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut } from 'react-native-reanimated';

import { colors, fonts, radius } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type MenuItem = { key: string; label: string; icon: IconName; badge?: number; onPress: () => void };

/**
 * Dropdown opened from the ☰ button in the top-right corner. Drawn as an in-screen overlay
 * (not a <Modal>) so a tap can't fall through to the contact list underneath.
 */
export function AppMenu({ visible, top, items, onClose }: { visible: boolean; top: number; items: MenuItem[]; onClose: () => void }) {
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)} style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      <Animated.View entering={FadeInUp.duration(180)} style={[styles.menu, { top }]}>
        {items.map((item, i) => (
          <Pressable
            key={item.key}
            onPress={() => {
              onClose();
              item.onPress();
            }}
            android_ripple={{ color: 'rgba(0,240,255,0.15)' }}
            style={[styles.item, i > 0 && styles.divider]}
            accessibilityRole="menuitem"
          >
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={20} color={colors.cyan} />
            </View>
            <Text style={styles.label}>{item.label}</Text>
            {item.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        ))}
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
    zIndex: 40,
    elevation: 40,
    backgroundColor: 'rgba(2,3,10,0.45)',
  },
  menu: {
    position: 'absolute',
    right: 16,
    minWidth: 210,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.45)',
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,240,255,0.1)',
  },
  label: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green },
  badgeText: { fontFamily: fonts.number, fontSize: 12, color: '#05060F' },
});
