import React, { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { socketService } from '../services/socketService';
import { profileAPI } from '../services/api';
import { useAuth } from './useAuth';
import { activeUserOrNull } from '../utils/account';
import { SocketContext } from './socket-context';

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user: authUser, isLoading } = useAuth();
  const user = activeUserOrNull(authUser);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        const socketInstance = socketService.connect(token);
        setSocket(socketInstance);

        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = (reason: Socket.DisconnectReason) => {
          setIsConnected(false);
          // The server drops sockets when the session is revoked, and socket.io won't
          // reconnect on its own. Any authenticated request then confirms it: a 401
          // INVALID_TOKEN signs this device out through the API interceptor.
          if (reason === 'io server disconnect') {
            void profileAPI.getProfile().catch(() => undefined);
          }
        };

        socketInstance.on('connect', handleConnect);
        socketInstance.on('disconnect', handleDisconnect);

        setIsConnected(socketInstance.connected);

        return () => {
          socketInstance.off('connect', handleConnect);
          socketInstance.off('disconnect', handleDisconnect);
        };
      }
    } else {
      socketService.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [user, isLoading]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

if (import.meta.hot) {
  import.meta.hot.accept();
}
