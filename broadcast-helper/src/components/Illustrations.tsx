import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '../theme';

// ---------- motion helpers ----------

function Float({ children, amplitude = 8, duration = 2600, delay = 0 }: { children: React.ReactNode; amplitude?: number; duration?: number; delay?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [delay, duration, t]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: (t.value - 0.5) * amplitude * 2 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function Twinkle({ x, y, size = 10, color = '#fff', delay = 0 }: { x: number; y: number; size?: number; color?: string; delay?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.15, { duration: 900 })), -1, false));
  }, [delay, t]);
  const anim = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: 0.6 + t.value * 0.5 }, { rotate: '45deg' }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y }, anim]}>
      <Svg width={size} height={size} viewBox="0 0 10 10">
        <Path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

// ---------- shared glyph ----------

/** The app mark: chat bubble with broadcast waves (100x100 viewBox). */
export function BroadcastGlyph({ size = 64, color = colors.cyan, strokeWidth = 5 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={47} r={31} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path d="M31 70 L20 85 L44 77" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={50} cy={47} r={5} fill={color} />
      <Path d="M59 38 A13 13 0 0 1 59 56" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
      <Path d="M41 38 A13 13 0 0 0 41 56" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
      <Path d="M65 31 A22 22 0 0 1 65 63" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
      <Path d="M35 31 A22 22 0 0 0 35 63" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function ContactsArt({ size = 180 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Float>
        <Svg width={size} height={size} viewBox="0 0 180 180">
          <Rect x={40} y={24} width={100} height={132} rx={16} fill="#0D1030" stroke={colors.cyan} strokeWidth={3} />
          {[0, 1, 2].map((i) => (
            <G key={i}>
              <Circle cx={64} cy={56 + i * 34} r={10} fill={[colors.magenta, colors.green, colors.violet][i]} />
              <Rect x={82} y={50 + i * 34} width={42} height={6} rx={3} fill="#3A4278" />
              <Rect x={82} y={60 + i * 34} width={28} height={5} rx={2.5} fill="#262C58" />
            </G>
          ))}
          <Circle cx={138} cy={140} r={22} fill={colors.bg} stroke={colors.green} strokeWidth={3} />
          <Path d="M128 140 L135 147 L149 133" stroke={colors.green} strokeWidth={4} fill="none" strokeLinecap="round" />
        </Svg>
      </Float>
      <Twinkle x={size * 0.1} y={size * 0.15} color={colors.cyan} />
    </View>
  );
}
