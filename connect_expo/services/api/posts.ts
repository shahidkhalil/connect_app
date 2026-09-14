import { AppApis } from '@/constants/api';
import { ApiError, apiRequest } from '@/services/api/client';
import type { PostModel } from '@/types/posts';
import { parseStoriesPayload, type StoriesPayload } from '@/types/stories';
import { File, UploadType } from 'expo-file-system';

/** Mirrors Flutter `HttpsServices` post / social methods. */
export async function getTimeline(token: string, type?: string): Promise<PostModel> {
  return apiRequest<PostModel>(type ?? AppApis.postsTimeLine, { token });
}

export async function getTrending(token: string): Promise<PostModel> {
  return apiRequest<PostModel>(AppApis.getTrendingPosts, { token });
}

export async function getRecommended(token: string): Promise<PostModel> {
  return apiRequest<PostModel>(AppApis.getRecommendedPosts, { token });
}

export async function getMyPosts(token: string): Promise<PostModel> {
  return apiRequest<PostModel>(AppApis.posts, { token });
}

export async function likeToggle(token: string, id: number): Promise<unknown> {
  return apiRequest(`${AppApis.toggleLikes}${id}`, {
    method: 'POST',
    token,
  });
}

export async function searchPosts(token: string, query: string): Promise<PostModel> {
  const raw = await apiRequest<unknown>(AppApis.getSearchData, {
    method: 'POST',
    token,
    absoluteUrl: AppApis.getSearchData,
    body: { query },
  });
  return normalizeSearchResponse(raw);
}

/** Accept common backend shapes: { posts }, { data: posts }, or bare array. */
function normalizeSearchResponse(raw: unknown): PostModel {
  if (!raw) return { posts: [] };
  if (Array.isArray(raw)) return { posts: raw as PostModel['posts'] };
  if (typeof raw !== 'object') return { posts: [] };
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.posts)) return { posts: o.posts as PostModel['posts'], message: typeof o.message === 'string' ? o.message : undefined };
  if (Array.isArray(o.data)) return { posts: o.data as PostModel['posts'] };
  if (o.data && typeof o.data === 'object' && Array.isArray((o.data as { posts?: unknown }).posts)) {
    return { posts: (o.data as { posts: PostModel['posts'] }).posts };
  }
  return { posts: [] };
}

export async function followUser(token: string, id: number): Promise<unknown> {
  return apiRequest(`${AppApis.followUserApi}${id}`, {
    method: 'POST',
    token,
    absoluteUrl: `${AppApis.followUserApi}${id}`,
  });
}

export async function unfollowUser(token: string, id: number): Promise<unknown> {
  return apiRequest(`${AppApis.unFollowUserApi}${id}`, {
    method: 'POST',
    token,
    absoluteUrl: `${AppApis.unFollowUserApi}${id}`,
  });
}

export async function blockUser(token: string, userId: number): Promise<unknown> {
  return apiRequest(`${AppApis.block}${userId}`, {
    method: 'POST',
    token,
    absoluteUrl: `${AppApis.block}${userId}`,
  });
}

export async function unblockUser(token: string, userId: number): Promise<unknown> {
  return apiRequest(`${AppApis.unBlock}${userId}`, {
    method: 'POST',
    token,
    absoluteUrl: `${AppApis.unBlock}${userId}`,
  });
}

export async function getBlockedUsers(token: string): Promise<unknown> {
  return apiRequest(AppApis.blocked, {
    token,
    absoluteUrl: AppApis.blocked,
  });
}

export async function reportPost(token: string, postId: number): Promise<unknown> {
  return apiRequest(`${AppApis.report}${postId}`, {
    method: 'POST',
    token,
    absoluteUrl: `${AppApis.report}${postId}`,
  });
}

export async function getTags(token: string): Promise<unknown> {
  return apiRequest(AppApis.getTags, {
    token,
    absoluteUrl: AppApis.getTags,
  });
}

export async function createTag(token: string, name: string): Promise<unknown> {
  return apiRequest(AppApis.getTags, {
    method: 'POST',
    token,
    absoluteUrl: AppApis.getTags,
    body: { name },
  });
}

