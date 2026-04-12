import React, { useEffect, useState } from 'react';
import { useConnectionRequests } from '../../contexts/connectionRequestsContext';
import { connectionsAPI, getPhotoUrl } from '../../services/api';
import { getErrorMessage } from '../../utils/error';
import type { ConnectionRequestItem } from '../../types';

const Requests: React.FC = () => {
  const { refetchConnectionRequests } = useConnectionRequests();
  const [requests, setRequests] = useState<ConnectionRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const response = await connectionsAPI.getConnectionRequests();
      if (response.success) {
        setRequests(response.requests);
      }
    } catch (err: unknown) {
      setError('Failed to load connection requests');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await connectionsAPI.acceptRequest(requestId);
      setRequests((prev) => prev.filter((req) => req._id !== requestId));
      void refetchConnectionRequests();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to accept request'));
    }
  };

  const handleIgnore = async (requestId: string) => {
    try {
      await connectionsAPI.ignoreRequest(requestId);
      setRequests((prev) => prev.filter((req) => req._id !== requestId));
      void refetchConnectionRequests();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to ignore request'));
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4"></div>
          <p className="text-kin-navy font-inter">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 bg-kin-beige px-4 py-8">
      <div className="mx-auto max-w-4xl min-w-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">Connection Requests</h1>
          <p className="text-kin-teal font-inter">
            {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </p>
        </div>

        {error && (
          <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter mb-6">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👋</div>
            <h2 className="text-2xl font-bold font-montserrat text-kin-navy mb-2">No Pending Requests</h2>
            <p className="text-kin-teal font-inter">
              When someone sends you a Meet request, it will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="min-w-0 bg-white rounded-kin-lg shadow-kin-medium p-4 sm:p-6 hover:shadow-kin-strong transition"
              >
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className="shrink-0">
                    {request.sender.photo ? (
                      <img
                        src={getPhotoUrl(request.sender.photo)}
                        alt={request.sender.firstName}
                        className="w-16 h-16 rounded-full object-cover shadow-kin-soft"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-kin-coral to-kin-teal flex items-center justify-center text-white text-2xl font-bold font-montserrat shadow-kin-soft">
                        {request.sender.firstName.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h3 className="wrap-break-word text-xl font-bold font-montserrat text-kin-navy">
                        {request.sender.firstName}
                      </h3>
                      <span className="text-sm text-kin-teal font-inter">sent you a Meet request</span>
                    </div>

                    <div className="mb-4 space-y-2 wrap-break-word">
                      <p className="text-kin-navy text-sm font-inter">
                        <span className="font-semibold">Home Country:</span> {request.sender.homeCountry}
                      </p>
                      <p className="text-kin-navy text-sm font-inter">
                        <span className="font-semibold">Living in:</span>{' '}
                        {request.sender.currentProvince}, {request.sender.currentCountry}
                      </p>
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                        <span className="shrink-0 text-kin-navy text-sm font-semibold font-inter">Speaks:</span>
                        <div className="flex min-w-0 flex-wrap gap-1">
                          {request.sender.languages.map((lang, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-kin-teal-100 text-kin-teal-700 rounded-full text-xs font-inter"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                        <span className="shrink-0 text-kin-navy text-sm font-semibold font-inter">
                          Looking For:
                        </span>
                        <div className="flex min-w-0 flex-wrap gap-1">
                          {request.sender.lookingFor.map((item, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-kin-coral-100 text-kin-coral-700 rounded-full text-xs font-inter"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                      <button
                        onClick={() => handleAccept(request._id)}
                        className="flex w-full items-center justify-center bg-kin-coral px-6 py-2 font-semibold font-montserrat text-white shadow-kin-soft transition hover:bg-kin-coral-600 hover:shadow-kin-medium sm:w-auto rounded-kin-sm"
                        aria-label="Accept connection request"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Accept
                      </button>
                      <button
                        onClick={() => handleIgnore(request._id)}
                        className="flex w-full items-center justify-center bg-kin-stone-200 px-6 py-2 font-semibold font-montserrat text-kin-navy shadow-kin-soft transition hover:bg-kin-stone-300 sm:w-auto rounded-kin-sm"
                        aria-label="Ignore connection request"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Ignore
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;

