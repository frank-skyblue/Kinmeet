import React, { useEffect, useState } from 'react';
import { connectionsAPI } from '../../services/api';

interface ConnectionRequest {
  _id: string;
  sender: {
    _id: string;
    firstName: string;
    homeCountry: string;
    currentProvince: string;
    currentCountry: string;
    languages: string[];
    interests: string[];
    lookingFor: string[];
    photo?: string;
  };
  createdAt: string;
}

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
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
    } catch (err: any) {
      setError('Failed to load connection requests');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await connectionsAPI.acceptRequest(requestId);
      setRequests(requests.filter(req => req._id !== requestId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept request');
    }
  };

  const handleIgnore = async (requestId: string) => {
    try {
      await connectionsAPI.ignoreRequest(requestId);
      setRequests(requests.filter(req => req._id !== requestId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to ignore request');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4"></div>
          <p className="text-kin-navy font-inter">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kin-beige py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
                className="bg-white rounded-kin-lg shadow-kin-medium p-6 hover:shadow-kin-strong transition"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {request.sender.photo ? (
                      <img
                        src={request.sender.photo}
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold font-montserrat text-kin-navy">
                        {request.sender.firstName}
                      </h3>
                      <span className="text-sm text-kin-teal font-inter">sent you a Meet request</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-kin-navy text-sm font-inter">
                        <span className="font-semibold">Home Country:</span> {request.sender.homeCountry}
                      </p>
                      <p className="text-kin-navy text-sm font-inter">
                        <span className="font-semibold">Living in:</span>{' '}
                        {request.sender.currentProvince}, {request.sender.currentCountry}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-kin-navy text-sm font-semibold font-inter">Speaks:</span>
                        <div className="flex flex-wrap gap-1">
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
                      <div className="flex items-center gap-2">
                        <span className="text-kin-navy text-sm font-semibold font-inter">Looking For:</span>
                        <div className="flex flex-wrap gap-1">
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
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAccept(request._id)}
                        className="bg-kin-coral text-white px-6 py-2 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 shadow-kin-soft hover:shadow-kin-medium transition flex items-center"
                        aria-label="Accept connection request"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Accept
                      </button>
                      <button
                        onClick={() => handleIgnore(request._id)}
                        className="bg-kin-stone-200 text-kin-navy px-6 py-2 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 shadow-kin-soft transition flex items-center"
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

