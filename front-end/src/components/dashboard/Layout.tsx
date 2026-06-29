import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { useChatInbox } from "../../contexts/chatInboxContext";
import { useConnectionRequests } from "../../contexts/connectionRequestsContext";
import { getPhotoUrl } from "../../services/api";
import Logo from "../common/Logo";

type NavItem = {
  path: string;
  label: string;
  icon: string;
  match?: "exact" | "prefix";
};

const CHAT_ICON_PATH =
  "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z";

const PROFILE_ICON_PATH =
  "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z";

const SIGN_OUT_ICON_PATH =
  "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1";

type MenuIconProps = {
  path: string;
};

const MenuIcon: React.FC<MenuIconProps> = ({ path }) => (
  <svg
    className="h-4 w-4 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d={path}
    />
  </svg>
);

const navBadgeForItem = (
  item: NavItem,
  pendingRequestCount: number,
): { label: string; ariaDetail: string } | null => {
  if (item.path === "/connections" && pendingRequestCount > 0) {
    return {
      label: pendingRequestCount > 99 ? "99+" : String(pendingRequestCount),
      ariaDetail: `${pendingRequestCount} pending kin requests`,
    };
  }
  return null;
};

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadConversationCount } = useChatInbox();
  const { pendingRequestCount } = useConnectionRequests();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isNavActive = (item: NavItem) => {
    if (item.match === "prefix") {
      return (
        location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`)
      );
    }
    return location.pathname === item.path;
  };

  const navItems: NavItem[] = [
    {
      path: "/discover",
      label: "Discover",
      icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    },
    {
      path: "/connections",
      label: "Kins",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    },
  ];

  const chatBadgeLabel =
    unreadConversationCount > 99 ? "99+" : String(unreadConversationCount);
  const chatAriaLabel =
    unreadConversationCount > 0
      ? `Messages, ${unreadConversationCount} unread conversations`
      : "Messages";

  const isChatRoute =
    location.pathname === "/chat" || location.pathname.startsWith("/chat/");

  return (
    <div className="h-screen flex flex-col bg-kin-beige overflow-hidden">
      {/* Top Navigation */}
      <nav className="shrink-0 bg-white shadow-kin-soft border-b border-kin-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/discover" className="flex items-center gap-2">
                <Logo size="md" />
                <span className="text-2xl font-bold font-montserrat text-kin-navy">
                  KinMeet
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:ml-10 md:flex md:space-x-4">
                {navItems.map((item) => {
                  const badge = navBadgeForItem(item, pendingRequestCount);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium font-inter rounded-kin-sm transition ${
                        isNavActive(item)
                          ? "text-kin-coral bg-kin-coral-50 shadow-kin-soft"
                          : "text-kin-navy hover:text-kin-coral hover:bg-kin-beige"
                      }`}
                      aria-label={
                        badge
                          ? `${item.label}, ${badge.ariaDetail}`
                          : item.label
                      }
                    >
                      <span className="relative mr-2 inline-flex">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={item.icon}
                          />
                        </svg>
                        {badge && (
                          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-kin-coral px-1 text-[10px] font-bold text-white font-inter">
                            {badge.label}
                          </span>
                        )}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Messages + User Menu */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                to="/chat"
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-kin-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral ${
                  isChatRoute
                    ? "text-kin-coral bg-kin-coral-50 shadow-kin-soft"
                    : "text-kin-navy hover:bg-kin-beige hover:text-kin-coral"
                }`}
                aria-label={chatAriaLabel}
                aria-current={isChatRoute ? "page" : undefined}
              >
                <span className="relative inline-flex h-6 w-6 items-center justify-center">
                  <svg
                    className="h-6 w-6 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={CHAT_ICON_PATH}
                    />
                  </svg>
                  {unreadConversationCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-kin-coral px-0.5 text-[9px] font-bold text-white font-inter sm:h-5 sm:min-w-5 sm:px-1 sm:text-[10px]">
                      {chatBadgeLabel}
                    </span>
                  )}
                </span>
              </Link>

              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex h-12 items-center gap-2 px-3 rounded-kin-sm hover:bg-kin-beige transition"
                  aria-label="User menu"
                  aria-expanded={showMenu}
                >
                  {user?.photo ? (
                    <img
                      src={getPhotoUrl(user.photo)}
                      alt={user.firstName}
                      className="w-8 h-8 rounded-full object-cover shadow-kin-soft"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kin-coral to-kin-teal flex items-center justify-center text-white font-bold font-montserrat shadow-kin-soft">
                      {user?.firstName.charAt(0)}
                    </div>
                  )}
                  <span className="hidden md:block text-sm font-medium font-inter text-kin-navy">
                    {user?.firstName}
                  </span>
                  <svg
                    className="w-4 h-4 text-kin-navy"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 bg-white rounded-kin shadow-kin-medium py-1 border border-kin-stone-200">
                    <Link
                      to="/profile"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-inter text-kin-navy hover:bg-kin-beige hover:text-kin-coral transition"
                    >
                      <MenuIcon path={PROFILE_ICON_PATH} />
                      My Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-inter text-kin-coral hover:bg-kin-coral-50 transition"
                    >
                      <MenuIcon path={SIGN_OUT_ICON_PATH} />
                      Sign Out
                    </button>
                    <Link
                      to="/settings"
                      onClick={() => setShowMenu(false)}
                      className="block px-4 py-2 text-sm font-inter text-kin-navy hover:bg-kin-beige hover:text-kin-coral transition"
                    >
                      Settings &amp; Privacy
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-kin-stone-200 shadow-kin-medium z-50">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const badge = navBadgeForItem(item, pendingRequestCount);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-1 flex-col items-center px-4 py-3 transition ${
                  isNavActive(item)
                    ? "text-kin-coral"
                    : "text-kin-navy hover:text-kin-coral"
                }`}
                aria-label={
                  badge ? `${item.label}, ${badge.ariaDetail}` : item.label
                }
              >
                <span className="relative inline-flex">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.icon}
                    />
                  </svg>
                  {badge && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-kin-coral px-0.5 text-[9px] font-bold text-white font-inter">
                      {badge.label}
                    </span>
                  )}
                </span>
                <span className="mt-1 text-xs font-medium font-inter">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main
        className={`flex min-h-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0 ${
          isChatRoute ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
