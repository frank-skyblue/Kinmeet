import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Account: undefined;
  CommunitySafety: undefined;
  Support: undefined;
  ContactSupport: undefined;
  Feedback: undefined;
  Privacy: undefined;
  BlockedAccounts: undefined;
};

export type ChatStackParamList = {
  ChatHome: undefined;
  ChatThread: { userId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ProfileView: { userId: string };
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};

export type MainTabParamList = {
  Discover: undefined;
  Connections: undefined;
  Chat: NavigatorScreenParams<ChatStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};
