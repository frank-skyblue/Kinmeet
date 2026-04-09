import React, { useCallback, useEffect, useState } from 'react';
import { connectionsAPI } from '../services/api';
import { ConnectionRequestsContext } from './connectionRequestsContext';
import { useAuth } from './AuthContext';

interface ConnectionRequestsProviderProps {
  children: React.ReactNode;
}

export const ConnectionRequestsProvider: React.FC<ConnectionRequestsProviderProps> = ({
  children,
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const refetchConnectionRequests = useCallback(async () => {
    if (!user) return;
    try {
      const data = await connectionsAPI.getConnectionRequests();
      if (data.success) {
        setPendingRequestCount(data.requests.length);
      }
    } catch {
      // Badge is best-effort; avoid surfacing errors in the shell.
    }
  }, [user]);

  useEffect(() => {
    if (user) return;
    setPendingRequestCount(0);
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void refetchConnectionRequests();
  }, [user?.id, authLoading, refetchConnectionRequests]);

  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refetchConnectionRequests();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, refetchConnectionRequests]);

  return (
    <ConnectionRequestsContext.Provider
      value={{ pendingRequestCount, refetchConnectionRequests }}
    >
      {children}
    </ConnectionRequestsContext.Provider>
  );
};
