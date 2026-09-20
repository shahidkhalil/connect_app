import { AppTourTarget } from '@/components/AppTourTarget';
import { FeedPostItem } from '@/components/FeedPostItem';
import { Brand } from '@/constants/Colors';
import { useAppTourStore } from '@/store/appTourStore';
import { useAuthStore } from '@/store/authStore';
import { useFeedStore } from '@/store/feedStore';
import type { FeedCategory, Post } from '@/types/posts';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS: FeedCategory[] = ['My feed', 'Trending', 'Recommended'];
const TOUR_TAB_IDS = ['feedTab', 'trendingTab', 'recommendedTab'] as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const category = useFeedStore((s) => s.category);
  const loading = useFeedStore((s) => s.loading);
  const myFeed = useFeedStore((s) => s.myFeed);
  const trending = useFeedStore((s) => s.trending);
  const recommended = useFeedStore((s) => s.recommended);
  const pendingScrollIndex = useFeedStore((s) => s.pendingScrollIndex);
  const setCategory = useFeedStore((s) => s.setCategory);
  const setPendingScrollIndex = useFeedStore((s) => s.setPendingScrollIndex);
  const loadCategory = useFeedStore((s) => s.loadCategory);
  const hydrateTour = useAppTourStore((s) => s.hydrate);
  const maybePrompt = useAppTourStore((s) => s.maybePrompt);
  const tourHydrated = useAppTourStore((s) => s.hydrated);

  const listRef = useRef<FlatList<Post>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [screenFocused, setScreenFocused] = useState(true);
  const windowH = Dimensions.get('window').height;
  const pageHeight = windowH - insets.top - 60 - Math.max(insets.bottom, 0);

  const posts = useMemo(() => {
    if (category === 'My feed') return myFeed;
    if (category === 'Trending') return trending;
    return recommended;
  }, [category, myFeed, trending, recommended]);

  useEffect(() => {
    void hydrateTour();
  }, [hydrateTour]);

  // Flutter NavBarScreen: show TakeTour once home is up (if not canceled)
  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      const pending = useFeedStore.getState().pendingScrollIndex;
      if (pending == null && token) {
        void loadCategory(token, category);
      }
      return () => setScreenFocused(false);
    }, [token, category, loadCategory]),
  );

  // First install / first login only — maybePrompt no-ops after tour was seen
  useEffect(() => {
    if (!token || !tourHydrated || !screenFocused) return;
    const t = setTimeout(() => maybePrompt(), 600);
    return () => clearTimeout(t);
  }, [token, tourHydrated, screenFocused, maybePrompt]);

  useEffect(() => {
    if (pendingScrollIndex == null || posts.length === 0) return;
    const idx = Math.max(0, Math.min(pendingScrollIndex, posts.length - 1));
    setActiveIndex(idx);
    const t = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index: idx, animated: false });
      } catch {
        // ignore
      }
      setPendingScrollIndex(null);
    }, 50);
    return () => clearTimeout(t);
  }, [pendingScrollIndex, posts.length, setPendingScrollIndex]);

  async function onSelectTab(tab: FeedCategory) {
    setCategory(tab);
    setActiveIndex(0);
    if (token) await loadCategory(token, tab);
  }

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable);
      if (first?.index != null) setActiveIndex(first.index);
    },
    [],
  );

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 80 }),
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={{ height: pageHeight }}>
        {loading && posts.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.primary} size="large" />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.empty}>No Latest Videos</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={posts}
            keyExtractor={(item, i) => String(item.id ?? i)}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={pageHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            getItemLayout={(_, index) => ({
              length: pageHeight,
              offset: pageHeight * index,
              index,
            })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item, index }: { item: Post; index: number }) => (
              <FeedPostItem
                post={item}
                isActive={screenFocused && index === activeIndex}
                pageHeight={pageHeight}
              />
            )}
          />
        )}

        <View style={styles.tabs} pointerEvents="box-none">
          <View style={styles.tabsRow}>
            {TABS.map((tab, i) => (
              <AppTourTarget key={tab} id={TOUR_TAB_IDS[i]!}>
                <Pressable onPress={() => onSelectTab(tab)} style={styles.tabBtn}>
                  <Text
                    style={[
                      styles.tabText,
                      { color: category === tab ? '#fff' : '#9E9E9E' },
                    ]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              </AppTourTarget>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  empty: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  tabs: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBtn: {
    paddingHorizontal: 9,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
