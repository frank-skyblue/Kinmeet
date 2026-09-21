import type { AdminFeedbackPagination, FeedbackCategory } from '../types';

const CATEGORY_TAG_CLASS: Record<FeedbackCategory, string> = {
  'Bug or Technical Issue':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-coral-50 px-2.5 py-0.5 text-[13px] font-semibold text-kin-coral-700',
  'Feature Suggestion':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-teal-50 px-2.5 py-0.5 text-[13px] font-semibold text-kin-teal',
  'Profile or Account Feedback':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-navy-50 px-2.5 py-0.5 text-[13px] font-semibold text-kin-navy',
  'Messaging Feedback':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-teal-100 px-2.5 py-0.5 text-[13px] font-semibold text-kin-teal-800',
  'Discovery / Matching Feedback':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-coral-100 px-2.5 py-0.5 text-[13px] font-semibold text-kin-coral-800',
  'Community or Safety Feedback':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-coral-50 px-2.5 py-0.5 text-[13px] font-semibold text-kin-coral-800',
  'General App Experience':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-beige px-2.5 py-0.5 text-[13px] font-semibold text-kin-navy',
};

const CATEGORY_TAG_FALLBACK =
  'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-beige px-2.5 py-0.5 text-[13px] font-semibold text-kin-navy';

const STATUS_LABEL: Record<string, string> = {
  new: 'New',
};

const STATUS_TAG_CLASS: Record<string, string> = {
  new: 'inline-flex items-center whitespace-nowrap rounded-full bg-kin-teal-50 px-2.5 py-0.5 text-[13px] font-semibold capitalize text-kin-teal',
};

const STATUS_TAG_FALLBACK =
  'inline-flex items-center whitespace-nowrap rounded-full bg-kin-beige px-2.5 py-0.5 text-[13px] font-semibold text-kin-navy';

const CONTACT_REQUESTED_CLASS =
  'inline-flex items-center whitespace-nowrap rounded-full bg-kin-teal-50 px-2.5 py-0.5 text-[13px] font-semibold text-kin-teal';
const CONTACT_NOT_REQUESTED_CLASS =
  'inline-flex items-center whitespace-nowrap rounded-full bg-kin-beige px-2.5 py-0.5 text-[13px] font-semibold text-kin-navy';

export const formatAdminSubmittedAt = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const formatAdminSubmittedParts = (
  value: string,
): { date: string; time?: string } => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: value };
  return {
    date: new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(parsed),
    time: new Intl.DateTimeFormat('en-CA', { timeStyle: 'short' }).format(parsed),
  };
};

export const emailInitial = (email: string | null | undefined): string => {
  if (typeof email !== 'string' || email.length === 0) return '?';
  const local = email.split('@')[0] ?? '';
  const match = local.match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : '?';
};

export const feedbackRangeLabel = ({
  page,
  pageSize,
  total,
}: Pick<AdminFeedbackPagination, 'page' | 'pageSize' | 'total'>): string | null => {
  if (total <= 0 || pageSize <= 0 || page < 1) return null;
  const start = (page - 1) * pageSize + 1;
  if (start > total) return null;
  const end = Math.min(page * pageSize, total);
  return `Showing ${start} to ${end} of ${total} feedback`;
};

export const categoryTagClassName = (category: string): string => {
  if (Object.prototype.hasOwnProperty.call(CATEGORY_TAG_CLASS, category)) {
    return CATEGORY_TAG_CLASS[category as FeedbackCategory];
  }
  return CATEGORY_TAG_FALLBACK;
};

export const formatAdminStatus = (status: string): string => {
  const mapped = STATUS_LABEL[status];
  if (mapped) return mapped;
  if (!status) return '';
  return status
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const statusTagClassName = (status: string): string =>
  STATUS_TAG_CLASS[status] ?? STATUS_TAG_FALLBACK;

export const contactLabel = (followUp: boolean): string =>
  followUp ? 'Requested' : 'Not requested';

export const contactTagClassName = (followUp: boolean): string =>
  followUp ? CONTACT_REQUESTED_CLASS : CONTACT_NOT_REQUESTED_CLASS;

export const screenshotCountLabel = (count: number): string =>
  count === 1 ? '1 screenshot' : `${count} screenshots`;
