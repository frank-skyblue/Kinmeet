import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from '../constants/storage';
import type { AuthResponse, GetProfileResponse, MessageResponse, RegisterPayload } from '../types';

const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

export const API_ORIGIN = API_URL.replace(/\/api$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const SKIP_SANITIZE_KEYS = new Set(['password', 'confirmPassword', 'token', 'accessToken', 'refreshToken']);

const normalizeEmail = (email: string): string =>
  email.normalize('NFKC').replace(INVISIBLE_CHARS, '').trim().toLowerCase();

const removeControlCharacters = (value: string) =>
  Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 0x1f && code !== 0x7f;
    })
    .join('');

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const shouldSkipSanitizeValue = (value: unknown) =>
  (typeof FormData !== 'undefined' && value instanceof FormData)
  || (typeof File !== 'undefined' && value instanceof File)
  || (typeof Blob !== 'undefined' && value instanceof Blob);

const sanitizeString = (value: string, key?: string) => {
  const cleaned = removeControlCharacters(value);
  if (key === 'email') return normalizeEmail(cleaned);
  return cleaned.trim();
};

const sanitizeRequestData = (value: unknown, key?: string): unknown => {
  if (shouldSkipSanitizeValue(value)) return value;
  if (typeof value === 'string') return sanitizeString(value, key);
  if (Array.isArray(value)) return value.map((item) => sanitizeRequestData(item));
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, item]) => [
        entryKey,
        SKIP_SANITIZE_KEYS.has(entryKey) ? item : sanitizeRequestData(item, entryKey),
      ]),
    );
  }
  return value;
};

api.interceptors.request.use(async (config) => {
  if (config.data !== undefined) {
    config.data = sanitizeRequestData(config.data);
  }
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: RegisterPayload) => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post<MessageResponse>('/auth/logout');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post<MessageResponse>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post<MessageResponse>('/auth/reset-password', { token, newPassword });
    return response.data;
  },
};

export const profileAPI = {
  getProfile: async () => {
    const response = await api.get<GetProfileResponse>('/profile/me');
    return response.data;
  },
};

export const getPhotoUrl = (photoPath: string) => {
  if (photoPath.startsWith('http')) return photoPath;
  return `${API_ORIGIN}${photoPath}`;
};

export default api;
