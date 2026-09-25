import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { avatarGradient, colors, fonts, gradients, radius } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function tapHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

/** Pressable that springs down slightly when pressed. */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  disabled,
  haptic = true,
  hitSlop,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: boolean;
  hitSlop?: number;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  // The pressable itself carries `style`, so layout props like flex/margin apply to the
  // element the parent actually lays out (a wrapper View would collapse flex: 1 children).
  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => scale.set(withSpring(0.96, { damping: 15, stiffness: 300 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 12, stiffness: 250 }))}
      onPress={() => {
        if (haptic) tapHaptic();
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={[style, anim, disabled && { opacity: 0.45 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({
  children,
  style,
  glow,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: string;
}) {
  return (
    <LinearGradient
      colors={gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        // No Android elevation: its shadow shows through the translucent card as a dark box.
        glow && { borderColor: glow + '80', shadowColor: glow, shadowOpacity: 0.6, shadowRadius: 18 },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}

type ButtonVariant = 'primary' | 'whatsapp' | 'danger' | 'ghost';

export function NeonButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  style,
  compact,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const content = (
    <View style={[styles.btnInner, compact && styles.btnCompact]}>
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.cyan : '#05060F'} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={compact ? 16 : 20} color={variant === 'ghost' ? colors.cyan : '#05060F'} />}
          <Text style={[styles.btnText, compact && { fontSize: 14 }, variant === 'ghost' && { color: colors.cyan }]}>
            {label}
          </Text>
        </>
      )}
    </View>
  );

  const shadow =
    variant === 'ghost'
      ? null
      : {
          shadowColor: variant === 'whatsapp' ? colors.green : variant === 'danger' ? colors.red : colors.cyan,
          shadowOpacity: 0.7,
          shadowRadius: 16,
          elevation: 10,
        };

  return (
    <PressableScale onPress={onPress} disabled={disabled || loading} style={[styles.btn, shadow, style]}>
      {variant === 'ghost' ? (
        <View style={styles.btnGhost}>{content}</View>
      ) : (
        <LinearGradient
          colors={variant === 'whatsapp' ? gradients.whatsapp : variant === 'danger' ? gradients.danger : gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGradient}
        >
          {content}
        </LinearGradient>
      )}
    </PressableScale>
  );
}

export function Avatar({ name, uri, size = 44 }: { name: string; uri?: string | null; size?: number }) {
  const initials =
    name
      .split(/\s+/)
      .filter((w) => /[\p{L}\d]/u.test(w))
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '#';
  if (uri) {
    return (
      <View style={[styles.avatarRing, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}>
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      </View>
    );
  }
  return (
    <LinearGradient
      colors={avatarGradient(name)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#05060F', fontFamily: fonts.bodyBold, fontSize: size * 0.36 }}>{initials}</Text>
    </LinearGradient>
  );
}

/** Overlapping avatars, e.g. for a group card. */
export function AvatarStack({ people, max = 5, size = 28 }: { people: { name: string; thumbnail?: string | null }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.35, borderRadius: size, borderWidth: 2, borderColor: colors.bg }}>
          <Avatar name={p.name} uri={p.thumbnail} size={size} />
        </View>
      ))}
      {extra > 0 && (
        <View style={[styles.more, { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.35 }]}>
          <Text style={styles.moreText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

export function Pill({
  label,
  color = colors.cyan,
  icon,
  style,
  textStyle,
}: {
  label: string;
  color?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.pill, { borderColor: color + '66', backgroundColor: color + '1A' }, style]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={[styles.pillText, { color }, textStyle]}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  btn: { borderRadius: 999 },
  btnGradient: { borderRadius: 999 },
  btnGhost: { borderRadius: 999, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: 'rgba(0,240,255,0.06)' },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24 },
  btnCompact: { paddingVertical: 10, paddingHorizontal: 16, gap: 6 },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#05060F', letterSpacing: 0.3 },
  avatarRing: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.cyan },
  more: { backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  moreText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 11 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
