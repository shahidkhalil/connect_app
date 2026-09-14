/**
 * Flutter `SearchScreen` — search field, history/trending chips, result tiles,
 * and My feed / Trending / Recommended tabs (API-backed).
 */
import { SearchPostTile } from '@/components/SearchPostTile';
import { Brand } from '@/constants/Colors';
import {
  followUser,
  searchPosts,
  unfollowUser,
} from '@/services/api/posts';
import { useAuthStore } from '@/store/authStore';
import { useFeedStore } from '@/store/feedStore';
import { notify } from '@/store/notificationStore';
import type { FeedCategory, Post } from '@/types/posts';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CHIP_LABELS = ['Movies', 'Games', 'Fun', 'Recipes', 'Matches', 'Latest'] as const;
const FEED_TABS: FeedCategory[] = ['My feed', 'Trending', 'Recommended'];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const me = useAuthStore((s) => s.user);
  const myId = me?.id != null ? Number(me.id) : null;

  const category = useFeedStore((s) => s.category);
  const loadingFeed = useFeedStore((s) => s.loading);
  const myFeed = useFeedStore((s) => s.myFeed);
  const trending = useFeedStore((s) => s.trending);
  const recommended = useFeedStore((s) => s.recommended);
  const setCategory = useFeedStore((s) => s.setCategory);
  const loadCategory = useFeedStore((s) => s.loadCategory);
  const replaceCategoryPosts = useFeedStore((s) => s.replaceCategoryPosts);
  const setPendingScrollIndex = useFeedStore((s) => s.setPendingScrollIndex);

  const [query, setQuery] = useState('');
  const [searchOn, setSearchOn] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Post[]>([]);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [tabLabelWidths, setTabLabelWidths] = useState<Record<string, number>>(
    {},
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const browsePosts = useMemo(() => {
    if (category === 'My feed') return myFeed;
    if (category === 'Trending') return trending;
    return recommended;
  }, [category, myFeed, trending, recommended]);

  useEffect(() => {
    if (!token || searchOn) return;
    void loadCategory(token, category);
  }, [token, searchOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback(
    async (q: string, opts?: { force?: boolean }) => {
      if (!token) return;
      const trimmed = q.trim();
      if (!trimmed) {
        setResults([]);
        setSearchDone(false);
        return;
      }
      // Allow short username searches (API matches username/title/tags server-side)
      if (!opts?.force && trimmed.length < 1) return;

      setSearching(true);
      setSearchDone(false);
      setSearchOn(true);
      try {
        const data = await searchPosts(token, trimmed);
        let posts = Array.isArray(data.posts) ? [...data.posts] : [];

        // Prefer posts whose username / name matches the query (user search feel)
        const qLower = trimmed.toLowerCase().replace(/^@/, '');
        posts.sort((a, b) => {
          const score = (p: Post) => {
            const u = (p.user?.username || '').toLowerCase();
            const f = (p.user?.first_name || '').toLowerCase();
            const n = String(p.user?.name || '').toLowerCase();
            if (u === qLower || f === qLower || n === qLower) return 3;
            if (u.includes(qLower) || f.includes(qLower) || n.includes(qLower)) return 2;
            const hay = `${p.title || ''} ${p.info || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
            if (hay.includes(qLower)) return 1;
            return 0;
          };
          return score(b) - score(a);
        });

        setResults(posts);
        setSearchDone(true);
      } catch (e) {
        setResults([]);
        setSearchDone(true);
        Alert.alert(
          '',
          e instanceof Error ? e.message : 'Search failed. Try again.',
        );
      } finally {
        setSearching(false);
      }
    },
    [token],
  );

  function onChangeQuery(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      setSearchDone(false);
      return;
    }
    setSearchOn(true);
    // Search as soon as user types (usernames can be short); debounce network
    debounceRef.current = setTimeout(() => {
      void runSearch(val, { force: true });
    }, 300);
  }

  function clearSearch() {
    setSearchOn(false);
    setSearchFocused(false);
    setSearchDone(false);
    setSearching(false);
    setQuery('');
    setResults([]);
    setSelectedChips([]);
    inputRef.current?.blur();
  }

  function onChip(label: string) {
    setSelectedChips((prev) => {
      const next = prev.includes(label)
        ? prev.filter((x) => x !== label)
        : [...prev, label];
      // Flutter: getSearchData(newValues.last) when selection not empty
      if (next.length) {
        setSearchOn(true);
        void runSearch(next[next.length - 1], { force: true });
      } else {
        setSearchDone(false);
        setResults([]);
      }
      return next;
    });
  }

  function openInHome(posts: Post[], index: number, cat: FeedCategory) {
    replaceCategoryPosts(cat, posts);
    setPendingScrollIndex(index);
    router.push('/');
  }

  async function onFollow(post: Post, list: 'search' | 'browse') {
    if (!token || post.user_id == null) return;
    const followed = post.user?.followed ?? 'notFollowed';
    if (followed === 'requested') {
      Alert.alert('', 'Your request is not approved yet.');
      return;
    }
    try {
      if (followed === 'notFollowed') {
        await followUser(token, post.user_id);
        patchFollow(post.id, 'requested', list);
        notify('Follow request sent', { kind: 'success', title: 'Follow' });
      } else {
        await unfollowUser(token, post.user_id);
        patchFollow(post.id, 'notFollowed', list);
        notify('Unfollowed', { kind: 'info', title: 'Follow' });
      }
    } catch (e) {
      Alert.alert('', e instanceof Error ? e.message : 'Follow action failed.');
    }
  }

  function patchFollow(
    postId: number | undefined,
    status: string,
    list: 'search' | 'browse',
  ) {
    if (postId == null) return;
    const apply = (posts: Post[]) =>
      posts.map((p) =>
        p.id === postId
          ? { ...p, user: { ...p.user, followed: status } }
          : p,
      );
    if (list === 'search') {
      setResults((prev) => apply(prev));
      return;
    }
    replaceCategoryPosts(category, apply(browsePosts));
  }

  async function onSelectBrowseTab(tab: FeedCategory) {
    setCategory(tab);
    if (!token) return;
    // Flutter only refetches when that bucket is empty
    const empty =
      tab === 'My feed'
        ? myFeed.length === 0
        : tab === 'Trending'
          ? trending.length === 0
          : recommended.length === 0;
    if (empty) await loadCategory(token, tab);
  }

  const showHistory = searchOn && !searchDone && results.length === 0;

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Flutter customAppBar(title: Search, backButton: false) */}
      <View style={styles.appBar}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/images/kora_logo.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.appBarTitle}>Search</Text>
        <View style={styles.appBarSpacer} />
      </View>

      <View style={styles.body}>
        <View
          style={[
            styles.searchWrap,
            searchFocused && styles.searchWrapFocused,
          ]}
        >
          <TextInput
            ref={inputRef}
            style={styles.search}
            placeholder="Search users, tags…"
            placeholderTextColor="#9E9E9E"
            value={query}
            onChangeText={onChangeQuery}
            onFocus={() => {
              setSearchOn(true);
              setSearchFocused(true);
            }}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            onSubmitEditing={() => void runSearch(query, { force: true })}
            cursorColor={Brand.primary}
            selectionColor={Brand.primary}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchOn ? (
            <Pressable onPress={clearSearch} hitSlop={10} style={styles.searchIconBtn}>
              <MaterialIcons name="cancel" size={24} color={Brand.primary} />
            </Pressable>
          ) : (
            <View style={styles.searchIconBtn}>
              <MaterialIcons name="search" size={24} color="#9E9E9E" />
            </View>
          )}
        </View>

        <View style={{ height: 10 }} />

        {searchOn ? (
          showHistory ? (
            <ScrollView contentContainerStyle={styles.historyPad}>
              {searching ? (
                <ActivityIndicator
                  color={Brand.primary}
                  style={{ marginVertical: 8 }}
                />
              ) : null}
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Search History</Text>
              <View style={styles.chips}>
                {CHIP_LABELS.map((label) => (
                  <Chip
                    key={`h-${label}`}
                    label={label}
                    selected={selectedChips.includes(label)}
                    onPress={() => onChip(label)}
                  />
                ))}
              </View>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Trending Searches</Text>
              <View style={styles.chips}>
                {CHIP_LABELS.map((label) => (
                  <Chip
                    key={`t-${label}`}
                    label={label}
                    selected={selectedChips.includes(label)}
                    onPress={() => onChip(label)}
                  />
                ))}
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item, i) => `s-${item.id ?? i}`}
              contentContainerStyle={styles.listPad}
              ListEmptyComponent={
                searchDone ? (
                  <Text style={styles.empty}>No Result Found</Text>
                ) : null
              }
              ListHeaderComponent={
                searching ? (
                  <ActivityIndicator
                    color={Brand.primary}
                    style={{ marginBottom: 12 }}
                  />
                ) : null
              }
              renderItem={({ item, index }) => (
                <SearchPostTile
                  post={item}
                  isOwn={myId != null && item.user_id === myId}
                  onPlay={() => openInHome(results, index, 'Recommended')}
                  onFollowPress={() => void onFollow(item, 'search')}
                />
              )}
            />
          )
        ) : (
          <View style={styles.flex}>
            <View style={styles.tabs}>
              {FEED_TABS.map((tab) => {
                const active = category === tab;
                return (
                  <Pressable
                    key={tab}
                    style={styles.tab}
                    onPress={() => void onSelectBrowseTab(tab)}
                  >
                    <Text
                      style={[styles.tabText, active && styles.tabTextActive]}
                      numberOfLines={1}
                      onLayout={(e) => {
                        const w = e.nativeEvent.layout.width;
                        setTabLabelWidths((prev) =>
                          prev[tab] === w ? prev : { ...prev, [tab]: w },
                        );
                      }}
                    >
                      {tab}
                    </Text>
                    {active ? (
                      <View
                        style={[
                          styles.tabIndicator,
                          {
                            width: Math.max(tabLabelWidths[tab] ?? 40, 24),
                            marginLeft: -Math.max(tabLabelWidths[tab] ?? 40, 24) / 2,
                          },
                        ]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {loadingFeed && browsePosts.length === 0 ? (
              <View style={styles.center}>
                <ActivityIndicator color={Brand.primary} />
              </View>
            ) : (
              <FlatList
                data={browsePosts}
                keyExtractor={(item, i) => `b-${item.id ?? i}`}
                contentContainerStyle={styles.listPad}
                ListEmptyComponent={
                  <Text style={styles.empty}>No posts yet</Text>
                }
                renderItem={({ item, index }) => (
                  <SearchPostTile
                    post={item}
                    isOwn={myId != null && item.user_id === myId}
                    onPlay={() => openInHome(browsePosts, index, category)}
                    onFollowPress={() => void onFollow(item, 'browse')}
                  />
                )}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.white },
  // Flutter PreferredSize height 70 + row with logo / title / spacer
  appBar: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  logoWrap: {
    marginLeft: 10,
    width: 49,
    height: 49,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Flutter Image.asset scale: 22 → 1080/22 ≈ 49
  logo: { width: 49, height: 49 },
  appBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'SF-Pro-Display',
    color: Brand.textPrimary,
  },
  appBarSpacer: { width: 49, marginRight: 10 },
  body: { flex: 1, paddingHorizontal: 16, paddingBottom: 8 },
  flex: { flex: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#9E9E9E',
    borderRadius: 15,
    paddingLeft: 14,
    paddingRight: 6,
    minHeight: 56,
    backgroundColor: Brand.white,
  },
  searchWrapFocused: {
    borderWidth: 1.5,
    borderColor: Brand.primary,
  },
  search: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: Brand.black,
    paddingVertical: 14,
  },
  searchIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  historyPad: { paddingBottom: 40 },
  listPad: { paddingVertical: 12, paddingBottom: 40 },
  divider: {
    height: 0.5,
    backgroundColor: Brand.borderLight,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'SF-Pro-Display',
    color: Brand.textPrimary,
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  // Flutter RadioButtonTileGroup — padding 8, radius 100, selected = primaryColorBottom
  chip: {
    padding: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#9E9E9E',
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: Brand.primaryBottom,
    borderColor: Brand.primaryBottom,
  },
  chipText: { fontSize: 14, color: Brand.black, fontWeight: '400' },
  chipTextSelected: { color: Brand.white },
  // Flutter TabBar — 2px indicator, width matches label text
  tabs: {
    flexDirection: 'row',
    height: 46,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.55)',
    textAlign: 'center',
  },
  tabTextActive: {
    color: Brand.primary,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    height: 2,
    backgroundColor: Brand.primary,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: Brand.black,
    fontSize: 15,
    fontWeight: '500',
  },
});
