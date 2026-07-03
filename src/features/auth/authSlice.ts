import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import i18n from '../../i18n';
import { apiClient, TOKEN_KEY, REFRESH_KEY } from '../../api/client';

/** Maps an auth request failure to a clear, translated message (instead of axios's raw text). */
function authErrorMessage(err: unknown, invalidKey: string): string {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  if (status === 401 || status === 403) return i18n.t(invalidKey);
  if (status === 409) return i18n.t('auth.errEmailExists');
  return i18n.t('auth.errGeneric');
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  userId: string | null;
  displayName: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

interface AuthResponse {
  accessToken?: string;
  token?: string;
  refreshToken: string;
  userId?: string;
  displayName?: string;
}

/** Decodes the `uid` and `sub` claims from a JWT without verifying the signature (client-side only). */
function decodeJwt(token: string): { uid?: string; sub?: string } {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function persist(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

const initialToken = localStorage.getItem(TOKEN_KEY);
const initialClaims = initialToken ? decodeJwt(initialToken) : {};

const initialState: AuthState = {
  token: initialToken,
  refreshToken: localStorage.getItem(REFRESH_KEY),
  userId: initialClaims.uid ?? null,
  displayName: initialClaims.sub ?? null,
  status: 'idle',
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (creds: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<AuthResponse>('/api/auth/login', creds);
      return data;
    } catch (err) {
      return rejectWithValue(authErrorMessage(err, 'auth.errInvalidCredentials'));
    }
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async (req: { email: string; displayName: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<AuthResponse>('/api/auth/register', req);
      return data;
    } catch (err) {
      return rejectWithValue(authErrorMessage(err, 'auth.errGeneric'));
    }
  },
);

export const googleLogin = createAsyncThunk(
  'auth/google',
  async (idToken: string) => {
    const { data } = await apiClient.post<AuthResponse>('/api/auth/google', { idToken });
    return data;
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      state.token = null;
      state.refreshToken = null;
      state.userId = null;
      state.displayName = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const applyAuth = (state: AuthState, payload: AuthResponse) => {
      const accessToken = payload.accessToken ?? payload.token ?? '';
      persist(accessToken, payload.refreshToken);
      const claims = decodeJwt(accessToken);
      state.token = accessToken;
      state.refreshToken = payload.refreshToken;
      state.userId = payload.userId ?? claims.uid ?? null;
      state.displayName = payload.displayName ?? claims.sub ?? null;
      state.status = 'succeeded';
      state.error = null;
    };

    builder
      .addCase(login.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(login.fulfilled, (s, a) => applyAuth(s, a.payload))
      .addCase(login.rejected, (s, a) => { s.status = 'failed'; s.error = (a.payload as string) ?? a.error.message ?? 'Login failed'; })
      .addCase(register.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(register.fulfilled, (s, a) => applyAuth(s, a.payload))
      .addCase(register.rejected, (s, a) => { s.status = 'failed'; s.error = (a.payload as string) ?? a.error.message ?? 'Registration failed'; })
      .addCase(googleLogin.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(googleLogin.fulfilled, (s, a) => applyAuth(s, a.payload))
      .addCase(googleLogin.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message ?? 'Google sign-in failed'; });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
