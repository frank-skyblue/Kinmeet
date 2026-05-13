import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useConnectionRequests } from "../../contexts/connectionRequestsContext";
import { connectionsAPI, getPhotoUrl } from "../../services/api";
import { getErrorMessage } from "../../utils/error";
import type { ConnectionRequestItem } from "../../types";
import ConnectionsPaginationNav from "./ConnectionsPaginationNav";

export type RequestsProps = {
  /** When true, used inside ConnectionsHub: no page chrome, no outer padding/bg. */
  embedded?: boolean;
};

/** Matches `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` in this module. */
const REQUESTS_PAGE_SIZE_LG = 8;
const REQUESTS_PAGE_SIZE_MD = 6;
const REQUESTS_PAGE_SIZE_SM = 4;

const getRequestsPageSize = (): number => {
  if (typeof window === "undefined") return REQUESTS_PAGE_SIZE_SM;
  if (typeof window.matchMedia !== "function") return REQUESTS_PAGE_SIZE_SM;
  if (window.matchMedia("(min-width: 1024px)").matches) {
    return REQUESTS_PAGE_SIZE_LG;
  }
  if (window.matchMedia("(min-width: 768px)").matches) {
    return REQUESTS_PAGE_SIZE_MD;
  }
  return REQUESTS_PAGE_SIZE_SM;
};

const useRequestsPageSize = (): number => {
  const [pageSize, setPageSize] = useState(() => getRequestsPageSize());

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const sync = () => {
      setPageSize(getRequestsPageSize());
    };
    sync();
    const mqLg = window.matchMedia("(min-width: 1024px)");
    const mqMd = window.matchMedia("(min-width: 768px)");
    mqLg.addEventListener("change", sync);
    mqMd.addEventListener("change", sync);
    return () => {
      mqLg.removeEventListener("change", sync);
      mqMd.removeEventListener("change", sync);
    };
  }, []);

  return pageSize;
};

