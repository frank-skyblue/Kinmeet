import { createContext } from 'react';
import type { Socket } from 'socket.io-client';

export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

export const SocketContext = createContext<SocketContextValue | undefined>(undefined);
