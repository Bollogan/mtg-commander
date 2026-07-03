import { configureStore } from '@reduxjs/toolkit';
import { setSessionExpiredHandler } from '../api/client';
import authReducer, { logout } from '../features/auth/authSlice';
import profileReducer from '../features/profile/profileSlice';
import forumReducer from '../features/forum/forumSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import deckReducer from '../features/deck/deckSlice';
import gameReducer from '../features/game/gameSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    forum: forumReducer,
    notifications: notificationsReducer,
    deck: deckReducer,
    game: gameReducer,
  },
});

// When a refresh fails (dead/expired refresh token), the API layer ends the session here so the
// UI reacts (RequireAuth routes guarded pages back to /login) instead of hanging in a 401 loop.
setSessionExpiredHandler(() => store.dispatch(logout()));

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
