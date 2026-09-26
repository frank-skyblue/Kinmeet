import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { adminAPI } from '../../services/api';
import type { AdminReportItem, AdminReportPagination, AdminReportStatus } from '../../types';
import { getErrorMessage } from '../../utils/error';
import { emailInitial, formatAdminStatus } from '../../utils/adminFeedback';
import { REPORT_STATUS_OPTIONS, reasonTagClassName, reportRangeLabel } from '../../utils/adminReports';
import AdminReportDetails from './AdminReportDetails';
import { AdminPagination, AdminSubmittedStamp, AdminViewButton } from './AdminPagination';

type AdminReportStatusSelectProps = {
  reportId: string;
  value: AdminReportStatus;
  busy: boolean;
  onChange: (status: AdminReportStatus) => void;
};

const AdminReportStatusSelect: React.FC<AdminReportStatusSelectProps> = ({
  reportId,
  value,
  busy,
  onChange,
}) => (
  <label className="inline-flex items-center gap-2">
    <span className="sr-only">Status for report {reportId}</span>
    <select
      value={value}
      disabled={busy}
      onChange={(event) => onChange(event.target.value as AdminReportStatus)}
      className="rounded-kin-sm border border-kin-stone-300 bg-white px-2 py-1 text-sm font-inter text-kin-navy cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-kin-coral disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {REPORT_STATUS_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {formatAdminStatus(option)}
        </option>
      ))}
    </select>
  </label>
);

type AdminReportsProps = {
  onSessionExpired: () => void;
};

const AdminReports: React.FC<AdminReportsProps> = ({ onSessionExpired }) => {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminReportItem[]>([]);
  const [pagination, setPagination] = useState<AdminReportPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<AdminReportItem | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await adminAPI.listReports(page);
        if (cancelled) return;
        setItems(response.reports);
        setPagination(response.pagination);
      } catch (err: unknown) {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          onSessionExpiredRef.current();
          return;
        }
        setError(getErrorMessage(err, 'Unable to load reports.'));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadReports();
    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  const handleStatusChange = async (reportId: string, status: AdminReportStatus) => {
    setStatusBusyId(reportId);
    setStatusError('');
    try {
      const response = await adminAPI.updateReportStatus(reportId, status);
      setItems((current) =>
        current.map((item) => (item.id === reportId ? response.report : item)),
      );
      setSelectedItem((current) =>
        current && current.id === reportId ? response.report : current,
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        onSessionExpiredRef.current();
        return;
      }
      setStatusError(getErrorMessage(err, 'Unable to update report status.'));
    } finally {
      setStatusBusyId(null);
    }
  };

  const handleRetry = () => setReloadToken((current) => current + 1);
  const handlePrevious = () => setPage((current) => Math.max(1, current - 1));
  const handleNext = () => setPage((current) => current + 1);
  const handleCloseDetails = () => setSelectedItem(null);

  const totalPages = pagination?.totalPages ?? 0;
  const showEmpty = !isLoading && !error && items.length === 0;
  const showList = !isLoading && !error && items.length > 0;
  const rangeLabel = showList && pagination ? reportRangeLabel(pagination) : null;

  return (
    <section aria-labelledby="admin-reports-heading" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-reports-heading" className="text-3xl font-bold font-montserrat text-kin-navy sm:text-4xl">
          Reports
        </h1>
        <p className="mt-2 text-base font-inter text-kin-teal">
          Review reports submitted by KinMeet users.
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

      {statusError && (
        <p role="alert" className="text-kin-coral-700 font-inter text-sm">
          {statusError}
        </p>
      )}

      {(isLoading || showEmpty || showList) && (
      <div className="bg-white rounded-kin-xl border border-kin-stone-200 shadow-kin-medium overflow-hidden">
        {isLoading && (
          <div role="status" className="px-6 py-16 text-center text-kin-navy font-inter">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4" aria-hidden />
            <p>Loading reports...</p>
          </div>
        )}
        {showEmpty && (
          <div className="px-6 py-16 text-center font-inter">
            <p className="text-lg font-semibold font-montserrat text-kin-navy cursor-pointer">No reports yet.</p>
            <p className="mt-2 text-sm text-kin-teal">New reports will appear here.</p>
          </div>
        )}
        {showList && (
          <>
          <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left font-inter text-base text-kin-navy">
            <caption className="sr-only">Submitted reports</caption>
            <thead className="bg-kin-beige-300 border-b border-kin-stone-200">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Reported user</th>
                <th scope="col" className="px-5 py-3 font-semibold">Reported by</th>
                <th scope="col" className="whitespace-nowrap px-5 py-3 font-semibold">Reason</th>
                <th scope="col" className="px-5 py-3 font-semibold">Details</th>
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
                  <td className="w-[22%] max-w-xs px-5 py-3 align-middle">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kin-coral to-kin-teal text-sm font-bold font-montserrat text-white shadow-kin-soft"
                        aria-hidden
                      >
                        {emailInitial(item.reportedEmail)}
                      </div>
                      <span className="min-w-0 truncate font-medium" title={item.reportedEmail || undefined}>
                        {item.reportedEmail || 'Email unavailable'}
                      </span>
                    </div>
                  </td>
                  <td className="w-[20%] max-w-xs px-5 py-3 align-middle">
                    <span className="block min-w-0 truncate" title={item.reporterEmail || undefined}>
                      {item.reporterEmail || 'Email unavailable'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle">
                    <span className={reasonTagClassName(item.reason)}>{item.reason}</span>
                  </td>
                  <td className="min-w-0 px-5 py-3 align-middle">
                    <p className="line-clamp-2 break-words leading-snug">
                      {item.details && item.details.trim().length > 0 ? item.details : (
                        <span className="text-kin-navy/50">No additional details</span>
                      )}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle text-sm text-kin-navy/80">
                    <AdminSubmittedStamp value={item.createdAt} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle">
                    <AdminReportStatusSelect
                      reportId={item.id}
                      value={item.status}
                      busy={statusBusyId === item.id}
                      onChange={(status) => void handleStatusChange(item.id, status)}
                    />
                  </td>
                  <td className="w-24 px-3 py-3 align-middle">
                    <AdminViewButton email={item.reportedEmail} onClick={() => setSelectedItem(item)} />
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
                  {emailInitial(item.reportedEmail)}
                </div>
                <div className="min-w-0">
                  <p className="min-w-0 font-semibold font-montserrat [overflow-wrap:anywhere] cursor-pointer">
                    {item.reportedEmail || 'Email unavailable'}
                  </p>
                  <p className="text-sm text-kin-navy/70 [overflow-wrap:anywhere]">
                    Reported by {item.reporterEmail || 'unknown'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={reasonTagClassName(item.reason)}>{item.reason}</span>
                <AdminReportStatusSelect
                  reportId={item.id}
                  value={item.status}
                  busy={statusBusyId === item.id}
                  onChange={(status) => void handleStatusChange(item.id, status)}
                />
              </div>
              <p className="line-clamp-2 break-words leading-snug">
                {item.details && item.details.trim().length > 0 ? item.details : (
                  <span className="text-kin-navy/50">No additional details</span>
                )}
              </p>
              <p className="text-sm text-kin-navy/70">
                <AdminSubmittedStamp value={item.createdAt} />
              </p>
              <AdminViewButton email={item.reportedEmail} onClick={() => setSelectedItem(item)} />
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
              ariaLabel="Reports pagination"
            />
          </div>
        )}
          </>
        )}
      </div>
      )}

      {selectedItem && (
        <AdminReportDetails item={selectedItem} onClose={handleCloseDetails} />
      )}
    </section>
  );
};

export default AdminReports;
