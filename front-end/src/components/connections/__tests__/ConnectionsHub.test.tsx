import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConnectionsHub from "../ConnectionsHub";

vi.mock("../../../contexts/connectionRequestsContext", () => ({
  useConnectionRequests: () => ({
    pendingRequestCount: 2,
    refetchConnectionRequests: vi.fn(),
  }),
}));

vi.mock("../../../services/api", () => ({
  connectionsAPI: {
    getConnections: vi.fn(),
    getConnectionRequests: vi.fn(),
    acceptRequest: vi.fn(),
    ignoreRequest: vi.fn(),
    removeConnection: vi.fn(),
  },
  getPhotoUrl: (p: string) => p,
}));

import { connectionsAPI } from "../../../services/api";

const renderHub = (initialEntry = "/connections") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/connections" element={<ConnectionsHub />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ConnectionsHub", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })) as unknown as typeof window.matchMedia;
    vi.mocked(connectionsAPI.getConnections).mockResolvedValue({
      success: true,
      connections: [],
    });
    vi.mocked(connectionsAPI.getConnectionRequests).mockResolvedValue({
      success: true,
      requests: [],
    });
  });

  it("defaults to My kins tab and loads kins", async () => {
    renderHub();
    const kinsTab = screen.getByRole("tab", { name: /^my kins$/i });
    expect(kinsTab).toHaveAttribute("aria-selected", "true");
    await waitFor(() => {
      expect(screen.getByText("No Kins Yet")).toBeInTheDocument();
    });
    expect(connectionsAPI.getConnections).toHaveBeenCalled();
  });

  it("shows Requests tab with pending count from context", async () => {
    renderHub();
    await waitFor(() => {
      expect(connectionsAPI.getConnections).toHaveBeenCalled();
    });
    const requestsTab = screen.getByRole("tab", { name: /requests/i });
    expect(requestsTab).toHaveTextContent("2");
  });

  it("opens requests panel when URL has tab=requests", async () => {
    renderHub("/connections?tab=requests");
    await waitFor(() => {
      expect(screen.getByText("No Pending Requests")).toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: /requests/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(connectionsAPI.getConnectionRequests).toHaveBeenCalled();
  });

  it("treats invalid tab query as My kins", async () => {
    renderHub("/connections?tab=nope");
    await waitFor(() => {
      expect(screen.getByText("No Kins Yet")).toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: /^my kins$/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("switches to requests when Requests tab is clicked", async () => {
    const user = userEvent.setup();
    renderHub();
    await waitFor(() => expect(screen.getByText("No Kins Yet")).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: /requests/i }));

    await waitFor(() => {
      expect(screen.getByText("No Pending Requests")).toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: /requests/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
