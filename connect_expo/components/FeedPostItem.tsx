import { AppTourTarget } from '@/components/AppTourTarget';
import { FeedVideo } from '@/components/FeedVideo';
import { ReportSheet } from '@/components/ReportSheet';
import { blockUser, reportPost } from '@/services/api/posts';
import { useAuthStore } from '@/store/authStore';
import { useFeedStore } from '@/store/feedStore';
import {
  stripMediaEditsFromInfo,
  useMediaOverlayStore,
} from '@/store/mediaViewerStore';
import type { Post } from '@/types/posts';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  post: Post;
  isActive: boolean;
  pageHeight: number;
};

export function FeedPostItem({ post, isActive, pageHeight }: Props) {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const removePost = useFeedStore((s) => s.removePost);
  const removePostsByUser = useFeedStore((s) => s.removePostsByUser);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);

  const { info: displayInfo, edits: infoEdits } = useMemo(
    () => stripMediaEditsFromInfo(post.info),
    [post.info],
  );

  useEffect(() => {
    if (post.video && infoEdits) {
      useMediaOverlayStore.getState().remember(post.video, infoEdits);
    }
  }, [post.video, infoEdits]);

  useEffect(() => {
    setPaused(false);
  }, [isActive, post.id]);

  function togglePause() {
    if (!isActive || !post.video) return;
    setPaused((p) => !p);
  }

  const liked = post.isLiked ?? false;
  const isOwn = post.user_id === userId;
  const otherUserId = post.user_id ?? post.user?.id;
  const short = pageHeight < 640;

  // Left rail ends above profile; profile sits under ⋯ above the tab bar
  const topSafe = Math.max(52, Math.round(pageHeight * 0.07));
  const profileBottom = short ? 20 : 28;
  const profileBlockH = short ? 118 : 136; // avatar + @ + 2-line caption
  const profileReserve = profileBottom + profileBlockH + 12;
  const railH = Math.max(200, pageHeight - topSafe - profileReserve);
  const scale = Math.max(0, Math.min(1, (railH - 240) / 220));
  const gap = Math.round(12 + scale * 4);
  const logoSize = Math.round(38 + scale * 8);
  const heartSize = Math.round(32 + scale * 6);
  const connectSize = Math.round(28 + scale * 4);
  const shareSize = Math.round(22 + scale * 3);
  const moreSize = Math.round(28 + scale * 2);
  const labelSize = Math.round(11 + scale * 2);
  const showActionLabels = railH > 300;

  async function onShare() {
    if (!post.video) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(post.video);
      } else {
        Alert.alert('Share', post.video);
      }
    } catch {
      Alert.alert('Share', post.video);
    }
  }

  async function doReport(reason: string) {
    if (!token || !post.id || busy) return;
    setBusy(true);
    setReportOpen(false);
    try {
      await reportPost(token, post.id, reason);
      removePost(post.id);
      Alert.alert('Reported', 'Thanks — we’ll review this post.');
    } catch (e) {
      Alert.alert(
        'Report failed',
        e instanceof Error ? e.message : 'Could not report this post.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function doBlock() {
    if (!token || otherUserId == null || busy) return;
    setBusy(true);
    try {
      await blockUser(token, otherUserId);
      removePostsByUser(otherUserId);
      Alert.alert('Blocked', 'You won’t see posts from this user.');
    } catch (e) {
      Alert.alert(
        'Block failed',
        e instanceof Error ? e.message : 'Could not block this user.',
      );
    } finally {
      setBusy(false);
    }
  }

  function onMore() {
    if (isOwn) {
      Alert.alert('More', 'This is your post.');
      return;
    }
    const options = ['Report', 'Block', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: 0,
          cancelButtonIndex: 2,
          title: 'Actions',
        },
        (i) => {
          if (i === 0) setReportOpen(true);
          else if (i === 1) {
            Alert.alert(
              'Block user?',
              'You won’t see their posts in your feed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: () => void doBlock(),
                },
              ],
            );
          }
        },
      );
    } else {
      Alert.alert('Actions', undefined, [
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => setReportOpen(true),
        },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Block user?',
              'You won’t see their posts in your feed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: () => void doBlock(),
                },
              ],
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  return (
    <View style={[styles.page, { height: pageHeight }]}>
      <FeedVideo
        uri={post.video}
        isActive={isActive}
        edits={infoEdits}
        paused={paused}
        onTogglePause={togglePause}
      />

      <View
        style={[styles.leftActions, { top: topSafe, bottom: profileReserve }]}
        pointerEvents="box-none"
      >
        <View style={[styles.leftActionsInner, { gap }]}>
          <View
            style={[
              styles.sideLogoWrap,
              {
                width: logoSize,
                height: logoSize,
                borderRadius: logoSize / 2,
              },
            ]}
          >
            <Image
              source={require('../assets/images/kora_logo.png')}
              style={{ width: logoSize, height: logoSize }}
              resizeMode="cover"
            />
          </View>

          <View style={styles.actionCenter}>
            <AppTourTarget id="like" active={isActive}>
              <Pressable
                onPress={() => {
                  if (token && post.id) toggleLike(token, post.id);
                }}
              >
                <Image
                  source={require('../assets/images/ic_heart.png')}
                  style={[
                    styles.heart,
                    {
                      width: heartSize,
                      height: heartSize,
                      tintColor: liked ? '#FF0000' : '#FFFFFF',
                    },
                  ]}
                />
              </Pressable>
            </AppTourTarget>
            {showActionLabels ? (
              <Text style={[styles.actionLabel, { fontSize: labelSize }]}>
                {post.likes_count ?? 0} Likes
              </Text>
            ) : null}
          </View>

          <AppTourTarget id="connect" active={isActive}>
            <Pressable
              style={styles.actionCenter}
              disabled={isOwn}
              onPress={() => {
                if (isOwn) return;
                const videoId = post.id;
                if (!videoId || !otherUserId) {
                  Alert.alert('Error', 'Missing video or user id from backend.');
                  return;
                }
                router.push({
                  pathname: '/chat/[videoId]',
                  params: {
                    videoId: String(videoId),
                    secondUserId: String(otherUserId),
                    userName: (
                      post.user?.username ||
                      post.user?.first_name ||
                      ''
                    ).toLowerCase(),
                    description: displayInfo,
                    userAvatar: post.user?.avatar ?? '',
                    bio: post.user?.bio ?? '',
                    tags: [...new Set(post.tags ?? [])].join(','),
                  },
                });
              }}
            >
              <Image
                source={require('../assets/images/ic_comments.png')}
                style={[
                  styles.comment,
                  { width: connectSize, height: connectSize },
                  isOwn && { opacity: 0.4 },
                ]}
              />
              {showActionLabels ? (
                <Text style={[styles.actionLabel, { fontSize: labelSize }]}>
                  Connect
                </Text>
              ) : null}
            </Pressable>
          </AppTourTarget>

          <View style={styles.actionCenter}>
            <AppTourTarget id="share" active={isActive}>
              <Pressable onPress={onShare}>
                <Image
                  source={require('../assets/images/ic_share.png')}
                  style={[
                    styles.share,
                    { width: shareSize, height: shareSize },
                  ]}
                />
              </Pressable>
            </AppTourTarget>
            {showActionLabels ? (
              <Text style={[styles.actionLabel, { fontSize: labelSize }]}>
                Share
              </Text>
            ) : null}
          </View>

          <AppTourTarget id="more" active={isActive}>
            <Pressable onPress={onMore} hitSlop={12} style={styles.moreHit}>
              <MaterialIcons name="more-horiz" size={moreSize} color="#FFFFFF" />
            </Pressable>
          </AppTourTarget>
        </View>
      </View>

      {/* Under ⋯, above tab bar */}
      <View style={[styles.userInfo, { bottom: profileBottom }]} pointerEvents="box-none">
        <Pressable style={styles.profileBlock}>
          {post.user?.avatar ? (
            <Image
              source={{ uri: post.user.avatar }}
              style={[styles.avatar, short && { width: 44, height: 44 }]}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons
              name="account-circle"
              size={short ? 44 : 50}
              color="#9E9E9E"
            />
          )}
          <Text style={[styles.handle, short && { fontSize: 14 }]} numberOfLines={1}>
            @
            {(
              post.user?.username ||
              post.user?.first_name ||
              post.user?.name ||
              'user'
            )
              .toString()
              .toLowerCase()}
          </Text>
        </Pressable>

        {displayInfo ? (
          <Text
            style={[styles.info, short && { fontSize: 11 }]}
            numberOfLines={2}
          >
            {displayInfo.trim()}
          </Text>
        ) : null}
      </View>

      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={(reason) => void doReport(reason)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  leftActions: {
    position: 'absolute',
    left: 10,
    width: 68,
    // Pack actions toward the bottom of the rail so ⋯ sits just above profile
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 20,
    paddingBottom: 10,
  },
  leftActionsInner: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  moreHit: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideLogoWrap: {
    overflow: 'hidden',
  },
  actionCenter: {
    alignItems: 'center',
    gap: 3,
  },
  heart: {
    resizeMode: 'contain',
  },
  comment: {
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  share: {
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 15,
  },
  userInfo: {
    position: 'absolute',
    left: 12,
    right: 16,
    zIndex: 20,
    gap: 6,
  },
  profileBlock: {
    alignItems: 'flex-start',
    gap: 6,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 50,
  },
  handle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  info: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 200,
  },
});
