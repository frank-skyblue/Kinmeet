import { createContext } from 'react';

export interface ConnectionRequestsContextValue {
  /** Pending kin requests, for the Kins tab badge. */
  pendingRequestCount: number;
  refetchConnectionRequests: () => Promise<void>;
}

export const ConnectionRequestsContext = createContext<ConnectionRequestsContextValue | undefined>(
  undefined,
);