export async function ratePost(
  token: string,
  id: number,
  rating: number,
  comment: string,
): Promise<unknown> {
  return apiRequest(`${AppApis.ratePostApi}${id}`, {
    method: 'POST',
    token,
    absoluteUrl: `${AppApis.ratePostApi}${id}`,
    body: { rating, comment },
  });
}

export async function getPostStats(token: string, id: number): Promise<unknown> {
  return apiRequest(`${AppApis.statsOfVideoApi}${id}`, {
    token,
    absoluteUrl: `${AppApis.statsOfVideoApi}${id}`,
  });
}

export async function deletePost(token: string, id: number): Promise<unknown> {
  return apiRequest(`${AppApis.deleteVideoApi}${id}`, {
    method: 'DELETE',
    token,
    absoluteUrl: `${AppApis.deleteVideoApi}${id}`,
  });
}

export async function createPost(
  token: string,
  fields: {
    title: string;
    info: string;
    lat: number;
    lng: number;
    city: string;
    state: string;
    country: string;
    tags: string[];
    expiryDate: string;
    videoUri: string;
    videoName?: string;
  },
): Promise<unknown> {
  // Expo winter fetch rejects RN {uri,name,type} FormData parts — use File.upload.
  const file = new File(normalizeLocalUri(fields.videoUri));
  const result = await file.upload(`${AppApis.baseUrl}${AppApis.posts}`, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'video',
    mimeType: 'video/mp4',
    parameters: {
      title: fields.title,
      info: fields.info,
      lat: String(fields.lat),
      lng: String(fields.lng),
      city: fields.city,
      state: fields.state,
      country: fields.country,
      tags: JSON.stringify(fields.tags),
      'expiry date': fields.expiryDate,
    },
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return parseUploadJson(result);
}

export async function getStories(token: string): Promise<StoriesPayload> {
  const raw = await apiRequest(AppApis.stories, {
    token,
    absoluteUrl: AppApis.stories,
  });
  return parseStoriesPayload(raw);
}

export async function viewStory(token: string, id: number): Promise<boolean> {
  try {
    await apiRequest(`${AppApis.stories}/${id}`, {
      token,
      absoluteUrl: `${AppApis.stories}/${id}`,
    });
    return true;
  } catch {
    return false;
  }
}

function normalizeLocalUri(mediaUri: string) {
  let uri = mediaUri.trim();
  if (
    uri &&
    !uri.startsWith('file://') &&
    !uri.startsWith('content://') &&
    !uri.startsWith('ph://') &&
    !uri.startsWith('assets-library://') &&
    uri.startsWith('/')
  ) {
    uri = `file://${uri}`;
  }
  return uri;
}

function parseUploadJson(result: { body: string; status: number }): unknown {
  let json: unknown = null;
  if (result.body) {
    try {
      json = JSON.parse(result.body);
    } catch {
      json = result.body;
    }
  }
  if (result.status < 200 || result.status >= 300) {
    const message =
      typeof json === 'object' && json && 'message' in json
        ? String((json as { message: unknown }).message)
        : typeof json === 'string' && json
          ? json
          : `Request failed (${result.status})`;
    throw new ApiError(message, result.status, json);
  }
  return json;
}

export async function createStory(
  token: string,
  caption: string,
  mediaUri: string,
  mimeType: string,
  _fileName: string,
  onProgress?: (progress: number) => void,
): Promise<unknown> {
  // Expo SDK 57 fetch throws "Unsupported FormDataPart implementation" for
  // React Native { uri, name, type } parts — upload via expo-file-system instead.
  const file = new File(normalizeLocalUri(mediaUri));
  const result = await file.upload(AppApis.stories, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'media',
    mimeType,
    parameters: {
      caption: caption ?? '',
    },
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    onProgress: ({ bytesSent, totalBytes }) => {
      if (!onProgress || !totalBytes || totalBytes <= 0) return;
      onProgress(Math.min(0.99, bytesSent / totalBytes));
    },
  });
  onProgress?.(1);
  return parseUploadJson(result);
}
