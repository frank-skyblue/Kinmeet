import React from 'react';
import { formatAdminSubmittedParts } from '../../utils/adminFeedback';

type AdminPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  ariaLabel: string;
};

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  ariaLabel,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex shrink-0 items-center justify-center gap-5 text-sm font-inter text-kin-navy/70"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage <= 1}
        className="text-kin-teal underline-offset-2 transition hover:text-kin-navy hover:underline disabled:pointer-events-none disabled:opacity-35 disabled:no-underline cursor-pointer"
        aria-label="Previous page"
      >
        Prev
      </button>
      <span className="tabular-nums text-kin-navy/60" aria-live="polite">
        {currentPage}/{totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= totalPages}
        className="text-kin-teal underline-offset-2 transition hover:text-kin-navy hover:underline disabled:pointer-events-none disabled:opacity-35 disabled:no-underline cursor-pointer"
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
};

const VIEW_ARROW_PATH = 'M9 5l7 7-7 7';

const viewButtonClassName =
  'inline-flex h-10 items-center gap-1 whitespace-nowrap rounded-kin-sm px-2 text-kin-coral font-semibold hover:bg-kin-coral-50 cursor-pointer hover:text-kin-coral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral';

export const AdminSubmittedStamp: React.FC<{ value: string }> = ({ value }) => {
  const { date, time } = formatAdminSubmittedParts(value);
  return (
    <span className="flex flex-col leading-snug">
      <span>{date}</span>
      {time ? <span className="text-xs text-kin-navy/60">{time}</span> : null}
    </span>
  );
};

export const AdminViewButton: React.FC<{ email: string; onClick: () => void }> = ({ email, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={viewButtonClassName}
    aria-label={`View details for ${email || 'this submission'}`}
  >
    View
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={VIEW_ARROW_PATH} />
    </svg>
  </button>
);
