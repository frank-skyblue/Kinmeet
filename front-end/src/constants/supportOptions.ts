import type { SupportIssueType } from '../types';

export const SUPPORT_ISSUE_TYPES: SupportIssueType[] = [
  'Account issue',
  'Login/password issue',
  'Profile issue',
  'Technical problem',
  'Safety concern',
  'Other',
];

export const SUPPORT_SUBJECT_MAX_LENGTH = 100;
export const SUPPORT_MESSAGE_MAX_LENGTH = 2000;
