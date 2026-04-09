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
import Requests from './components/connections/Requests';
import ConnectionsList from './components/connections/ConnectionsList';
import Chat from './components/chat/Chat';
import Profile from './components/profile/Profile';

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
                    <Route path="/requests" element={<Requests />} />
                    <Route path="/connections" element={<ConnectionsList />} />
                    <Route path="/profile" element={<Profile />} />
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
