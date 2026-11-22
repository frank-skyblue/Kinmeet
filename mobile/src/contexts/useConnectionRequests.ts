import { useContext } from 'react';
import { ConnectionRequestsContext } from './connection-requests-context';

export const useConnectionRequests = () => {
  const context = useContext(ConnectionRequestsContext);
  if (!context) {
    throw new Error('useConnectionRequests must be used within a ConnectionRequestsProvider');
  }
  return context;
};
