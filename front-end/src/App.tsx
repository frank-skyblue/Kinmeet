import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ChatInboxProvider } from './contexts/ChatInboxProvider';
import { ConnectionRequestsProvider } from './contexts/ConnectionRequestsProvider';
import { SocketProvider } from './contexts/SocketContext';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/dashboard/Layout';
import Discover from './components/matching/Discover';
import ConnectionsHub from './components/connections/ConnectionsHub';
import Chat from './components/chat/Chat';
import Profile from './components/profile/Profile';
import SettingsPrivacy from './components/settings/SettingsPrivacy';
import AccountSettings from './components/settings/AccountSettings';

const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <ChatInboxProvider>
          <ConnectionRequestsProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/discover" element={<Discover />} />
                    <Route path="/connections" element={<ConnectionsHub />} />
                    <Route
                      path="/requests"
                      element={<Navigate to="/connections?tab=requests" replace />}
                    />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/:userId" element={<Profile />} />
                    <Route path="/settings" element={<SettingsPrivacy />} />
                    <Route path="/settings/account" element={<AccountSettings />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/chat/:userId" element={<Chat />} />
                  </Route>
                </Route>

                <Route path="/" element={<Navigate to="/discover" replace />} />
                <Route path="*" element={<Navigate to="/discover" replace />} />
              </Routes>
            </Router>
          </ConnectionRequestsProvider>
        </ChatInboxProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
