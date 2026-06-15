import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';

export interface Notification {
  id: string;
  type: string;
  recipientId: string;
  actorId: string | null;
  message: string;
  createdAt: string;
}

interface NotificationState {
  items: Notification[];
  unread: number;
  connected: boolean;
}

const initialState: NotificationState = {
  items: [],
  unread: 0,
  connected: false,
};

export const fetchRecentNotifications = createAsyncThunk('notifications/recent', async () => {
  const { data } = await apiClient.get<Notification[]>('/api/notifications', { params: { limit: 20 } });
  return data;
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notificationReceived(state, action: PayloadAction<Notification>) {
      state.items.unshift(action.payload);
      state.unread += 1;
    },
    markAllRead(state) {
      state.unread = 0;
    },
    setConnected(state, action: PayloadAction<boolean>) {
      state.connected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchRecentNotifications.fulfilled, (s, a) => { s.items = a.payload; });
  },
});

export const { notificationReceived, markAllRead, setConnected } = notificationsSlice.actions;
export default notificationsSlice.reducer;
