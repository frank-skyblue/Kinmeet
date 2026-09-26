import axios from 'axios';
import { normalizeEmail } from '../utils/email';
import type {
  ChangeEmailPayload,
  ChangePasswordPayload,
  ChangeUsernamePayload,
  GetConnectionRequestsResponse,
  GetConnectionsResponse,
  GetConversationsResponse,
  GetMatchesResponse,
  GetBlockedUsersResponse,
  RegisterPayload,
  SubmitFeedbackPayload,
  SubmitFeedbackResponse,
  SubmitSupportRequestPayload,
  SubmitSupportRequestResponse,
  UpdateProfilePayload,
  RegisterNotificationDevicePayload,
  AdminAuthResponse,
  AdminFeedbackListResponse,
  AdminReportListResponse,
  AdminReportStatus,
  AdminReportUpdateResponse,
  AdminSessionResponse,
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

  checkEmail: async (email: string) => {
    const response = await api.post('/auth/check-email', { email });
    return response.data as { success: boolean; available?: boolean; message?: string };
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data as { success: boolean; message: string };
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data as { success: boolean; message: string };
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
  getMatches: async (): Promise<GetMatchesResponse> => {
    const response = await api.get<GetMatchesResponse>('/matching');
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
  getConnections: async (): Promise<GetConnectionsResponse> => {
    const response = await api.get<GetConnectionsResponse>('/connections');
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

  getBlockedUsers: async (): Promise<GetBlockedUsersResponse> => {
    const response = await api.get<GetBlockedUsersResponse>('/block/blocked');
    return response.data;
  },

  reportUser: async (userId: string, reason: string, details?: string) => {
    const response = await api.post('/block/report', { userId, reason, details });
    return response.data;
  },
};

export const settingsAPI = {
  changeEmail: async (payload: ChangeEmailPayload) => {
    const response = await api.patch('/settings/email', payload);
    return response.data as { success: boolean; message: string; email?: string };
  },

  changeUsername: async (payload: ChangeUsernamePayload) => {
    const response = await api.patch('/settings/username', payload);
    return response.data as { success: boolean; message: string; username?: string };
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    const response = await api.patch('/settings/password', payload);
    return response.data as { success: boolean; message: string };
  },
};

export const feedbackAPI = {
  submitFeedback: async (payload: SubmitFeedbackPayload) => {
    const formData = new FormData();
    formData.append('category', payload.category);
    formData.append('message', payload.message);
    formData.append('followUp', String(payload.followUp ?? false));
    payload.screenshots?.forEach((screenshot) => {
      formData.append('screenshots', screenshot);
    });

    const response = await api.post('/feedback', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as SubmitFeedbackResponse;
  },
};

export const supportAPI = {
  submitSupportRequest: async (payload: SubmitSupportRequestPayload) => {
    const formData = new FormData();
    formData.append('issueType', payload.issueType);
    if (payload.subject) {
      formData.append('subject', payload.subject);
    }
    formData.append('message', payload.message);
    formData.append('followUp', String(payload.followUp ?? false));
    payload.screenshots?.forEach((screenshot) => {
      formData.append('screenshots', screenshot);
    });

    const response = await api.post('/support', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as SubmitSupportRequestResponse;
  },
};

export const ADMIN_REQUEST_HEADER = 'X-KinMeet-Admin-Request';
export const ADMIN_REQUEST_HEADER_VALUE = '1';

export const adminClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const adminMutationHeaders = {
  [ADMIN_REQUEST_HEADER]: ADMIN_REQUEST_HEADER_VALUE,
};

export const adminAPI = {
  login: async (password: string): Promise<AdminAuthResponse> => {
    const response = await adminClient.post<AdminAuthResponse>(
      '/admin/login',
      { password },
      { headers: adminMutationHeaders },
    );
    return response.data;
  },

  logout: async (): Promise<AdminAuthResponse> => {
    const response = await adminClient.post<AdminAuthResponse>(
      '/admin/logout',
      {},
      { headers: adminMutationHeaders },
    );
    return response.data;
  },

  getSession: async (): Promise<AdminSessionResponse> => {
    const response = await adminClient.get<AdminSessionResponse>('/admin/session');
    return response.data;
  },

  listFeedback: async (page = 1): Promise<AdminFeedbackListResponse> => {
    const response = await adminClient.get<AdminFeedbackListResponse>('/admin/feedback', {
      params: { page },
    });
    return response.data;
  },

  listReports: async (page = 1): Promise<AdminReportListResponse> => {
    const response = await adminClient.get<AdminReportListResponse>('/admin/reports', {
      params: { page },
    });
    return response.data;
  },

  updateReportStatus: async (
    reportId: string,
    status: AdminReportStatus,
  ): Promise<AdminReportUpdateResponse> => {
    const response = await adminClient.patch<AdminReportUpdateResponse>(
      `/admin/reports/${reportId}/status`,
      { status },
      { headers: adminMutationHeaders },
    );
    return response.data;
  },
};

export const getPhotoUrl = (photoPath: string) => {
  if (photoPath.startsWith('http')) return photoPath;
  return `${API_BASE}${photoPath}`;
};

export default api;
