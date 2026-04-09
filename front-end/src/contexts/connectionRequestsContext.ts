import { createContext, useContext } from 'react';

export interface ConnectionRequestsContextValue {
  pendingRequestCount: number;
  refetchConnectionRequests: () => Promise<void>;
}

export const ConnectionRequestsContext = createContext<
  ConnectionRequestsContextValue | undefined
>(undefined);

export const useConnectionRequests = () => {
  const ctx = useContext(ConnectionRequestsContext);
  if (ctx === undefined) {
    throw new Error('useConnectionRequests must be used within ConnectionRequestsProvider');
  }
  return ctx;
};
