import axios from 'axios';

/**
 * Single axios instance for all calls to the API gateway. A request interceptor attaches the
 * JWT (kept in localStorage by the auth slice); a response interceptor clears it on 401 so the
 * UI can route the user back to login.
 */
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://torresowo.myftp.org:7777/mtg-commander';

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
