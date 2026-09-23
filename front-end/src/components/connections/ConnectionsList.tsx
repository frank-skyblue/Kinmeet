import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CONNECTIONS_PAGE_SIZE } from "../../constants/connectionsPagination";
import { connectionsAPI, getPhotoUrl, blockAPI } from "../../services/api";
import { getErrorMessage } from "../../utils/error";
import ActionMenu from "../common/ActionMenu";
import ReportUserModal from "../common/ReportUserModal";
import ConnectionsPaginationNav from "./ConnectionsPaginationNav";

interface Connection {
  _id: string;
  firstName: string;
  lastName: string;
  homeCountry: string;
  currentProvince: string;
  currentCountry: string;
  languages: string[];
  interests: string[];
  lookingFor: string[];
  photo?: string;
  /** ISO date when the connection was formed (when API provides it) */
  connectedAt?: string;
}

const formatLongDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getConnectionSummary = (connection: Connection): string => {
  const location = `${connection.currentProvince}, ${connection.currentCountry}`;
  const fromHome = `From ${connection.homeCountry}`;
  if (connection.languages.length === 0) {
    return `${location}\n${fromHome}`;
  }
  const langs = connection.languages.slice(0, 2).join(", ");
  const more =
    connection.languages.length > 2
      ? ` +${connection.languages.length - 2}`
      : "";
  return `${location} · ${langs}${more}\n${fromHome}`;
};

export type ConnectionsListProps = {
  /** When true, used inside ConnectionsHub: no page chrome, no outer padding/bg. */
  embedded?: boolean;
};

