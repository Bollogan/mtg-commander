import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';

export interface Profile {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  country: string | null;
  followerCount: number;
  followingCount: number;
  deckCount: number;
  createdAt: string;
}

export interface Badge {
  type: string;
  label: string;
  description: string;
  awardedAt: string;
}

interface FollowStatus {
  followerId: string;
  followingId: string;
  following: boolean;
  followerCount: number;
}

interface ProfileState {
  current: Profile | null;
  badges: Badge[];
  following: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ProfileState = {
  current: null,
  badges: [],
  following: false,
  status: 'idle',
  error: null,
};

export const fetchProfile = createAsyncThunk('profile/fetch', async (id: string) => {
  const [profile, badges] = await Promise.all([
    apiClient.get<Profile>(`/api/users/${id}`),
    apiClient.get<Badge[]>(`/api/users/${id}/badges`),
  ]);
  return { profile: profile.data, badges: badges.data };
});

export const fetchFollowStatus = createAsyncThunk('profile/followStatus', async (id: string) => {
  const { data } = await apiClient.get<FollowStatus>(`/api/users/${id}/follow`);
  return data;
});

export const toggleFollow = createAsyncThunk(
  'profile/toggleFollow',
  async ({ id, follow }: { id: string; follow: boolean }) => {
    const { data } = follow
      ? await apiClient.post<FollowStatus>(`/api/users/${id}/follow`)
      : await apiClient.delete<FollowStatus>(`/api/users/${id}/follow`);
    return data;
  },
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchProfile.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.current = a.payload.profile;
        s.badges = a.payload.badges;
      })
      .addCase(fetchProfile.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message ?? 'Failed'; })
      .addCase(fetchFollowStatus.fulfilled, (s, a) => { s.following = a.payload.following; })
      .addCase(toggleFollow.fulfilled, (s, a) => {
        s.following = a.payload.following;
        if (s.current && s.current.id === a.payload.followingId) {
          s.current.followerCount = a.payload.followerCount;
        }
      });
  },
});

export default profileSlice.reducer;
