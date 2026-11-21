import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { connectionsAPI } from '../services/api';
import { ConnectionRequestsContext } from './connection-requests-context';

type ConnectionRequestsProviderProps = {
  children: ReactNode;
};

/**
 * Pending kin request count for the tab badge (port of the web provider). Mounted only while signed
 * in. Refreshes on mount and whenever the app comes back to the foreground; the Kins screen also
 * refreshes it after accepting, ignoring or blocking.
 */
export const ConnectionRequestsProvider = ({ children }: ConnectionRequestsProviderProps) => {
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const refetchConnectionRequests = useCallback(async () => {
    try {
      const data = await connectionsAPI.getConnectionRequests();
      if (data.success) setPendingRequestCount(data.requests.length);
    } catch {
      // The badge is best-effort; a failed refresh keeps the last count.
    }
  }, []);

  useEffect(() => {
    void refetchConnectionRequests();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetchConnectionRequests();
    });
    return () => subscription.remove();
  }, [refetchConnectionRequests]);

  return (
    <ConnectionRequestsContext.Provider value={{ pendingRequestCount, refetchConnectionRequests }}>
      {children}
    </ConnectionRequestsContext.Provider>
  );
};