const ConnectionsList: React.FC<ConnectionsListProps> = ({
  embedded = false,
}) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ userId: string; name: string } | null>(
    null,
  );
  const navigate = useNavigate();

  useEffect(() => {
    loadConnections();
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil(connections.length / CONNECTIONS_PAGE_SIZE),
  );

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedConnections = useMemo(() => {
    const start = (currentPage - 1) * CONNECTIONS_PAGE_SIZE;
    return connections.slice(start, start + CONNECTIONS_PAGE_SIZE);
  }, [connections, currentPage]);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const response = await connectionsAPI.getConnections();
      if (response.success) {
        setConnections(response.connections);
      }
    } catch (err: unknown) {
      setError("Failed to load kins");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePagePrevious = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handlePageNext = () => {
    setCurrentPage((p) =>
      Math.min(
        Math.max(1, Math.ceil(connections.length / CONNECTIONS_PAGE_SIZE)),
        p + 1,
      ),
    );
  };

  const handleOpenChat = (connectionId: string) => {
    navigate(`/chat/${connectionId}`);
  };

  const handleRemoveConnectionClick = async (
    otherUserId: string,
    displayName: string,
  ) => {
    const ok = window.confirm(
      `Remove ${displayName} as a kin? You can send them a new Meet request later from Discover.`,
    );
    if (!ok) return;

    setRemovingUserId(otherUserId);
    setError("");
    try {
      await connectionsAPI.removeConnection(otherUserId);
      setConnections((prev) => prev.filter((c) => c._id !== otherUserId));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not remove connection"));
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleBlockConnectionsClick = async (
    otherUserId: string,
    displayName: string,
  ) => {
    const ok = window.confirm(
      `Block ${displayName}? They'll be removed from your kins and won't be able to message you or see you in Discover. Your conversation will be hidden. You can unblock them in Settings & Privacy, but you won't be reconnected.`
    );
    if (!ok) return;
    setBlockingUserId(otherUserId);
    setError("");
    try {
      await blockAPI.blockUser(otherUserId);
      setConnections((prev) => prev.filter((c) => c._id !== otherUserId));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not block connection"));
    } finally {
      setBlockingUserId(null);
    }

  }

  if (isLoading) {
    return (
      <div
        className={
          embedded
            ? "flex min-h-48 flex-1 flex-col items-center justify-center"
            : "flex min-h-0 flex-1 items-center justify-center bg-kin-beige px-4 py-4"
        }
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4"></div>
          <p className="text-kin-navy font-inter">Loading kins...</p>
        </div>
      </div>
    );
  }

  const outerClass = embedded
    ? "flex min-h-0 min-w-0 flex-1 flex-col"
    : "flex min-h-0 flex-1 flex-col bg-kin-beige px-4 py-4";

  return (
    <div className={outerClass}>
      <div className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col">
        <div className={embedded ? "mb-2 shrink-0" : "mb-3 shrink-0"}>
          {embedded ? (
            <h2 className="sr-only">My kins</h2>
          ) : (
            <h1 className="mb-0.5 font-montserrat text-sm font-semibold text-kin-navy">
              My Kins
            </h1>
          )}
          <p className="text-xs text-kin-teal font-inter">
            {connections.length} {connections.length === 1 ? "kin" : "kins"}
          </p>
        </div>

        {error && (
          <div className="mb-3 shrink-0 rounded-kin border border-kin-coral-200 bg-kin-coral-50 px-3 py-2 font-inter text-sm text-kin-coral-700">
            {error}
          </div>
        )}

        {connections.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 text-5xl">🤝</div>
            <h2 className="mb-2 font-montserrat text-xl font-bold text-kin-navy">
              No Kins Yet
            </h2>
            <p className="mb-6 text-sm text-kin-teal font-inter">
              Start discovering people from your homeland and send Meet
              requests!
            </p>
            <button
              type="button"
              onClick={() => navigate("/discover")}
              className="bg-kin-coral text-white px-6 py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 shadow-kin-soft hover:shadow-kin-medium transition"
            >
              Discover People
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul
                className="flex flex-col gap-2 px-2 py-2 sm:px-3"
                role="list"
              >
                {paginatedConnections.map((connection) => {
                  const fullName = `${connection.firstName} ${connection.lastName}`;
                  const connectedLabel =
                    connection.connectedAt &&
                    formatLongDate(connection.connectedAt)
                      ? `Connected on ${formatLongDate(connection.connectedAt)}`
                      : null;
                  const isRemoving = removingUserId === connection._id;
                  const isBlocking = blockingUserId === connection._id;

                  return (
                    <li key={connection._id}>
											<Link to={`/profile/${connection._id}`}>
												<div className="flex min-w-0 items-center gap-3 rounded-kin-lg bg-white px-3 py-4 shadow-kin-medium ring-1 ring-kin-stone-100 transition hover:shadow-kin-strong sm:gap-4 sm:px-4">
													{/* Avatar */}
													<div className="shrink-0">
														{connection.photo ? (
															<img
																src={getPhotoUrl(connection.photo)}
																alt={`Profile photo of ${fullName}`}
																className="h-14 w-14 rounded-full object-cover shadow-kin-soft sm:h-16 sm:w-16"
															/>
														) : (
															<div
																className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-kin-coral to-kin-teal text-lg font-bold font-montserrat text-white shadow-kin-soft sm:h-16 sm:w-16 sm:text-xl"
																aria-hidden
															>
																{connection.firstName.charAt(0)}
															</div>
														)}
													</div>

													{/* Details */}
													<div className="min-w-0 flex-1">
														<h2 className="truncate text-sm font-bold font-montserrat text-kin-navy sm:text-base">
															{fullName}
														</h2>
														<p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs leading-snug text-kin-teal font-inter sm:text-sm sm:leading-normal">
															{getConnectionSummary(connection)}
														</p>
														{connectedLabel ? (
															<p className="mt-1 text-xs text-kin-navy/70 font-inter">
																{connectedLabel}
															</p>
														) : null}
													</div>

                          {/* Actions */}
                          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return handleOpenChat(connection._id);
                              }}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-kin-sm bg-kin-coral text-white shadow-kin-soft transition hover:bg-kin-coral-600 cursor-pointer hover:shadow-kin-medium sm:h-auto sm:w-auto sm:px-4 sm:py-2 sm:text-sm sm:font-semibold font-montserrat"
                              aria-label={`Message ${fullName}`}
                            >
                              <svg
                                className="h-5 w-5 sm:hidden"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                              <span className="hidden sm:inline">Message</span>
                            </button>

                            <ActionMenu
                              label={`More actions for ${fullName}`}
                              items={[
                                {
                                  label: isRemoving ? "Removing…" : "Remove Kin",
                                  onSelect: () =>
                                    void handleRemoveConnectionClick(
                                      connection._id,
                                      fullName,
                                    ),
                                  variant: "destructive",
                                  disabled: isRemoving,
                                },
                                {
                                  label: "Report",
                                  onSelect: () =>
                                    setReportTarget({
                                      userId: connection._id,
                                      name: fullName,
                                    }),
                                  variant: "destructive",
                                },
                                {
                                  label: isBlocking ? "Blocking…" : "Block",
                                  onSelect: () =>
                                    void handleBlockConnectionsClick(
                                      connection._id,
                                      fullName,
                                    ),
                                  variant: "destructive",
                                  disabled: isBlocking,
                                },
                              ]}
                            />
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            <ConnectionsPaginationNav
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={handlePagePrevious}
              onNext={handlePageNext}
              ariaLabel="Connections pagination"
            />
          </div>
        )}
      </div>
      {reportTarget && (
        <ReportUserModal
          isOpen
          userId={reportTarget.userId}
          displayName={reportTarget.name}
          onClose={() => setReportTarget(null)}
          onBlocked={() =>
            setConnections((prev) => prev.filter((c) => c._id !== reportTarget.userId))
          }
        />
      )}
    </div>
  );
};

export default ConnectionsList;
