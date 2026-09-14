import { AppTourTarget } from '@/components/AppTourTarget';
import { FeedVideo } from '@/components/FeedVideo';
import { Brand } from '@/constants/Colors';
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
import React, { useEffect, useMemo } from 'react';
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

  const { info: displayInfo, edits: infoEdits } = useMemo(
    () => stripMediaEditsFromInfo(post.info),
    [post.info],
  );

  useEffect(() => {
    if (post.video && infoEdits) {
      useMediaOverlayStore.getState().remember(post.video, infoEdits);
    }
  }, [post.video, infoEdits]);

  const liked = post.isLiked ?? false;
  const isOwn = post.user_id === userId;

  // Scale left rail so it never collides with bottom user info on short phones
  const compact = pageHeight < 640;
  const tight = pageHeight < 560;
  const gap = tight ? 8 : compact ? 12 : 20;
  const logoSize = tight ? 36 : compact ? 42 : 49;
  const heartSize = tight ? 30 : compact ? 34 : 40;
  const connectSize = tight ? 26 : compact ? 30 : 34;
  const shareSize = tight ? 20 : compact ? 22 : 25;
  const moreSize = tight ? 24 : compact ? 28 : 32;
  const labelSize = tight ? 11 : compact ? 12 : 14;
  // Keep column between top tabs (~56) and bottom user block (~160)
  const topPad = tight ? 56 : compact ? 72 : 252;
  const maxTop = Math.max(48, pageHeight - (tight ? 280 : compact ? 300 : 320));
  const actionTop = Math.min(topPad, maxTop);

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

  function onMore() {
    const options = ['Report', 'Block', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: 0, cancelButtonIndex: 2, title: 'Actions' },
        (i) => {
          if (i === 0 || i === 1) {
            if (post.id) removePost(post.id);
            Alert.alert(i === 0 ? 'Reported' : 'Blocked', 'Action sent.');
          }
        },
      );
    } else {
      Alert.alert('Actions', undefined, [
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            if (post.id) removePost(post.id);
          },
        },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            if (post.id) removePost(post.id);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  return (
    <View style={[styles.page, { height: pageHeight }]}>
      <FeedVideo uri={post.video} isActive={isActive} edits={infoEdits} />

      {/* Left actions — responsive top/gaps/sizes for small screens */}
      <View style={[styles.leftActions, { top: actionTop }]}>
        <View style={[styles.sideLogoWrap, { width: logoSize, height: logoSize, borderRadius: logoSize }]}>
          <Image
            source={require('../assets/images/kora_logo.png')}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="cover"
          />
        </View>
        <View style={{ height: gap }} />

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
                  { width: heartSize, height: heartSize, tintColor: liked ? '#FF0000' : '#FFFFFF' },
                ]}
              />
            </Pressable>
          </AppTourTarget>
          <Text style={[styles.actionLabel, { fontSize: labelSize }]}>
            {post.likes_count ?? 0} Likes
          </Text>
        </View>
        <View style={{ height: gap }} />

        <AppTourTarget id="connect" active={isActive}>
          <Pressable
            style={styles.actionCenter}
            disabled={isOwn}
            onPress={() => {
              if (isOwn) return;
              const videoId = post.id;
              const otherUserId = post.user_id ?? post.user?.id;
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
            <Text style={[styles.actionLabel, { fontSize: labelSize }]}>Connect</Text>
          </Pressable>
        </AppTourTarget>
        <View style={{ height: gap }} />

        <View style={styles.actionCenter}>
          <AppTourTarget id="share" active={isActive}>
            <Pressable onPress={onShare}>
              <Image
                source={require('../assets/images/ic_share.png')}
                style={[styles.share, { width: shareSize, height: shareSize }]}
              />
            </Pressable>
          </AppTourTarget>
          <Text style={[styles.actionLabel, { fontSize: labelSize }]}>Share</Text>
        </View>
        <View style={{ height: gap }} />

        <AppTourTarget id="more" active={isActive}>
          <Pressable onPress={onMore} hitSlop={8}>
            <MaterialIcons name="more-horiz" size={moreSize} color="#FFFFFF" />
          </Pressable>
        </AppTourTarget>
        <View style={{ height: Math.max(6, gap / 2) }} />
      </View>

      {/* Flutter: Positioned(bottom: 20, left: 11, right: 70) */}
      <View style={[styles.userInfo, tight && { bottom: 12, right: 56 }]}>
        <Pressable>
          {post.user?.avatar ? (
            <Image
              source={{ uri: post.user.avatar }}
              style={[styles.avatar, tight && { width: 42, height: 42 }]}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons
              name="account-circle"
              size={tight ? 42 : 50}
              color="#9E9E9E"
              style={styles.avatarFallback}
            />
          )}
          <View style={{ height: tight ? 6 : 10 }} />
          <Text style={styles.handle}>
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

        <View style={{ height: tight ? 6 : 10 }} />

        {displayInfo ? (
          <Text style={[styles.info, tight && { width: 160, fontSize: 11 }]} numberOfLines={tight ? 2 : 4}>
            {displayInfo}
          </Text>
        ) : null}

        {post.id != null ? (
          <View style={styles.titleRow}>
            <MaterialIcons name="videocam" size={tight ? 16 : 18} color="#FFFFFF" />
            <View style={{ width: 8 }} />
            <Text style={styles.titleText} numberOfLines={1}>
              {post.title ?? ''}
            </Text>
          </View>
        ) : null}

        <View style={{ height: tight ? 16 : 30 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    backgroundColor: '#000',
  },
  leftActions: {
    position: 'absolute',
    left: 10,
    alignItems: 'center',
    zIndex: 2,
    maxWidth: 72,
  },
  sideLogoWrap: {
    overflow: 'hidden',
  },
  actionCenter: {
    alignItems: 'center',
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
    fontSize: 14,
    textAlign: 'center',
  },
  userInfo: {
    position: 'absolute',
    left: 11,
    right: 70,
    bottom: 20,
    zIndex: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 50,
  },
  avatarFallback: {
    marginBottom: 0,
  },
  handle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  info: {
    color: '#FFFFFF',
    fontSize: 12,
    width: 200,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 12,
    flexShrink: 1,
  },
});
