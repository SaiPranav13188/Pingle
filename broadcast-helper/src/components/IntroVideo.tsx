import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { colors, fonts } from '../theme';

const intro = require('../../assets/video/intro.mp4');
/** Safety net in case the video never reports playToEnd (e.g. decoder hiccup). */
const MAX_DURATION_MS = 6500;

/** Full-screen animated intro played when the app launches. Tap anywhere or "Skip" to dismiss. */
export function IntroVideo({ onDone }: { onDone: () => void }) {
  const done = useRef(false);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  const player = useVideoPlayer(intro, (p) => {
    p.muted = false; // plays the "Welcome to Pingle" voice
    p.volume = 1;
    p.loop = false;
    p.play();
  });

  useEventListener(player, 'playToEnd', finish);

  useEffect(() => {
    const timer = setTimeout(finish, MAX_DURATION_MS);
    // If the app is sent to the background (e.g. a notification opened WhatsApp), skip the intro.
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && finish());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [finish]);

  return (
    <Animated.View style={styles.root} exiting={FadeOut.duration(450)}>
      <Pressable style={StyleSheet.absoluteFill} onPress={finish}>
        <VideoView style={StyleSheet.absoluteFill} player={player} nativeControls={false} contentFit="cover" />
      </Pressable>
      <Animated.View entering={FadeIn.delay(600)} style={styles.skipWrap}>
        <Pressable onPress={finish} style={styles.skip} hitSlop={12}>
          <Text style={styles.skipText}>SKIP ›</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, zIndex: 100 },
  skipWrap: { position: 'absolute', right: 20, top: 56 },
  skip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.5)',
    backgroundColor: 'rgba(5,6,15,0.5)',
  },
  skipText: { color: colors.cyan, fontFamily: fonts.displayMedium, fontSize: 12, letterSpacing: 2 },
});
