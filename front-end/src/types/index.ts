export type SearchableSelectOption = {
    value: string;
    label: string;
};

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    photo?: string;
    profileComplete: boolean;
}

export interface UserProfile {
    _id: string;
    email?: string;
    firstName: string;
    lastName?: string;
    about?: string;
    jobTitle?: string;
    company?: string;
    institution?: string;
    graduationYear?: number;
    homeCountry: string;
    currentProvince: string;
    currentCountry: string;
    languages: string[];
    interests: string[];
    lookingFor: string[];
    photo?: string;
    profileComplete?: boolean;
}

export interface ChatMessage {
    _id: string;
    sender: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    receiver: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    content: string;
    read: boolean;
    createdAt: string;
}

export interface ChatConversationUser {
    _id: string;
    firstName: string;
    lastName: string;
    photo?: string;
    currentProvince: string;
    currentCountry: string;
}

export interface ChatConversationSummary {
    user: ChatConversationUser | null;
    lastMessage: ChatMessage | null;
    unreadCount: number;
}

export interface GetConversationsResponse {
    success: boolean;
    conversations: ChatConversationSummary[];
    unreadConversationCount: number;
}

export interface ConnectionRequestSender {
    _id: string;
    firstName: string;
    homeCountry: string;
    currentProvince: string;
    currentCountry: string;
    languages: string[];
    interests: string[];
    lookingFor: string[];
    photo?: string;
}

export interface ConnectionRequestItem {
    _id: string;
    sender: ConnectionRequestSender;
    createdAt: string;
}

export interface GetConnectionRequestsResponse {
    success: boolean;
    requests: ConnectionRequestItem[];
}

export interface RegisterPayload {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    about?: string;
    jobTitle?: string;
    company?: string;
    institution?: string;
    graduationYear?: number;
    homeCountry: string;
    currentLocation: {
        province: string;
        country: string;
    };
    languages: string[];
    interests: string[];
    lookingFor: string[];
    profilePhoto?: string;
    dateOfBirth: string;
    gender: string;
}

export interface UpdateProfilePayload {
    firstName?: string;
    lastName?: string;
    about?: string;
    jobTitle?: string;
    company?: string;
    institution?: string;
    graduationYear?: number;
    homeCountry?: string;
    currentProvince?: string;
    currentCountry?: string;
    languages?: string[];
    interests?: string[];
    lookingFor?: string[];
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

export type NotificationDeviceChannel = 'web_push';

export interface RegisterNotificationDevicePayload {
    channel: NotificationDeviceChannel;
    token: string;
}
