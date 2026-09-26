export type SearchableSelectOption = {
    value: string;
    label: string;
};

export interface User {
    id: string;
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
    photo?: string;
    profileComplete: boolean;
}

export interface UserProfile {
    _id: string;
    email?: string;
    username?: string;
    firstName: string;
    lastName?: string;
    about?: string;
    jobTitle?: string;
    company?: string;
    industry?: string;
    educationLevel?: string;
    graduationYear?: number;
    homeCountry: string;
    currentProvince: string;
    currentCountry: string;
    currentCity?: string;
    languages: string[];
    interests: string[];
    lookingFor: string[];
    photo?: string;
    profileComplete?: boolean;
    gender?: string;
    dateOfBirth?: string;
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

export interface Match {
    _id: string;
    firstName: string;
    about?: string;
    jobTitle?: string;
    company?: string;
    industry?: string;
    educationLevel?: string;
    graduationYear?: number;
    homeCountry: string;
    currentProvince: string;
    currentCountry: string;
    languages: string[];
    interests: string[];
    lookingFor: string[];
    photo?: string;
}

export interface GetMatchesResponse {
    success: boolean;
    matches: Match[];
}

export interface Connection {
    _id: string;
    firstName: string;
    lastName: string;
    homeCountry: string;
    currentProvince: string;
    currentCountry: string;
    languages: string[];
    interests: string[];
    lookingFor: string[];
    photo?: string;
    connectedAt?: string;
}

export interface GetConnectionsResponse {
    success: boolean;
    connections: Connection[];
}

export interface BlockedAccountUser {
    _id: string;
    firstName: string;
    currentProvince?: string;
    currentCountry?: string;
}

export interface BlockedAccount {
    _id: string;
    blocked: BlockedAccountUser | null;
    createdAt?: string;
}

export interface GetBlockedUsersResponse {
    success: boolean;
    blockedUsers: BlockedAccount[];
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
    username?: string;
    password: string;
    firstName: string;
    lastName: string;
    about?: string;
    jobTitle?: string;
    company?: string;
    industry?: string;
    educationLevel?: string;
    graduationYear?: number;
    homeCountry: string;
    currentLocation: {
        province: string;
        country: string;
        city: string;
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
    industry?: string;
    educationLevel?: string;
    graduationYear?: number;
    homeCountry?: string;
    currentProvince?: string;
    currentCountry?: string;
    currentCity?: string;
    languages?: string[];
    interests?: string[];
    lookingFor?: string[];
    gender?: string;
    dateOfBirth?: string;
}

export interface ChangeEmailPayload {
    newEmail: string;
    currentPassword: string;
}

export interface ChangeUsernamePayload {
    newUsername: string;
}

export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}

export type FeedbackCategory =
    | 'Bug or Technical Issue'
    | 'Feature Suggestion'
    | 'Profile or Account Feedback'
    | 'Messaging Feedback'
    | 'Discovery / Matching Feedback'
    | 'Community or Safety Feedback'
    | 'General App Experience';

export interface SubmitFeedbackPayload {
    category: FeedbackCategory;
    message: string;
    followUp?: boolean;
    screenshots?: File[];
}

export interface SubmitFeedbackResponse {
    success: boolean;
    message: string;
    feedbackId: string;
}

export type AdminFeedbackStatus = 'new';

export interface AdminFeedbackScreenshot {
    url: string;
}

export interface AdminFeedbackItem {
    id: string;
    email: string;
    category: FeedbackCategory;
    message: string;
    screenshots: AdminFeedbackScreenshot[];
    followUp: boolean;
    status: AdminFeedbackStatus;
    createdAt: string;
}

export interface AdminFeedbackPagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface AdminFeedbackListResponse {
    success: boolean;
    feedback: AdminFeedbackItem[];
    pagination: AdminFeedbackPagination;
}

export interface AdminSessionResponse {
    success: boolean;
    authenticated: boolean;
}

export interface AdminAuthResponse {
    success: boolean;
    message: string;
}

export type SupportIssueType =
    | 'Account issue'
    | 'Login/password issue'
    | 'Profile issue'
    | 'Technical problem'
    | 'Safety concern'
    | 'Other';

export interface SubmitSupportRequestPayload {
    issueType: SupportIssueType;
    subject?: string;
    message: string;
    followUp?: boolean;
    screenshots?: File[];
}

export interface SubmitSupportRequestResponse {
    success: boolean;
    message: string;
    supportRequestId: string;
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

export type {
    ChatMarkReadPayload,
    ChatMessagesReadPayload,
    ChatSendMessageAck,
    ChatSendMessagePayload,
    ChatTypingPayload,
    ChatUserTypingPayload,
} from './chatSocket';

export type AdminReportStatus = 'new' | 'reviewing' | 'resolved';

export interface AdminReportItem {
    id: string;
    reporterEmail: string;
    reportedEmail: string;
    reportedName: string;
    reason: string;
    details?: string;
    status: AdminReportStatus;
    createdAt: string;
}

/** Same shape as feedback pagination; aliased so the reports code reads on its own terms. */
export type AdminReportPagination = AdminFeedbackPagination;

export interface AdminReportUpdateResponse {
    success: boolean;
    report: AdminReportItem;
}

export interface AdminReportListResponse {
    success: boolean;
    reports: AdminReportItem[];
    pagination: AdminReportPagination;
}
