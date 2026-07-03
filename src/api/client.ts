import axios, { type InternalAxiosRequestConfig } from 'axios';

/**
 * Single axios instance for all calls to the API gateway. A request interceptor attaches the
 * JWT (kept in localStorage by the auth slice); a response interceptor transparently refreshes
 * an expired access token (via the refresh token) and retries the original request once, so a
 * short-lived access token no longer strands the session in a 401 loop.
 */
/**
 * API gateway base URL.
 * - unset (local `npm run dev`) → talk to the gateway.
 * - empty string (the nginx-proxied production build) → same-origin relative URLs, so the app
 *   works behind any host/tunnel (LAN IP, Cloudflare, …) with no rebuild and no CORS.
 */
const rawApiBase = import.meta.env.VITE_API_BASE as string | undefined;
export const API_BASE = rawApiBase === undefined ? 'https://torresowo.myftp.org:7777/mtg-commander' : rawApiBase;

export const TOKEN_KEY = 'mtg.accessToken';
export const REFRESH_KEY = 'mtg.refreshToken';

// Auth endpoints must never carry an Authorization header: a stale/expired token would be
// rejected by the auth-service security chain (403) and block the user from logging back in.
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/google'];
const isAuthEndpoint = (url = '') => AUTH_ENDPOINTS.some((p) => url.includes(p));

export const apiClient = axios.create({
  baseURL: API_BASE,
});

// The app registers a handler (that clears Redux auth + routes to /login) here, so this
// non-React module can end the session without importing the store (avoids a circular import).
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  onSessionExpired = handler;
};

const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

const endSession = () => {
  clearTokens();
  if (onSessionExpired) onSessionExpired();
};

apiClient.interceptors.request.use((config) => {
  if (isAuthEndpoint(config.url)) return config; // log in / register / refresh must go out clean
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh: concurrent 401s share one refresh call instead of stampeding it.
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return Promise.reject(new Error('No refresh token'));

  // Bare axios (not apiClient) so this call bypasses the interceptors and can't recurse.
  refreshPromise = axios
    .post<{ token?: string; accessToken?: string; refreshToken: string }>(
      `${API_BASE}/api/auth/refresh`,
      { refreshToken },
    )
    .then(({ data }) => {
      const newAccess = data.accessToken ?? data.token ?? '';
      if (!newAccess) throw new Error('Refresh returned no token');
      localStorage.setItem(TOKEN_KEY, newAccess);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      return newAccess;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error?.response?.status;
    const url = original?.url ?? '';
    const isAuthCall = isAuthEndpoint(url);

    // Only try to recover genuine "expired access token" 401s, once per request, and never for
    // the auth endpoints themselves (a 401 there means bad credentials / dead refresh token).
    if (status !== 401 || !original || original._retry || isAuthCall) {
      if (status === 401 && isAuthCall) {
        // Login/refresh itself failed → the session is unrecoverable.
        if (url.includes('/api/auth/refresh')) endSession();
      }
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      const newToken = await refreshAccessToken();
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      endSession();
      return Promise.reject(refreshError);
    }
  },
);
