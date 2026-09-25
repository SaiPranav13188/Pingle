import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, fonts } from '../theme';

export function EmptyState({ art, title, text, action }: { art: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.wrap}>
      {art}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {action ? <View style={{ marginTop: 22, alignSelf: 'stretch' }}>{action}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 12 },
  title: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.text, marginTop: 18, textAlign: 'center' },
  text: { fontFamily: fonts.body, fontSize: 15, color: colors.textDim, marginTop: 8, textAlign: 'center', lineHeight: 22 },
});
