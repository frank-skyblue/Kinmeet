import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Socket } from 'socket.io-client';
import { createChatSocket } from '../services/socketService';
import { SocketContext } from './socket-context';

type SocketProviderProps = {
  token: string;
  children: ReactNode;
};

/**
 * The realtime chat connection (port of the web SocketProvider). Mounted only while signed in, so
 * signing out closes it. The phone drops the connection in the background; coming back to the app
 * reconnects straight away instead of waiting for the next retry.
 */
export const SocketProvider = ({ token, children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const instance = createChatSocket(token);
    setSocket(instance);
    setIsConnected(instance.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    instance.on('connect', handleConnect);
    instance.on('disconnect', handleDisconnect);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !instance.connected) instance.connect();
    });

    return () => {
      subscription.remove();
      instance.off('connect', handleConnect);
      instance.off('disconnect', handleDisconnect);
      instance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
};
