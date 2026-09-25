import React, { useEffect } from 'react';
import { ImageBackground, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '../theme';

const nebula = require('../../assets/images/nebula.jpg');

function Orb({ color, size, x, y, duration }: { color: string; size: number; x: number; y: number; duration: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [duration, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * 40 - 20 }, { translateY: t.value * -60 + 30 }, { scale: 0.9 + t.value * 0.2 }],
    opacity: 0.55 + t.value * 0.3,
  }));
  const id = `orb${color.replace('#', '')}`;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y, width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Ambient animated background shared by every screen. */
export function Backdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground source={nebula} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <Orb color={colors.violet} size={360} x={-120} y={40} duration={9000} />
      <Orb color={colors.cyan} size={320} x={180} y={320} duration={11000} />
      <Orb color={colors.magenta} size={300} x={-60} y={620} duration={13000} />
    </View>
  );
}

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  /** Pinned content below the scroll area (e.g. primary action). */
  footer?: React.ReactNode;
  edges?: ('top' | 'bottom')[];
};

export function Screen({ children, scroll = true, contentStyle, footer, edges = ['top'] }: Props) {
  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={styles.flex} edges={edges}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
        {footer}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 140 },
});