const Requests: React.FC<RequestsProps> = ({ embedded = false }) => {
  const { refetchConnectionRequests } = useConnectionRequests();
  const [requests, setRequests] = useState<ConnectionRequestItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = useRequestsPageSize();

  useEffect(() => {
    loadRequests();
  }, []);

  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return requests.slice(start, start + pageSize);
  }, [requests, currentPage, pageSize]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const response = await connectionsAPI.getConnectionRequests();
      if (response.success) {
        setRequests(response.requests);
      }
    } catch (err: unknown) {
      setError("Failed to load kin requests");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePagePrevious = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handlePageNext = useCallback(() => {
    setCurrentPage((p) =>
      Math.min(Math.max(1, Math.ceil(requests.length / pageSize)), p + 1),
    );
  }, [requests.length, pageSize]);

  const handleAccept = async (requestId: string) => {
    try {
      await connectionsAPI.acceptRequest(requestId);
      setRequests((prev) => prev.filter((req) => req._id !== requestId));
      void refetchConnectionRequests();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to accept request"));
    }
  };

  const handleIgnore = async (requestId: string) => {
    try {
      await connectionsAPI.ignoreRequest(requestId);
      setRequests((prev) => prev.filter((req) => req._id !== requestId));
      void refetchConnectionRequests();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to ignore request"));
    }
  };

  if (isLoading) {
    return (
      <div
        className={
          embedded
            ? "flex min-h-48 flex-1 flex-col items-center justify-center"
            : "flex h-full items-center justify-center bg-kin-beige"
        }
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4"></div>
          <p className="text-kin-navy font-inter">Loading requests...</p>
        </div>
      </div>
    );
  }

  const outerClass = embedded
    ? "flex min-h-0 min-w-0 flex-1 flex-col"
    : "flex min-h-0 min-w-0 flex-1 flex-col bg-kin-beige px-4 py-4";
  const innerClass = embedded
    ? "mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col"
    : "mx-auto flex min-h-0 w-full max-w-4xl min-w-0 flex-1 flex-col";

  return (
    <div className={outerClass}>
      <div className={innerClass}>
        <div className="mb-3 shrink-0 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {embedded ? (
            <h2 className="font-montserrat text-base font-semibold text-kin-navy md:text-lg">
              Connection requests
            </h2>
          ) : (
            <h1 className="font-montserrat text-base font-semibold text-kin-navy md:text-lg">
              Connection requests
            </h1>
          )}
          <span className="shrink-0 text-sm text-kin-teal font-inter">
            {requests.length} pending
          </span>
        </div>

        {error && (
          <div className="mb-3 shrink-0 rounded-kin border border-kin-coral-200 bg-kin-coral-50 px-3 py-2 font-inter text-sm text-kin-coral-700">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 text-5xl">👋</div>
            <h2 className="mb-2 font-montserrat text-xl font-bold text-kin-navy">
              No Pending Requests
            </h2>
            <p className="text-sm text-kin-teal font-inter">
              When someone sends you a Meet request, it will appear here
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-1.5 px-2 py-2 sm:px-3 md:grid-cols-3 lg:grid-cols-4">
              {paginatedRequests.map((request) => (
                <article
                  key={request._id}
                  className="flex min-h-0 min-w-0 flex-col gap-3 rounded-kin-lg bg-white p-3 shadow-kin-soft transition hover:shadow-kin-medium sm:p-3.5"
                >
                  <div className="flex min-w-0 shrink-0 gap-3 border-b border-kin-stone-200 pb-3">
                    {request.sender.photo ? (
                      <img
                        src={getPhotoUrl(request.sender.photo)}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-kin-stone-200 sm:h-14 sm:w-14"
                      />
                    ) : (
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-kin-coral to-kin-teal text-base font-bold font-montserrat text-white ring-1 ring-kin-coral-200/50 sm:h-14 sm:w-14"
                        aria-hidden
                      >
                        {request.sender.firstName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-montserrat text-sm font-bold text-kin-navy sm:text-base">
                        {request.sender.firstName}
                      </h3>
                      <p className="mt-0.5 text-xs text-kin-teal font-inter">
                        Meet request
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2.5 text-left">
                    <p className="flex min-w-0 gap-2 text-xs leading-snug text-kin-navy/85 font-inter">
                      <span
                        className="mt-0.5 shrink-0 text-kin-teal"
                        aria-hidden
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </span>
                      <span className="min-w-0 wrap-break-word">
                        {request.sender.homeCountry}
                        <span className="text-kin-navy/40"> · </span>
                        {request.sender.currentProvince},{" "}
                        {request.sender.currentCountry}
                      </span>
                    </p>

                    <div className="space-y-2">
                      <div>
                        <span className="mb-1 block text-xs text-kin-navy/55 font-inter">
                          Speaks
                        </span>
                        <div className="flex min-w-0 flex-wrap gap-1">
                          {request.sender.languages.map((lang, index) => (
                            <span
                              key={index}
                              className="rounded-full bg-kin-stone-100 px-2 py-0.5 text-[11px] font-medium leading-none text-kin-navy font-inter"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs text-kin-navy/55 font-inter">
                          Looking for
                        </span>
                        <div className="flex min-w-0 flex-wrap gap-1">
                          {request.sender.lookingFor.map((item, index) => (
                            <span
                              key={index}
                              className="rounded-full border border-kin-coral bg-transparent px-2 py-0.5 text-[11px] font-medium leading-none text-kin-coral font-inter"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex w-full shrink-0 items-stretch justify-center gap-2 border-t border-kin-stone-200 pt-3">
                    <button
                      type="button"
                      onClick={() => handleAccept(request._id)}
                      className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-0 rounded-kin-sm bg-kin-coral px-2 py-2 text-center text-xs font-semibold leading-none font-montserrat text-white shadow-kin-soft transition hover:bg-kin-coral-600 hover:shadow-kin-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral sm:gap-1.5 sm:px-3"
                      aria-label="Accept kin request"
                    >
                      <svg
                        className="h-4 w-4 shrink-0 stroke-current"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="hidden sm:inline">Accept</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIgnore(request._id)}
                      className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-0 rounded-kin-sm bg-kin-stone-200 px-2 py-2 text-center text-xs font-semibold leading-none font-montserrat text-kin-navy shadow-kin-soft transition hover:bg-kin-stone-300 hover:shadow-kin-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral sm:gap-1.5 sm:px-3"
                      aria-label="Ignore kin request"
                    >
                      <svg
                        className="h-4 w-4 shrink-0 stroke-current"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span className="hidden sm:inline">Ignore</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
            </div>
            <ConnectionsPaginationNav
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={handlePagePrevious}
              onNext={handlePageNext}
              ariaLabel="Kin requests pagination"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;
