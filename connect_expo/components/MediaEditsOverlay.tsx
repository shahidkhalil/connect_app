import { Brand } from '@/constants/Colors';
import type { MediaEdits } from '@/store/mediaViewerStore';
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

/** Dragged text + color filter on top of video/image (same positions as editor). */
export function MediaEditsOverlay({
  edits,
  layoutWidth,
  layoutHeight,
}: {
  edits?: MediaEdits | null;
  /** Defaults to window size when omitted. */
  layoutWidth?: number;
  layoutHeight?: number;
}) {
  const win = useWindowDimensions();
  const w = layoutWidth ?? win.width;
  const h = layoutHeight ?? win.height;
  if (!edits) return null;

  const textLeft = (edits.xNorm ?? 0.2) * w;
  const textTop = (edits.yNorm ?? 0.4) * h;

  return (
    <View style={styles.layer} pointerEvents="none">
      {edits.filterColor ? (
        <View style={[styles.filter, { backgroundColor: edits.filterColor }]} />
      ) : null}
      {edits.text?.trim() ? (
        <Text
          style={[
            styles.text,
            {
              left: textLeft,
              top: textTop,
              color: edits.textColor ?? Brand.white,
              fontSize: edits.fontSize ?? 28,
              fontWeight: edits.bold ? '700' : '500',
            },
          ]}
        >
          {edits.text}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  filter: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  text: {
    position: 'absolute',
    maxWidth: '85%',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
