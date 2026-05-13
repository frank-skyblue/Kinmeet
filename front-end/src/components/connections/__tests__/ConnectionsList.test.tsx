import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConnectionsList from "../ConnectionsList";

const mockConnections = [
  {
    _id: "conn-1",
    firstName: "Marie",
    lastName: "Dupont",
    homeCountry: "France",
    currentProvince: "Ontario",
    currentCountry: "Canada",
    languages: ["French", "English"],
    interests: ["Cooking", "Hiking"],
    lookingFor: ["Friendship"],
  },
];

const baseMockConnection = {
  lastName: "Test",
  homeCountry: "France",
  currentProvince: "Ontario",
  currentCountry: "Canada",
  languages: ["French"],
  interests: ["Cooking"],
  lookingFor: ["Friendship"] as string[],
};

const buildMockConnections = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    ...baseMockConnection,
    _id: `conn-${i + 1}`,
    firstName: `Kin${i + 1}`,
  }));

vi.mock("../../../services/api", () => ({
  connectionsAPI: {
    getConnections: vi.fn(),
    removeConnection: vi.fn(),
  },
  getPhotoUrl: (p: string) => p,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

import { connectionsAPI } from "../../../services/api";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const renderList = () =>
  render(
    <MemoryRouter>
      <ConnectionsList />
    </MemoryRouter>,
  );

describe("ConnectionsList", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(connectionsAPI.getConnections).mockResolvedValue({
      success: true,
      connections: mockConnections,
    });
    vi.mocked(connectionsAPI.removeConnection).mockResolvedValue({
      success: true,
    });
  });

  it("renders connections with full names", async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
    });
    expect(screen.getByText("1 kin")).toBeInTheDocument();
  });

  it("shows empty state when no connections", async () => {
    vi.mocked(connectionsAPI.getConnections).mockResolvedValue({
      success: true,
      connections: [],
    });
    renderList();
    await waitFor(() => {
      expect(screen.getByText("No Kins Yet")).toBeInTheDocument();
    });
  });

  it("navigates to chat on Send Message click", async () => {
    const user = userEvent.setup();
    renderList();
    await waitFor(() =>
      expect(screen.getByText("Marie Dupont")).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole("button", { name: /^message marie dupont$/i }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/chat/conn-1");
  });

  it("calls removeConnection and removes the row when confirmed", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderList();
    await waitFor(() =>
      expect(screen.getByText("Marie Dupont")).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole("button", { name: /more actions for marie dupont/i }),
    );
    await user.click(screen.getByRole("menuitem", { name: /remove kin/i }));

    await waitFor(() =>
      expect(connectionsAPI.removeConnection).toHaveBeenCalledWith("conn-1"),
    );
    expect(screen.queryByText("Marie Dupont")).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("does not show pagination when at most 5 connections", async () => {
    vi.mocked(connectionsAPI.getConnections).mockResolvedValue({
      success: true,
      connections: buildMockConnections(5),
    });
    renderList();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Kin1 Test", level: 2 }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("navigation", { name: /connections pagination/i }),
    ).not.toBeInTheDocument();
  });

  it("paginates 6 connections and navigates with Previous / Next", async () => {
    const user = userEvent.setup();
    vi.mocked(connectionsAPI.getConnections).mockResolvedValue({
      success: true,
      connections: buildMockConnections(6),
    });
    renderList();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Kin1 Test", level: 2 }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: "Kin5 Test", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Kin6 Test", level: 2 }),
    ).not.toBeInTheDocument();
    const pagination = screen.getByRole("navigation", {
      name: /connections pagination/i,
    });
    expect(pagination).toHaveTextContent("1/2");

    await user.click(
      screen.getByRole("button", { name: /^next page$/i }),
    );
    expect(
      screen.getByRole("heading", { name: "Kin6 Test", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Kin1 Test", level: 2 }),
    ).not.toBeInTheDocument();
    expect(pagination).toHaveTextContent("2/2");

    await user.click(
      screen.getByRole("button", { name: /^previous page$/i }),
    );
    expect(
      screen.getByRole("heading", { name: "Kin1 Test", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Kin6 Test", level: 2 }),
    ).not.toBeInTheDocument();
  });

  it("does not call removeConnection when confirm is cancelled", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderList();
    await waitFor(() =>
      expect(screen.getByText("Marie Dupont")).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole("button", { name: /more actions for marie dupont/i }),
    );
    await user.click(screen.getByRole("menuitem", { name: /remove kin/i }));

    expect(connectionsAPI.removeConnection).not.toHaveBeenCalled();
    expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
