import React, { useCallback, useId, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useConnectionRequests } from "../../contexts/connectionRequestsContext";
import ConnectionsList from "./ConnectionsList";
import Requests from "./Requests";

type ConnectionsHubTab = "kins" | "requests";

const TAB_PARAM = "tab";

const parseTab = (value: string | null): ConnectionsHubTab => {
  if (value === "requests") return "requests";
  return "kins";
};

const tabTriggerBase =
  "inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded-t-kin-sm border-b-2 px-4 py-3 text-center text-sm font-semibold font-inter transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral sm:w-auto";

const tabTriggerInactive =
  "border-transparent text-kin-navy hover:border-kin-coral/35 hover:text-kin-coral";

const tabTriggerActive = "border-kin-coral text-kin-coral";

const ConnectionsHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pendingRequestCount } = useConnectionRequests();
  const activeTab = useMemo(
    () => parseTab(searchParams.get(TAB_PARAM)),
    [searchParams],
  );
  const baseId = useId().replace(/:/g, "");
  const kinsTabId = `connections-tab-kins-${baseId}`;
  const requestsTabId = `connections-tab-requests-${baseId}`;
  const kinsPanelId = `connections-panel-kins-${baseId}`;
  const requestsPanelId = `connections-panel-requests-${baseId}`;

  const handleTabChange = useCallback(
    (tab: ConnectionsHubTab) => {
      setSearchParams(tab === "requests" ? { tab: "requests" } : {}, {
        replace: true,
      });
    },
    [setSearchParams],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-kin-beige">
      <div className="mx-auto w-full max-w-4xl shrink-0 px-4 pt-6">
        {/* Flowbite-style underline tabs (https://flowbite.com/docs/components/tabs/) */}
        <div className="mb-4 shrink-0 border-b border-kin-stone-200">
          <ul
            className="-mb-px flex flex-wrap text-center text-sm font-medium font-inter"
            role="tablist"
            aria-label="Kins sections"
          >
            <li
              className="me-2 min-w-0 flex-1 sm:flex-none"
              role="presentation"
            >
              <button
                type="button"
                id={kinsTabId}
                role="tab"
                aria-selected={activeTab === "kins"}
                aria-controls={kinsPanelId}
                tabIndex={activeTab === "kins" ? 0 : -1}
                className={`${tabTriggerBase} ${
                  activeTab === "kins" ? tabTriggerActive : tabTriggerInactive
                }`}
                onClick={() => handleTabChange("kins")}
              >
                My kins
              </button>
            </li>
            <li className="min-w-0 flex-1 sm:flex-none" role="presentation">
              <button
                type="button"
                id={requestsTabId}
                role="tab"
                aria-selected={activeTab === "requests"}
                aria-controls={requestsPanelId}
                tabIndex={activeTab === "requests" ? 0 : -1}
                className={`${tabTriggerBase} ${
                  activeTab === "requests"
                    ? tabTriggerActive
                    : tabTriggerInactive
                }`}
                onClick={() => handleTabChange("requests")}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  Requests
                  {pendingRequestCount > 0 ? (
                    <span
                      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                        activeTab === "requests"
                          ? "bg-kin-coral/15 text-kin-coral"
                          : "bg-kin-coral text-white"
                      }`}
                    >
                      {pendingRequestCount > 99 ? "99+" : pendingRequestCount}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-4 pb-8">
        <div
          id={kinsPanelId}
          role="tabpanel"
          aria-labelledby={kinsTabId}
          hidden={activeTab !== "kins"}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          {activeTab === "kins" ? <ConnectionsList embedded /> : null}
        </div>

        <div
          id={requestsPanelId}
          role="tabpanel"
          aria-labelledby={requestsTabId}
          hidden={activeTab !== "requests"}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          {activeTab === "requests" ? <Requests embedded /> : null}
        </div>
      </div>
    </div>
  );
};

export default ConnectionsHub;
