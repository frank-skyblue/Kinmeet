import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Requests from "../Requests";

const { mockRefetchConnectionRequests } = vi.hoisted(() => ({
  mockRefetchConnectionRequests: vi.fn(),
}));

vi.mock("../../../contexts/connectionRequestsContext", () => ({
  useConnectionRequests: () => ({
    pendingRequestCount: 0,
    refetchConnectionRequests: mockRefetchConnectionRequests,
  }),
}));

const DAY_MS = 24 * 60 * 60 * 1000;
// Well past their 30th birthday, so the expected age holds whenever the test runs.
const THIRTY_YEARS_OLD = new Date(Date.now() - (30 * 365.25 + 60) * DAY_MS).toISOString();

const mockRequests = [
  {
    _id: "req-1",
    sender: {
      _id: "user-2",
      firstName: "Marie",
      dateOfBirth: THIRTY_YEARS_OLD,
      homeCountry: "France",
      currentProvince: "Ontario",
      currentCountry: "Canada",
      languages: ["French"],
      interests: [],
      lookingFor: ["Friendship"],
    },
    createdAt: new Date().toISOString(),
  },
];

vi.mock("../../../services/api", () => ({
  connectionsAPI: {
    getConnectionRequests: vi.fn(),
    acceptRequest: vi.fn(),
    ignoreRequest: vi.fn(),
  },
  getPhotoUrl: (p: string) => p,
}));

import { connectionsAPI } from "../../../services/api";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const renderRequests = () =>
  render(
    <MemoryRouter>
      <Requests />
    </MemoryRouter>,
  );

describe("Requests", () => {
  beforeEach(() => {
    mockRefetchConnectionRequests.mockClear();
    // Force 2-column page size (4 per page): below md and lg breakpoints.
    window.matchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })) as unknown as typeof window.matchMedia;
    vi.mocked(connectionsAPI.getConnectionRequests).mockResolvedValue({
      success: true,
      requests: mockRequests,
    });
    vi.mocked(connectionsAPI.acceptRequest).mockResolvedValue({
      success: true,
    });
    vi.mocked(connectionsAPI.ignoreRequest).mockResolvedValue({
      success: true,
    });
  });

  it("renders pending requests", async () => {
    renderRequests();
    await waitFor(() => {
      expect(screen.getByText(/^Marie\b/)).toBeInTheDocument();
    });
    expect(screen.getByText("1 pending")).toBeInTheDocument();
  });

  it("shows the sender's first name and age", async () => {
    renderRequests();
    expect(await screen.findByText("Marie, 30")).toBeInTheDocument();
  });

  it("leaves no stray comma when the age is missing", async () => {
    vi.mocked(connectionsAPI.getConnectionRequests).mockResolvedValue({
      success: true,
      requests: [{ ...mockRequests[0], sender: { ...mockRequests[0].sender, dateOfBirth: "" } }],
    });
    renderRequests();
    expect(await screen.findByText("Marie")).toBeInTheDocument();
  });

  describe("age", () => {
    beforeEach(() => {
      // Only Date is faked: the timers that findByText relies on keep running.
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 5, 15, 12));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([
      ["the day after their birthday", "1996-06-14T00:00:00.000Z", "Marie, 30"],
      ["on their birthday", "1996-06-15T00:00:00.000Z", "Marie, 30"],
      ["the day before their birthday", "1996-06-16T00:00:00.000Z", "Marie, 29"],
      ["a month before their birthday", "1996-07-15T00:00:00.000Z", "Marie, 29"],
      ["a date that can't be read", "not-a-date", "Marie"],
    ])("is correct %s", async (_when, dateOfBirth, expected) => {
      vi.mocked(connectionsAPI.getConnectionRequests).mockResolvedValue({
        success: true,
        requests: [{ ...mockRequests[0], sender: { ...mockRequests[0].sender, dateOfBirth } }],
      });
      renderRequests();
      expect(await screen.findByText(expected)).toBeInTheDocument();
    });
  });

  it("shows empty state when no requests", async () => {
    vi.mocked(connectionsAPI.getConnectionRequests).mockResolvedValue({
      success: true,
      requests: [],
    });
    renderRequests();
    await waitFor(() => {
      expect(screen.getByText("No Pending Requests")).toBeInTheDocument();
    });
  });

  it("removes request from list on Accept", async () => {
    const user = userEvent.setup();
    renderRequests();
    await waitFor(() => expect(screen.getByText(/^Marie\b/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /accept/i }));

    await waitFor(() => {
      expect(screen.queryByText(/^Marie\b/)).not.toBeInTheDocument();
    });
    expect(connectionsAPI.acceptRequest).toHaveBeenCalledWith("req-1");
    expect(mockRefetchConnectionRequests).toHaveBeenCalled();
  });

  it("removes request from list on Ignore", async () => {
    const user = userEvent.setup();
    renderRequests();
    await waitFor(() => expect(screen.getByText(/^Marie\b/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /ignore/i }));

    await waitFor(() => {
      expect(screen.queryByText(/^Marie\b/)).not.toBeInTheDocument();
    });
    expect(connectionsAPI.ignoreRequest).toHaveBeenCalledWith("req-1");
    expect(mockRefetchConnectionRequests).toHaveBeenCalled();
  });

  it("does not show pagination when at most 4 requests (2-column page size)", async () => {
    const four = Array.from({ length: 4 }, (_, i) => ({
      ...mockRequests[0],
      _id: `req-${i + 1}`,
      sender: { ...mockRequests[0].sender, firstName: `U${i + 1}` },
    }));
    vi.mocked(connectionsAPI.getConnectionRequests).mockResolvedValue({
      success: true,
      requests: four,
    });
    renderRequests();
    await waitFor(() => expect(screen.getByText(/^U1\b/)).toBeInTheDocument());
    expect(
      screen.queryByRole("navigation", { name: /kin requests pagination/i }),
    ).not.toBeInTheDocument();
  });

  it("paginates 6 requests and navigates with Previous / Next", async () => {
    const user = userEvent.setup();
    const six = Array.from({ length: 6 }, (_, i) => ({
      ...mockRequests[0],
      _id: `req-${i + 1}`,
      sender: { ...mockRequests[0].sender, firstName: `User${i + 1}` },
    }));
    vi.mocked(connectionsAPI.getConnectionRequests).mockResolvedValue({
      success: true,
      requests: six,
    });
    renderRequests();
    await waitFor(() => expect(screen.getByText(/^User1\b/)).toBeInTheDocument());
    expect(screen.getByText(/^User4\b/)).toBeInTheDocument();
    expect(screen.queryByText(/^User5\b/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^User6\b/)).not.toBeInTheDocument();
    const pagination = screen.getByRole("navigation", {
      name: /kin requests pagination/i,
    });
    expect(pagination).toHaveTextContent("1/2");

    await user.click(screen.getByRole("button", { name: /^next page$/i }));
    expect(screen.getByText(/^User6\b/)).toBeInTheDocument();
    expect(screen.queryByText(/^User1\b/)).not.toBeInTheDocument();
    expect(pagination).toHaveTextContent("2/2");

    await user.click(screen.getByRole("button", { name: /^previous page$/i }));
    expect(screen.getByText(/^User1\b/)).toBeInTheDocument();
    expect(screen.queryByText(/^User6\b/)).not.toBeInTheDocument();
  });
});
