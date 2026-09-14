/**
 * Flutter `SplashVideo` — full-screen intro.mp4, then walkthrough.
 *
 * Expo Go downloads assets from Metro. The original 18MB / 26Mbps file
 * fails to load over LAN (blank/red native splash). Use the compressed
 * 720p asset + expo-asset localUri.
 */
import { useEventListener } from 'expo';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const INTRO_MODULE = require('../../assets/video/intro.mp4');
const POSTER = require('../../assets/video/intro_poster.jpg');

function IntroPlayer({
  uri,
  onEnded,
}: {
  uri: string;
  onEnded: () => void;
}) {
  const endedRef = useRef(false);

  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = false;
    p.muted = false;
    p.audioMixingMode = 'auto';
  });

  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    try {
      player.pause();
    } catch {
      // ignore
    }
    onEnded();
  }, [onEnded, player]);

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'readyToPlay') {
      try {
        player.play();
      } catch {
        // ignore
      }
    }
    if (status === 'error') {
      console.warn('[splash-video] playback error', error);
      finish();
    }
  });

  useEventListener(player, 'playToEnd', () => {
    finish();
  });

  useEffect(() => {
    const kick = setTimeout(() => {
      try {
        player.play();
      } catch {
        // ignore
      }
    }, 150);
    // Hard cap so a hung player never blocks onboarding
    const max = setTimeout(() => finish(), 10000);
    return () => {
      clearTimeout(kick);
      clearTimeout(max);
    };
  }, [player, finish]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      playsInline
      {...(Platform.OS === 'android'
        ? { surfaceType: 'textureView' as const }
        : {})}
    />
  );
}

export default function SplashVideoScreen() {
  const navigated = useRef(false);
  const [uri, setUri] = useState<string | null>(null);

  function goWalkthrough() {
    if (navigated.current) return;
    navigated.current = true;
    router.replace('/(auth)/walkthrough');
  }

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const asset = Asset.fromModule(INTRO_MODULE);
        await asset.downloadAsync();
        const local =
          asset.localUri ?? asset.uri ?? null;
        if (!cancelled) {
          if (local) setUri(local);
          else goWalkthrough();
        }
      } catch (e) {
        console.warn('[splash-video] asset load failed', e);
        if (!cancelled) goWalkthrough();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  return (
    <View style={styles.root}>
      <Image source={POSTER} style={StyleSheet.absoluteFill} resizeMode="cover" />
      {uri ? <IntroPlayer uri={uri} onEnded={goWalkthrough} /> : null}
      <Pressable style={styles.skip} onPress={goWalkthrough} hitSlop={12}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  skip: {
    position: 'absolute',
    top: 56,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 2,
  },
  skipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
  },
});
