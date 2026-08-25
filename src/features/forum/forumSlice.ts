import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';
import { toApiError, type ApiErrorInfo } from '../../api/apiError';

export type ModerationStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

/** A forum board (the spec's Forum; backend `Thread` document). */
export interface Thread {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  slug: string | null;
  coverImage: string | null;
  bannerImage: string | null;
  language: string | null;
  tags: string[];
  nsfw: boolean;
  isPrivate: boolean;
  moderationStatus: ModerationStatus | null;
  authorId: string;
  authorName: string;
  postCount: number;
  replyCount: number;
  memberCount: number;
  weeklyActivityScore: number;
  upvotes: number;
  downvotes: number;
  /** Net forum vote score (upvotes - downvotes). */
  score: number;
  /** The current user's vote on this forum: 1 (up), -1 (down) or 0 (none). */
  myVote: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface Post {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  title: string;
  body: string;
  excerpt: string;
  commentCount: number;
  upvotes: number;
  downvotes: number;
  score: number;
  /** The current user's vote on this post: 1 (up), -1 (down) or 0 (none). */
  myVote: number;
  moderationStatus: ModerationStatus | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  /** Id of the comment this replies to, or null for a top-level reply. */
  parentCommentId: string | null;
  authorId: string;
  authorName: string;
  body: string;
  upvotes: number;
  downvotes: number;
  score: number;
  /** The current user's vote on this comment: 1 (up), -1 (down) or 0 (none). */
  myVote: number;
  moderationStatus: ModerationStatus | null;
  createdAt: string;
}

/** The tallies returned by a vote endpoint, echoing the caller's resulting vote. */
export interface VoteResult {
  upvotes: number;
  downvotes: number;
  score: number;
  myVote: number;
}

export interface DiscoveryRails {
  trending: Thread[];
  rising: Thread[];
  newest: Thread[];
}

export interface ForumSearchParams {
  q?: string;
  searchIn?: string[];
  category?: string;
  activityLevel?: string;
  minMembers?: number;
  maxMembers?: number;
  language?: string;
  sortBy?: string;
  nsfw?: boolean;
  page?: number;
  size?: number;
}

export interface SearchResultPage {
  items: Thread[];
  total: number;
  page: number;
  size: number;
  hasMore: boolean;
}

export interface ModerationFlag {
  type: string;
  confidence: number;
  detectedWords: string[] | null;
  detectedLanguage: string | null;
  createdAt: string;
}

export interface ModerationItem {
  id: string;
  type: 'POST' | 'COMMENT';
  forumId: string;
  postId: string | null;
  title: string | null;
  excerpt: string | null;
  authorId: string;
  authorName: string;
  moderationStatus: ModerationStatus | null;
  flags: ModerationFlag[] | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface ModerationStats {
  pendingPosts: number;
  pendingComments: number;
  pending: number;
  approvedPosts: number;
  approvedComments: number;
  rejectedPosts: number;
  rejectedComments: number;
}

export interface ForumPermissions {
  canModerate: boolean;
  canBanUsers: boolean;
  canManageRoles: boolean;
  canEditForumSettings: boolean;
  [key: string]: boolean;
}

export interface CreateForumInput {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  coverImage?: string;
  bannerImage?: string;
  language?: string;
  nsfw?: boolean;
  isPrivate?: boolean;
}

interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface ForumState {
  threads: Thread[];
  threadsCursor: string | null;
  rails: DiscoveryRails | null;
  railsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  search: SearchResultPage | null;
  searchStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  posts: Record<string, Post[]>;       // by threadId
  postsById: Record<string, Post>;     // by postId — powers the single-post page
  comments: Record<string, Comment[]>; // by postId
  permissions: Record<string, ForumPermissions>; // by forumId
  moderationQueue: ModerationItem[];
  moderationStats: ModerationStats | null;
  streamConnected: boolean;
  moderationSignal: number; // bumped by realtime CONTENT_FLAGGED/RESOLVED to trigger a queue refetch
  lastEventType: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

/** A realtime forum event as delivered over SSE (mirror of the backend ForumEvent). */
export interface ForumEvent {
  type: string;
  forumId: string;
  postId: string | null;
  actorId: string | null;
  actorName: string | null;
  title: string | null;
  message: string | null;
  /** Present on FORUM_VOTE events: the forum's refreshed tallies. */
  upvotes?: number;
  downvotes?: number;
  score?: number;
  at: string;
}

const initialState: ForumState = {
  threads: [],
  threadsCursor: null,
  rails: null,
  railsStatus: 'idle',
  search: null,
  searchStatus: 'idle',
  posts: {},
  postsById: {},
  comments: {},
  permissions: {},
  moderationQueue: [],
  moderationStats: null,
  streamConnected: false,
  moderationSignal: 0,
  lastEventType: null,
  status: 'idle',
  error: null,
};

export const fetchThreads = createAsyncThunk(
  'forum/fetchThreads',
  async (cursor: string | undefined = undefined) => {
    const { data } = await apiClient.get<CursorPage<Thread>>('/api/forums', {
      params: { cursor, limit: 20 },
    });
    return { page: data, append: Boolean(cursor) };
  },
);

export const fetchRails = createAsyncThunk('forum/fetchRails', async (limit: number = 12) => {
  const { data } = await apiClient.get<DiscoveryRails>('/api/forums/rails', { params: { limit } });
  return data;
});

export const searchForums = createAsyncThunk('forum/search', async (params: ForumSearchParams) => {
  const { data } = await apiClient.get<SearchResultPage>('/api/forums/search', {
    params: {
      q: params.q || undefined,
      searchIn: params.searchIn,
      category: params.category || undefined,
      activityLevel: params.activityLevel || undefined,
      minMembers: params.minMembers,
      maxMembers: params.maxMembers,
      language: params.language || undefined,
      sortBy: params.sortBy || undefined,
      nsfw: params.nsfw,
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });
  return data;
});

/**
 * Content-creating thunks reject with an {@link ApiErrorInfo} so the dialogs can tell the author
 * what actually happened (moderation rejection, expired session, missing forum) instead of
 * showing one generic "try again" for every status.
 */
export const createThread = createAsyncThunk<Thread, CreateForumInput, { rejectValue: ApiErrorInfo }>(
  'forum/createThread',
  async (req, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<Thread>('/api/forums', req);
      return data;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  },
);

export const fetchPosts = createAsyncThunk('forum/fetchPosts', async (threadId: string) => {
  const { data } = await apiClient.get<CursorPage<Post>>(`/api/forums/${threadId}/posts`, {
    params: { limit: 20 },
  });
  return { threadId, items: data.items };
});

export const createPost = createAsyncThunk<
  Post,
  { threadId: string; title: string; body: string },
  { rejectValue: ApiErrorInfo }
>(
  'forum/createPost',
  async ({ threadId, title, body }, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<Post>(`/api/forums/${threadId}/posts`, { title, body });
      return data;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  },
);

/** Fetches a single post (for its dedicated page), independent of any forum listing. */
export const fetchPost = createAsyncThunk('forum/fetchPost', async (postId: string) => {
  const { data } = await apiClient.get<Post>(`/api/posts/${postId}`);
  return data;
});

export const fetchComments = createAsyncThunk('forum/fetchComments', async (postId: string) => {
  const { data } = await apiClient.get<CursorPage<Comment>>(`/api/posts/${postId}/comments`, {
    params: { limit: 200 },
  });
  return { postId, items: data.items };
});

export const createComment = createAsyncThunk<
  Comment,
  { postId: string; body: string; parentCommentId?: string | null },
  { rejectValue: ApiErrorInfo }
>(
  'forum/createComment',
  async ({ postId, body, parentCommentId }, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<Comment>(`/api/posts/${postId}/comments`,
        { body, parentCommentId: parentCommentId ?? null });
      return data;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  },
);

/** Casts/toggles/clears the current user's vote on a post (value: 1 | -1 | 0). */
export const votePost = createAsyncThunk(
  'forum/votePost',
  async ({ postId, value }: { postId: string; value: number }) => {
    const { data } = await apiClient.post<VoteResult>(`/api/posts/${postId}/vote`, { value });
    return { postId, result: data };
  },
);

/** Casts/toggles/clears the current user's vote on a comment (value: 1 | -1 | 0). */
export const voteComment = createAsyncThunk(
  'forum/voteComment',
  async ({ commentId, postId, value }: { commentId: string; postId: string; value: number }) => {
    const { data } = await apiClient.post<VoteResult>(`/api/comments/${commentId}/vote`, { value });
    return { commentId, postId, result: data };
  },
);

/** Casts/toggles/clears the current user's vote on a forum itself (value: 1 | -1 | 0). */
export const voteForum = createAsyncThunk(
  'forum/voteForum',
  async ({ forumId, value }: { forumId: string; value: number }) => {
    const { data } = await apiClient.post<VoteResult>(`/api/forums/${forumId}/vote`, { value });
    return { forumId, result: data };
  },
);

export const fetchMyPermissions = createAsyncThunk(
  'forum/fetchMyPermissions',
  async (forumId: string) => {
    const { data } = await apiClient.get<ForumPermissions>(`/api/forums/${forumId}/me/permissions`);
    return { forumId, permissions: data };
  },
);

export const reportContent = createAsyncThunk(
  'forum/report',
  async ({ forumId, kind, id, reason }:
    { forumId: string; kind: 'posts' | 'comments'; id: string; reason?: string }) => {
    await apiClient.post(`/api/forums/${forumId}/moderation/${kind}/${id}/report`, { reason });
    return { id };
  },
);

export const fetchModerationQueue = createAsyncThunk(
  'forum/moderationQueue',
  async ({ forumId, status, type }: { forumId: string; status?: string; type?: string }) => {
    const { data } = await apiClient.get<ModerationItem[]>(
      `/api/forums/${forumId}/moderation/queue`,
      { params: { status: status || 'PENDING', type: type || 'ALL', limit: 50 } },
    );
    return data;
  },
);

export const fetchModerationStats = createAsyncThunk(
  'forum/moderationStats',
  async (forumId: string) => {
    const { data } = await apiClient.get<ModerationStats>(`/api/forums/${forumId}/moderation/stats`);
    return data;
  },
);

export const resolveModeration = createAsyncThunk(
  'forum/resolveModeration',
  async ({ forumId, kind, id, action, reason }:
    { forumId: string; kind: 'posts' | 'comments'; id: string;
      action: 'approve' | 'reject'; reason?: string }) => {
    await apiClient.post(
      `/api/forums/${forumId}/moderation/${kind}/${id}/${action}`,
      action === 'reject' ? { reason } : {},
    );
    return { id };
  },
);

/** Applies a partial update to a forum wherever it's cached (list, rails, search results). */
function patchForum(state: ForumState, forumId: string, patch: Partial<Thread>) {
  const touch = (t: Thread) => {
    if (t.id === forumId) Object.assign(t, patch);
  };
  state.threads.forEach(touch);
  if (state.rails) {
    state.rails.trending.forEach(touch);
    state.rails.rising.forEach(touch);
    state.rails.newest.forEach(touch);
  }
  state.search?.items.forEach(touch);
}

const forumSlice = createSlice({
  name: 'forum',
  initialState,
  reducers: {
    clearSearch(state) {
      state.search = null;
      state.searchStatus = 'idle';
    },
    setStreamConnected(state, action: { payload: boolean }) {
      state.streamConnected = action.payload;
    },
    /** Applies realtime forum vote tallies from the discovery stream (leaves the caller's myVote alone). */
    forumVoteUpdated(state, action: { payload: { forumId: string; upvotes: number; downvotes: number; score: number } }) {
      const { forumId, upvotes, downvotes, score } = action.payload;
      patchForum(state, forumId, { upvotes, downvotes, score });
    },
    /** Applies a realtime forum event; heavy list refreshes are dispatched by the stream hook. */
    forumEventReceived(state, action: { payload: ForumEvent }) {
      const ev = action.payload;
      state.lastEventType = ev.type;
      if (ev.type === 'CONTENT_FLAGGED' || ev.type === 'CONTENT_RESOLVED') {
        state.moderationSignal += 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchThreads.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchThreads.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.threads = a.payload.append ? [...s.threads, ...a.payload.page.items] : a.payload.page.items;
        s.threadsCursor = a.payload.page.nextCursor;
      })
      .addCase(fetchThreads.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message ?? 'Failed'; })
      .addCase(fetchRails.pending, (s) => { s.railsStatus = 'loading'; })
      .addCase(fetchRails.fulfilled, (s, a) => { s.railsStatus = 'succeeded'; s.rails = a.payload; })
      .addCase(fetchRails.rejected, (s) => { s.railsStatus = 'failed'; })
      .addCase(searchForums.pending, (s) => { s.searchStatus = 'loading'; })
      .addCase(searchForums.fulfilled, (s, a) => { s.searchStatus = 'succeeded'; s.search = a.payload; })
      .addCase(searchForums.rejected, (s) => { s.searchStatus = 'failed'; })
      .addCase(createThread.fulfilled, (s, a) => { s.threads.unshift(a.payload); })
      .addCase(fetchPosts.fulfilled, (s, a) => {
        s.posts[a.payload.threadId] = a.payload.items;
        for (const p of a.payload.items) s.postsById[p.id] = p;
      })
      .addCase(fetchPost.fulfilled, (s, a) => { s.postsById[a.payload.id] = a.payload; })
      .addCase(createPost.fulfilled, (s, a) => {
        const list = s.posts[a.payload.threadId] ?? [];
        s.posts[a.payload.threadId] = [a.payload, ...list];
        s.postsById[a.payload.id] = a.payload;
      })
      .addCase(votePost.fulfilled, (s, a) => {
        const { postId, result } = a.payload;
        const apply = (p: Post) => {
          p.upvotes = result.upvotes; p.downvotes = result.downvotes;
          p.score = result.score; p.myVote = result.myVote;
        };
        if (s.postsById[postId]) apply(s.postsById[postId]);
        for (const list of Object.values(s.posts)) {
          const found = list.find((p) => p.id === postId);
          if (found) apply(found);
        }
      })
      .addCase(voteForum.fulfilled, (s, a) => {
        const { forumId, result } = a.payload;
        patchForum(s, forumId, {
          upvotes: result.upvotes, downvotes: result.downvotes,
          score: result.score, myVote: result.myVote,
        });
      })
      .addCase(fetchComments.fulfilled, (s, a) => { s.comments[a.payload.postId] = a.payload.items; })
      .addCase(createComment.fulfilled, (s, a) => {
        const list = s.comments[a.payload.postId] ?? [];
        s.comments[a.payload.postId] = [...list, a.payload];
        // Held (PENDING) replies don't count publicly, mirroring the backend's counter rule.
        const parent = s.postsById[a.payload.postId];
        if (parent && a.payload.moderationStatus !== 'PENDING') parent.commentCount += 1;
      })
      .addCase(voteComment.fulfilled, (s, a) => {
        const { commentId, postId, result } = a.payload;
        const found = (s.comments[postId] ?? []).find((c) => c.id === commentId);
        if (found) {
          found.upvotes = result.upvotes; found.downvotes = result.downvotes;
          found.score = result.score; found.myVote = result.myVote;
        }
      })
      .addCase(fetchMyPermissions.fulfilled, (s, a) => {
        s.permissions[a.payload.forumId] = a.payload.permissions;
      })
      .addCase(fetchModerationQueue.fulfilled, (s, a) => { s.moderationQueue = a.payload; })
      .addCase(fetchModerationStats.fulfilled, (s, a) => { s.moderationStats = a.payload; })
      .addCase(resolveModeration.fulfilled, (s, a) => {
        s.moderationQueue = s.moderationQueue.filter((i) => i.id !== a.payload.id);
      });
  },
});

export const { clearSearch, setStreamConnected, forumEventReceived, forumVoteUpdated } =
  forumSlice.actions;
export default forumSlice.reducer;
