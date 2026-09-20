import { create } from 'zustand';

import { postsApi } from '@/services/api';
import type { FeedCategory, Post } from '@/types/posts';

type FeedState = {
  category: FeedCategory;
  myFeed: Post[];
  trending: Post[];
  recommended: Post[];
  loading: boolean;
  error: string | null;
  /** When set, Home scrolls to this index after focus (search → play). */
  pendingScrollIndex: number | null;
  setCategory: (c: FeedCategory) => void;
  setPendingScrollIndex: (index: number | null) => void;
  replaceCategoryPosts: (category: FeedCategory, posts: Post[]) => void;
  loadCategory: (token: string, category?: FeedCategory) => Promise<void>;
  toggleLike: (token: string, postId: number) => Promise<void>;
  removePost: (postId: number) => void;
  /** Drop every post by this author (after block). */
  removePostsByUser: (userId: number) => void;
};

function postsFor(state: FeedState, category: FeedCategory): Post[] {
  switch (category) {
    case 'My feed':
      return state.myFeed;
    case 'Trending':
      return state.trending;
    default:
      return state.recommended;
  }
}

export const useFeedStore = create<FeedState>((set, get) => ({
  category: 'My feed',
  myFeed: [],
  trending: [],
  recommended: [],
  loading: false,
  error: null,
  pendingScrollIndex: null,

  setCategory: (category) => set({ category }),
  setPendingScrollIndex: (pendingScrollIndex) => set({ pendingScrollIndex }),

  replaceCategoryPosts: (category, posts) => {
    if (category === 'My feed') set({ myFeed: posts, category });
    else if (category === 'Trending') set({ trending: posts, category });
    else set({ recommended: posts, category });
  },

  loadCategory: async (token, category) => {
    const cat = category ?? get().category;
    set({ loading: true, error: null, category: cat });
    try {
      // Flutter mapping:
      // My feed → /posts/trending
      // Trending → /posts/timeline
      // Recommended → /posts/recommended
      let data;
      if (cat === 'My feed') {
        data = await postsApi.getTrending(token);
        set({ myFeed: data.posts ?? [], loading: false });
      } else if (cat === 'Trending') {
        data = await postsApi.getTimeline(token);
        set({ trending: data.posts ?? [], loading: false });
      } else {
        data = await postsApi.getRecommended(token);
        set({ recommended: data.posts ?? [], loading: false });
      }
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load feed',
      });
    }
  },

  toggleLike: async (token, postId) => {
    const { category } = get();
    const list = [...postsFor(get(), category)];
    const idx = list.findIndex((p) => p.id === postId);
    if (idx < 0) return;

    const post = { ...list[idx] };
    const liked = !(post.isLiked ?? false);
    post.isLiked = liked;
    post.likes_count = (post.likes_count ?? 0) + (liked ? 1 : -1);
    list[idx] = post;

    if (category === 'My feed') set({ myFeed: list });
    else if (category === 'Trending') set({ trending: list });
    else set({ recommended: list });

    try {
      await postsApi.likeToggle(token, postId);
    } catch {
      post.isLiked = !liked;
      post.likes_count = (post.likes_count ?? 0) + (liked ? -1 : 1);
      list[idx] = post;
      if (category === 'My feed') set({ myFeed: list });
      else if (category === 'Trending') set({ trending: list });
      else set({ recommended: list });
    }
  },

  removePost: (postId) => {
    const { myFeed, trending, recommended } = get();
    set({
      myFeed: myFeed.filter((p) => p.id !== postId),
      trending: trending.filter((p) => p.id !== postId),
      recommended: recommended.filter((p) => p.id !== postId),
    });
  },

  removePostsByUser: (userId) => {
    const match = (p: Post) =>
      p.user_id !== userId && p.user?.id !== userId;
    const { myFeed, trending, recommended } = get();
    set({
      myFeed: myFeed.filter(match),
      trending: trending.filter(match),
      recommended: recommended.filter(match),
    });
  },
}));
