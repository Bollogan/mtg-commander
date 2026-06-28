import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';

export interface Thread {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  authorId: string;
  authorName: string;
  postCount: number;
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
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface ForumState {
  threads: Thread[];
  threadsCursor: string | null;
  posts: Record<string, Post[]>;       // by threadId
  comments: Record<string, Comment[]>; // by postId
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ForumState = {
  threads: [],
  threadsCursor: null,
  posts: {},
  comments: {},
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

export const createThread = createAsyncThunk(
  'forum/createThread',
  async (req: { title: string; description?: string; category?: string }) => {
    const { data } = await apiClient.post<Thread>('/api/forums', req);
    return data;
  },
);

export const fetchPosts = createAsyncThunk('forum/fetchPosts', async (threadId: string) => {
  const { data } = await apiClient.get<CursorPage<Post>>(`/api/forums/${threadId}/posts`, {
    params: { limit: 20 },
  });
  return { threadId, items: data.items };
});

export const createPost = createAsyncThunk(
  'forum/createPost',
  async ({ threadId, title, body }: { threadId: string; title: string; body: string }) => {
    const { data } = await apiClient.post<Post>(`/api/forums/${threadId}/posts`, { title, body });
    return data;
  },
);

export const fetchComments = createAsyncThunk('forum/fetchComments', async (postId: string) => {
  const { data } = await apiClient.get<CursorPage<Comment>>(`/api/posts/${postId}/comments`, {
    params: { limit: 30 },
  });
  return { postId, items: data.items };
});

export const createComment = createAsyncThunk(
  'forum/createComment',
  async ({ postId, body }: { postId: string; body: string }) => {
    const { data } = await apiClient.post<Comment>(`/api/posts/${postId}/comments`, { body });
    return data;
  },
);

const forumSlice = createSlice({
  name: 'forum',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchThreads.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchThreads.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.threads = a.payload.append ? [...s.threads, ...a.payload.page.items] : a.payload.page.items;
        s.threadsCursor = a.payload.page.nextCursor;
      })
      .addCase(fetchThreads.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message ?? 'Failed'; })
      .addCase(createThread.fulfilled, (s, a) => { s.threads.unshift(a.payload); })
      .addCase(fetchPosts.fulfilled, (s, a) => { s.posts[a.payload.threadId] = a.payload.items; })
      .addCase(createPost.fulfilled, (s, a) => {
        const list = s.posts[a.payload.threadId] ?? [];
        s.posts[a.payload.threadId] = [a.payload, ...list];
      })
      .addCase(fetchComments.fulfilled, (s, a) => { s.comments[a.payload.postId] = a.payload.items; })
      .addCase(createComment.fulfilled, (s, a) => {
        const list = s.comments[a.payload.postId] ?? [];
        s.comments[a.payload.postId] = [...list, a.payload];
      });
  },
});

export default forumSlice.reducer;
