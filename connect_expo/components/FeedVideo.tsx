import { MediaEditsOverlay } from '@/components/MediaEditsOverlay';
import type { MediaEdits } from '@/store/mediaViewerStore';
import { useMediaOverlayStore } from '@/store/mediaViewerStore';
import { useVideoPlayer, VideoView } from 'expo-video';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

type Props = {
  uri?: string;
  isActive: boolean;
  edits?: MediaEdits | null;
  paused?: boolean;
  onTogglePause?: () => void;
};

export function FeedVideo({
  uri,
  isActive,
  edits,
  paused = false,
  onTogglePause,
}: Props) {
  const cached = useMediaOverlayStore((s) =>
    uri ? s.byUrl[uri.trim()] : undefined,
  );
  const overlay = edits ?? cached ?? null;
  const touch = useRef({ x: 0, y: 0 });

  const player = useVideoPlayer(uri ?? null, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (!uri) return;
    try {
      if (isActive && !paused) {
        player.play();
      } else {
        player.pause();
        if (!isActive) {
          player.currentTime = 0;
        }
      }
    } catch {
      // ignore
    }
  }, [isActive, paused, uri, player]);

  if (!uri) {
    return <View style={styles.black} />;
  }

  return (
    <View
      style={styles.black}
      onTouchStart={(e) => {
        touch.current = {
          x: e.nativeEvent.pageX,
          y: e.nativeEvent.pageY,
        };
      }}
      onTouchEnd={(e) => {
        if (!isActive) return;
        const dx = e.nativeEvent.pageX - touch.current.x;
        const dy = e.nativeEvent.pageY - touch.current.y;
        if (dx * dx + dy * dy > 64) return;
        onTogglePause?.();
      }}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        {...(Platform.OS === 'android'
          ? { surfaceType: 'textureView' as const }
          : {})}
      />
      <MediaEditsOverlay edits={overlay} />
      {paused && isActive ? (
        <View style={styles.badge} pointerEvents="none">
          <MaterialIcons name="play-arrow" size={40} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  black: {
    flex: 1,
    backgroundColor: '#000',
  },
  badge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 76,
    height: 76,
    marginTop: -38,
    marginLeft: -38,
    borderRadius: 38,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
