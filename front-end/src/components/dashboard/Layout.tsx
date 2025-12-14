import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../common/Logo';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/discover', label: 'Discover', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { path: '/requests', label: 'Requests', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { path: '/connections', label: 'Connections', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  ];

  return (
    <div className="min-h-screen bg-kin-beige">
      {/* Top Navigation */}
      <nav className="bg-white shadow-kin-soft border-b border-kin-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/discover" className="flex items-center gap-2">
                <Logo size="md" />
                <span className="text-2xl font-bold font-montserrat text-kin-navy">KinMeet</span>
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden md:ml-10 md:flex md:space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium font-inter rounded-kin-sm transition ${
                      isActive(item.path)
                        ? 'text-kin-coral bg-kin-coral-50 shadow-kin-soft'
                        : 'text-kin-navy hover:text-kin-coral hover:bg-kin-beige'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center">
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-kin-sm hover:bg-kin-beige transition"
                  aria-label="User menu"
                  aria-expanded={showMenu}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kin-coral to-kin-teal flex items-center justify-center text-white font-bold font-montserrat shadow-kin-soft">
                    {user?.firstName.charAt(0)}
                  </div>
                  <span className="hidden md:block text-sm font-medium font-inter text-kin-navy">
                    {user?.firstName}
                  </span>
                  <svg className="w-4 h-4 text-kin-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-kin shadow-kin-medium py-1 z-10 border border-kin-stone-200">
                    <Link
                      to="/profile"
                      onClick={() => setShowMenu(false)}
                      className="block px-4 py-2 text-sm font-inter text-kin-navy hover:bg-kin-beige hover:text-kin-coral transition"
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm font-inter text-kin-coral hover:bg-kin-coral-50 transition"
                    >
                      Sign Out
                    </button>
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
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-3 px-4 flex-1 transition ${
                isActive(item.path)
                  ? 'text-kin-coral'
                  : 'text-kin-navy hover:text-kin-coral'
              }`}
              aria-label={item.label}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-xs mt-1 font-medium font-inter">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
};

export default Layout;

