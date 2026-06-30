import axios from 'axios';

/**
 * Single axios instance for all calls to the API gateway. A request interceptor attaches the
 * JWT (kept in localStorage by the auth slice); a response interceptor clears it on 401 so the
 * UI can route the user back to login.
 */
/**
 * API gateway base URL.
 * - unset (local `npm run dev`) → talk to the gateway directly on :8080.
 * - empty string (the nginx-proxied production build) → same-origin relative URLs, so the app
 *   works behind any host/tunnel (LAN IP, Cloudflare, …) with no rebuild and no CORS.
 */
const rawApiBase = import.meta.env.VITE_API_BASE as string | undefined;
export const API_BASE = rawApiBase === undefined ? 'http://localhost:8080' : rawApiBase;

export const TOKEN_KEY = 'mtg.accessToken';
export const REFRESH_KEY = 'mtg.refreshToken';

export const apiClient = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
    return Promise.reject(error);
  },
);
