import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              {/* Routes with dashboard Layout */}
              <Route element={<Layout />}>
                <Route path="/discover" element={<Discover />} />
                <Route path="/requests" element={<Requests />} />
                <Route path="/connections" element={<ConnectionsList />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Full-screen routes (no Layout) */}
              <Route path="/chat/:userId" element={<Chat />} />
            </Route>

            {/* Redirect root to discover */}
            <Route path="/" element={<Navigate to="/discover" replace />} />

            {/* Catch all - redirect to discover */}
            <Route path="*" element={<Navigate to="/discover" replace />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
