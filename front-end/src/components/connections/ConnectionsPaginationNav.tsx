import React from "react";

export type ConnectionsPaginationNavProps = {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  /** e.g. "Connections pagination" or "Kin requests pagination" */
  ariaLabel: string;
};

const ConnectionsPaginationNav: React.FC<ConnectionsPaginationNavProps> = ({
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
      className="flex shrink-0 items-center justify-center gap-5 border-t border-border/50 bg-canvas pt-3 text-sm font-inter text-foreground/70"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage <= 1}
        className="text-muted underline-offset-2 transition hover:text-foreground cursor-pointer hover:underline disabled:pointer-events-none disabled:opacity-35 disabled:no-underline"
        aria-label="Previous page"
      >
        Prev
      </button>
      <span className="tabular-nums text-foreground/60" aria-live="polite">
        {currentPage}/{totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= totalPages}
        className="text-muted underline-offset-2 transition hover:text-foreground cursor-pointer hover:underline disabled:pointer-events-none disabled:opacity-35 disabled:no-underline"
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
};

export default ConnectionsPaginationNav;
