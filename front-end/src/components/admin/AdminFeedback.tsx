import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { adminAPI } from '../../services/api';
import type { AdminFeedbackItem, AdminFeedbackPagination } from '../../types';
import { getErrorMessage } from '../../utils/error';
import {
  categoryTagClassName,
  contactLabel,
  contactTagClassName,
  emailInitial,
  feedbackRangeLabel,
  formatAdminStatus,
  screenshotCountLabel,
  statusTagClassName,
} from '../../utils/adminFeedback';
import AdminFeedbackDetails from './AdminFeedbackDetails';
import { AdminPagination, AdminSubmittedStamp, AdminViewButton } from './AdminPagination';

type AdminFeedbackProps = {
  onSessionExpired: () => void;
};

const AdminFeedback: React.FC<AdminFeedbackProps> = ({ onSessionExpired }) => {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [pagination, setPagination] = useState<AdminFeedbackPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<AdminFeedbackItem | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;

  useEffect(() => {
    let cancelled = false;

    const loadFeedback = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await adminAPI.listFeedback(page);
        if (cancelled) return;
        setItems(response.feedback);
        setPagination(response.pagination);
      } catch (err: unknown) {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          onSessionExpiredRef.current();
          return;
        }
        setError(getErrorMessage(err, 'Unable to load feedback.'));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadFeedback();
    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  const handleRetry = () => {
    setReloadToken((current) => current + 1);
  };

  const handlePrevious = () => {
    setPage((current) => Math.max(1, current - 1));
  };

  const handleNext = () => {
    setPage((current) => current + 1);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  const totalPages = pagination?.totalPages ?? 0;
  const showEmpty = !isLoading && !error && items.length === 0;
  const showList = !isLoading && !error && items.length > 0;
  const rangeLabel =
    showList && pagination ? feedbackRangeLabel(pagination) : null;

  return (
    <section aria-labelledby="admin-feedback-heading" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-feedback-heading" className="text-3xl font-bold font-montserrat text-kin-navy sm:text-4xl">
          Feedback
        </h1>
        <p className="mt-2 text-base font-inter text-kin-teal">
          Review feedback submitted by KinMeet users.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="self-start sm:self-auto bg-kin-coral text-white px-4 py-2 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {(isLoading || showEmpty || showList) && (
      <div className="bg-white rounded-kin-xl border border-kin-stone-200 shadow-kin-medium overflow-hidden">
        {isLoading && (
          <div role="status" className="px-6 py-16 text-center text-kin-navy font-inter">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4" aria-hidden />
            <p>Loading feedback...</p>
          </div>
        )}
        {showEmpty && (
          <div className="px-6 py-16 text-center font-inter">
            <p className="text-lg font-semibold font-montserrat text-kin-navy cursor-pointer">No feedback yet.</p>
            <p className="mt-2 text-sm text-kin-teal">New submissions will appear here.</p>
          </div>
        )}
        {showList && (
          <>
          <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left font-inter text-base text-kin-navy">
            <caption className="sr-only">Submitted feedback</caption>
            <thead className="bg-kin-beige-300 border-b border-kin-stone-200">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">User</th>
                <th scope="col" className="whitespace-nowrap px-5 py-3 font-semibold">Category</th>
                <th scope="col" className="px-5 py-3 font-semibold">Feedback</th>
                <th scope="col" className="px-5 py-3 font-semibold">Contact</th>
                <th scope="col" className="px-5 py-3 font-semibold">Date</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="w-24 px-3 py-3 font-semibold">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-kin-stone-200">
                  <td className="w-[24%] max-w-xs px-5 py-3 align-middle">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kin-coral to-kin-teal text-sm font-bold font-montserrat text-white shadow-kin-soft"
                        aria-hidden
                      >
                        {emailInitial(item.email)}
                      </div>
                      <span className="min-w-0 truncate font-medium" title={item.email || undefined}>
                        {item.email || 'Email unavailable'}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle">
                    <span className={categoryTagClassName(item.category)}>{item.category}</span>
                  </td>
                  <td className="min-w-0 px-5 py-3 align-middle">
                    <p className="line-clamp-2 break-words leading-snug">{item.message}</p>
                    {item.screenshots?.length > 0 && (
                      <p className="mt-0.5 text-xs leading-tight text-kin-navy/60">
                        {screenshotCountLabel(item.screenshots.length)}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle">
                    <span className={contactTagClassName(item.followUp)}>{contactLabel(item.followUp)}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle text-sm text-kin-navy/80">
                    <AdminSubmittedStamp value={item.createdAt} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle">
                    <span className={statusTagClassName(item.status)}>{formatAdminStatus(item.status)}</span>
                  </td>
                  <td className="w-24 px-3 py-3 align-middle">
                    <AdminViewButton email={item.email} onClick={() => setSelectedItem(item)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="lg:hidden divide-y divide-kin-stone-200">
          {items.map((item) => (
            <li key={item.id} className="p-5 space-y-3 font-inter text-base text-kin-navy">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kin-coral to-kin-teal text-sm font-bold font-montserrat text-white shadow-kin-soft"
                  aria-hidden
                >
                  {emailInitial(item.email)}
                </div>
                <p className="min-w-0 font-semibold font-montserrat [overflow-wrap:anywhere] cursor-pointer">{item.email || 'Email unavailable'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={categoryTagClassName(item.category)}>{item.category}</span>
                <span className={contactTagClassName(item.followUp)}>{contactLabel(item.followUp)}</span>
                <span className={statusTagClassName(item.status)}>{formatAdminStatus(item.status)}</span>
              </div>
              <p className="line-clamp-2 break-words leading-snug">{item.message}</p>
              {item.screenshots?.length > 0 && (
                <p className="text-xs leading-tight text-kin-navy/60">{screenshotCountLabel(item.screenshots.length)}</p>
              )}
              <p className="text-sm text-kin-navy/70">
                <AdminSubmittedStamp value={item.createdAt} />
              </p>
              <AdminViewButton email={item.email} onClick={() => setSelectedItem(item)} />
            </li>
          ))}
        </ul>

        {(rangeLabel || totalPages > 1) && (
          <div className="flex flex-col gap-3 border-t border-kin-stone-200 bg-kin-beige/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            {rangeLabel && (
              <p className="text-sm font-inter text-kin-navy/70">{rangeLabel}</p>
            )}
            <AdminPagination
              currentPage={pagination?.page ?? page}
              totalPages={totalPages}
              onPrevious={handlePrevious}
              onNext={handleNext}
              ariaLabel="Feedback pagination"
            />
          </div>
        )}
          </>
        )}
      </div>
      )}

      {selectedItem && (
        <AdminFeedbackDetails item={selectedItem} onClose={handleCloseDetails} />
      )}
    </section>
  );
};

export default AdminFeedback;
