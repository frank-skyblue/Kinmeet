import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    homeCountry: string;
    currentLocation: {
      province: string;
      country: string;
    };
    languages: string[];
    interests: string[];
    lookingFor: string[];
    profilePhoto?: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Profile API
export const profileAPI = {
  getProfile: async () => {
    const response = await api.get('/profile/me');
    return response.data;
  },

  getUserProfile: async (userId: string) => {
    const response = await api.get(`/profile/${userId}`);
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.put('/profile/me', data);
    return response.data;
  },
};

// Matching API
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

// Connections API
export const connectionsAPI = {
  getConnections: async () => {
    const response = await api.get('/connections');
    return response.data;
  },

  getConnectionRequests: async () => {
    const response = await api.get('/connections/requests');
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
};

// Chat API
export const chatAPI = {
  getConversations: async () => {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  getConversation: async (userId: string) => {
    const response = await api.get(`/chat/conversations/${userId}`);
    return response.data;
  },

  sendMessage: async (receiverId: string, content: string) => {
    const response = await api.post('/chat/messages', { receiverId, content });
    return response.data;
  },

  markAsRead: async (senderId: string) => {
    const response = await api.post('/chat/messages/read', { senderId });
    return response.data;
  },
};

// Block API
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

export default api;

