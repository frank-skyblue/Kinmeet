import type { AdminReportPagination, AdminReportStatus } from '../types';
import { rangeLabel } from './adminFeedback';

const REASON_TAG_CLASS: Record<string, string> = {
  'Harassment or bullying':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-coral-50 px-2.5 py-0.5 text-[13px] font-semibold text-kin-coral-700',
  'Fake profile or impersonation':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-navy-50 px-2.5 py-0.5 text-[13px] font-semibold text-kin-navy',
  'Spam or scam':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-beige px-2.5 py-0.5 text-[13px] font-semibold text-kin-navy',
  'Inappropriate content':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-coral-100 px-2.5 py-0.5 text-[13px] font-semibold text-kin-coral-800',
  'Hate speech or discrimination':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-coral-50 px-2.5 py-0.5 text-[13px] font-semibold text-kin-coral-800',
  'Safety concern':
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-teal-100 px-2.5 py-0.5 text-[13px] font-semibold text-kin-teal-800',
  Other:
    'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-beige px-2.5 py-0.5 text-[13px] font-semibold text-kin-navy',
};

const REASON_TAG_FALLBACK =
  'inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-kin-beige px-2.5 py-0.5 text-[13px] font-semibold text-kin-navy';

export const reasonTagClassName = (reason: string): string =>
  REASON_TAG_CLASS[reason] ?? REASON_TAG_FALLBACK;

export const reportRangeLabel = (
  pagination: Pick<AdminReportPagination, 'page' | 'pageSize' | 'total'>,
): string | null => rangeLabel({ ...pagination, noun: 'reports' });

export const reportDetailsLabel = (details: string | undefined): string =>
  details && details.trim().length > 0 ? details : 'No additional details';

export const REPORT_STATUS_OPTIONS: AdminReportStatus[] = ['new', 'reviewing', 'resolved'];
