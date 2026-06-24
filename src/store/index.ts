import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import profileReducer from '../features/profile/profileSlice';
import forumReducer from '../features/forum/forumSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import deckReducer from '../features/deck/deckSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    forum: forumReducer,
    notifications: notificationsReducer,
    deck: deckReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
