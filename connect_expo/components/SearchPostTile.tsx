/**
 * Flutter `PostTile` from search_screen.dart
 */
import { Brand } from '@/constants/Colors';
import type { Post } from '@/types/posts';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  post: Post;
  isOwn: boolean;
  onPlay: () => void;
  onFollowPress: () => void;
};

function expiryLabel(expiryDate?: string) {
  if (!expiryDate) return 'Expires in 0 days';
  const end = new Date(expiryDate);
  if (Number.isNaN(end.getTime())) return 'Expires in 0 days';
  const days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
  return `Expires in ${days} days`;
}

function cap(s?: string) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function SearchPostTile({ post, isOwn, onPlay, onFollowPress }: Props) {
  const followed = post.user?.followed ?? 'notFollowed';
  const isFollowing = followed !== 'notFollowed';
  const tags = (post.tags ?? []).join('');
  const avatar = post.user?.avatar?.trim() ?? '';
  const hasAvatar = /^https?:\/\//i.test(avatar);
  const [avatarFailed, setAvatarFailed] = React.useState(false);
  const thumb = post.thumbnail;
  const showAvatarImage = hasAvatar && !avatarFailed;

  React.useEffect(() => {
    setAvatarFailed(false);
  }, [avatar]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        {showAvatarImage ? (
          <Image
            source={{ uri: avatar }}
            style={styles.avatar}
            resizeMode="cover"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          // Flutter NetworkImageCustom errorWidget: Icons.account_circle
          <MaterialIcons
            name="account-circle"
            size={60}
            color="#9E9E9E"
            style={styles.avatarIcon}
          />
        )}
        <View style={styles.headerText}>
          <Text style={styles.username}>
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
          <Text style={styles.location}>
            {' '}
            {cap(post.state || 'California')}, {cap(post.country || 'USA')}
          </Text>
        </View>
        {!isOwn ? (
          <Pressable onPress={onFollowPress} hitSlop={8} style={styles.followBtn}>
            <MaterialIcons
              name={isFollowing ? 'person-add-disabled' : 'person-add-alt-1'}
              size={24}
              color={Brand.primary}
            />
          </Pressable>
        ) : null}
      </View>

      <Pressable style={styles.thumbWrap} onPress={onPlay}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]} />
        )}
        <View style={styles.playBadge}>
          <MaterialIcons name="play-arrow" size={40} color={Brand.white} />
        </View>
        <Text style={styles.views}>{post.views_count ?? 0} Views</Text>
      </Pressable>

      <Text style={styles.info}>
        {post.info || 'Anyone heading to Phoenix Game Tonight?'}
      </Text>
      {tags ? <Text style={styles.tags}>{tags}</Text> : null}

      <View style={styles.footer}>
        <View style={styles.stars}>
          {Array.from({ length: 5 }).map((_, i) => (
            <MaterialIcons key={i} name="star" size={20} color="#FFB400" />
          ))}
        </View>
        <Text style={styles.expiry}>{expiryLabel(post.expiry_date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Brand.borderLight,
    overflow: 'hidden',
  },
  avatarIcon: {
    width: 60,
    height: 60,
  },
  headerText: { marginLeft: 8, flex: 1 },
  username: { fontSize: 16, fontWeight: '700', color: Brand.textPrimary },
  location: { fontSize: 16, fontWeight: '700', color: Brand.txtGrey, marginTop: 2 },
  followBtn: { padding: 4 },
  thumbWrap: {
    marginTop: 16,
    height: 300,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Brand.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  thumbEmpty: { backgroundColor: Brand.black },
  playBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  views: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    color: Brand.white,
    fontSize: 13,
    fontWeight: '500',
  },
  info: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '500',
    color: Brand.textPrimary,
  },
  tags: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '500',
    color: Brand.primary,
  },
  footer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: { flexDirection: 'row', gap: 2 },
  expiry: {
    marginLeft: 'auto',
    fontSize: 15,
    fontWeight: '500',
    color: Brand.txtGrey,
  },
});
