import React, { useEffect, useId, useRef } from 'react';
import type { AdminFeedbackItem } from '../../types';
import {
  categoryTagClassName,
  contactLabel,
  contactTagClassName,
  formatAdminStatus,
  formatAdminSubmittedAt,
  statusTagClassName,
} from '../../utils/adminFeedback';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type AdminFeedbackDetailsProps = {
  item: AdminFeedbackItem;
  onClose: () => void;
};

const AdminFeedbackDetails: React.FC<AdminFeedbackDetailsProps> = ({ item, onClose }) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!openerRef.current && document.activeElement instanceof HTMLElement) {
      openerRef.current = document.activeElement;
    }
    const previouslyFocused = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const getFocusable = () => {
      if (!dialog) return [];
      return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || dialog?.contains(target)) return;
      const focusable = getFocusable();
      (focusable[0] ?? dialog)?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-kin-xl shadow-kin-strong max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 outline-none"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 id={titleId} className="text-xl font-bold font-montserrat text-kin-navy">
            Feedback details
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-kin-navy hover:text-kin-coral font-inter text-sm font-semibold cursor-pointer"
            aria-label="Close details"
          >
            Close
          </button>
        </div>

        <dl className="space-y-3 font-inter text-sm text-kin-navy">
          <div>
            <dt className="font-semibold text-kin-teal">Email</dt>
            <dd className="[overflow-wrap:anywhere]">{item.email || 'Email unavailable'}</dd>
          </div>
          <div>
            <dt className="font-semibold text-kin-teal">Category</dt>
            <dd className="mt-1">
              <span className={categoryTagClassName(item.category)}>{item.category}</span>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-kin-teal">Status</dt>
            <dd className="mt-1">
              <span className={statusTagClassName(item.status)}>{formatAdminStatus(item.status)}</span>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-kin-teal">Contact</dt>
            <dd className="mt-1">
              <span className={contactTagClassName(item.followUp)}>{contactLabel(item.followUp)}</span>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-kin-teal">Submitted</dt>
            <dd>{formatAdminSubmittedAt(item.createdAt)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-kin-teal">Message</dt>
            <dd className="whitespace-pre-wrap break-words">{item.message}</dd>
          </div>
          <div>
            <dt className="font-semibold text-kin-teal">Screenshots</dt>
            <dd>
              {(item.screenshots ?? []).length === 0 ? (
                <span>None</span>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {(item.screenshots ?? []).map((screenshot) => (
                    <li key={screenshot.url}>
                      <a
                        href={screenshot.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-kin-coral hover:text-kin-coral-600 break-all cursor-pointer"
                      >
                        {screenshot.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default AdminFeedbackDetails;
