export const REPORT_REASONS = [
  'Harassment or bullying',
  'Fake profile or impersonation',
  'Spam or scam',
  'Inappropriate content',
  'Hate speech or discrimination',
  'Safety concern',
  'Other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_DETAILS_MAX_LENGTH = 2000;
