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

export interface GetProfileResponse {
  success: boolean;
  message?: string;
  user: UserProfile;
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

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}
