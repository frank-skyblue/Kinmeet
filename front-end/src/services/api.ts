import axios from 'axios';
import type {
  GetConnectionRequestsResponse,
  GetConversationsResponse,
  RegisterPayload,
  UpdateProfilePayload,
  RegisterNotificationDevicePayload,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const API_BASE = API_URL.replace(/\/api$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const SKIP_SANITIZE_KEYS = new Set(['password', 'confirmPassword', 'token', 'accessToken', 'refreshToken']);

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

const sanitizeRequestData = (value: unknown): unknown => {
  if (shouldSkipSanitizeValue(value)) return value;
  if (typeof value === 'string') return removeControlCharacters(value).trim();
  if (Array.isArray(value)) return value.map((item) => sanitizeRequestData(item));
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SKIP_SANITIZE_KEYS.has(key) ? item : sanitizeRequestData(item),
      ]),
    );
  }
  return value;
};

api.interceptors.request.use((config) => {
  if (config.data !== undefined) {
    config.data = sanitizeRequestData(config.data);
  }
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: RegisterPayload) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

export const profileAPI = {
  getProfile: async () => {
    const response = await api.get('/profile/me');
    return response.data;
  },

  getUserProfile: async (userId: string) => {
    const response = await api.get(`/profile/${userId}`);
    return response.data;
  },

  updateProfile: async (data: UpdateProfilePayload) => {
    const response = await api.put('/profile/me', data);
    return response.data;
  },

  deleteProfile: async () => {
    const response = await api.delete('/profile/me');
    return response.data;
  },

  uploadPhoto: async (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post('/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deletePhoto: async () => {
    const response = await api.delete('/profile/photo');
    return response.data;
  },
};

export const matchingAPI = {
  getMatches: async () => {
    const response = await api.get('/matching');
    return response.data;
  },

  sendMeetRequest: async (receiverId: string) => {
    const response = await api.post('/matching/meet', { receiverId });
    return response.data;
  },

  passUser: async () => {
    const response = await api.post('/matching/pass');
    return response.data;
  },
};

export const connectionsAPI = {
  getConnections: async () => {
    const response = await api.get('/connections');
    return response.data;
  },

  getConnectionRequests: async (): Promise<GetConnectionRequestsResponse> => {
    const response = await api.get<GetConnectionRequestsResponse>('/connections/requests');
    return response.data;
  },

  acceptRequest: async (requestId: string) => {
    const response = await api.post(`/connections/requests/${requestId}/accept`);
    return response.data;
  },

  ignoreRequest: async (requestId: string) => {
    const response = await api.post(`/connections/requests/${requestId}/ignore`);
    return response.data;
  },

  removeConnection: async (otherUserId: string) => {
    const response = await api.delete(`/connections/${otherUserId}`);
    return response.data;
  },
};

export const chatAPI = {
  getConversations: async (): Promise<GetConversationsResponse> => {
    const response = await api.get<GetConversationsResponse>('/chat/conversations');
    return response.data;
  },

  getConversation: async (userId: string) => {
    const response = await api.get(`/chat/conversations/${userId}`);
    return response.data;
  },

  markAsRead: async (senderId: string) => {
    const response = await api.post('/chat/messages/read', { senderId });
    return response.data;
  },
};

export const notificationsAPI = {
  registerDevice: async (payload: RegisterNotificationDevicePayload) => {
    const response = await api.post('/notifications/devices', payload);
    return response.data;
  },

  unregisterDevice: async (payload: RegisterNotificationDevicePayload) => {
    const response = await api.delete('/notifications/devices', { data: payload });
    return response.data;
  },
};

export const blockAPI = {
  blockUser: async (userId: string, reason?: string) => {
    const response = await api.post('/block/block', { userId, reason });
    return response.data;
  },

  unblockUser: async (userId: string) => {
    const response = await api.delete(`/block/unblock/${userId}`);
    return response.data;
  },

  getBlockedUsers: async () => {
    const response = await api.get('/block/blocked');
    return response.data;
  },

  reportUser: async (userId: string, reason: string) => {
    const response = await api.post('/block/report', { userId, reason });
    return response.data;
  },
};

export const getPhotoUrl = (photoPath: string) => {
  if (photoPath.startsWith('http')) return photoPath;
  return `${API_BASE}${photoPath}`;
};

export default api;
