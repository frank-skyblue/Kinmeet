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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Connection Requests</h1>
          <p className="text-gray-600">
            {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👋</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Pending Requests</h2>
            <p className="text-gray-600">
              When someone sends you a Meet request, it will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {request.sender.photo ? (
                      <img
                        src={request.sender.photo}
                        alt={request.sender.firstName}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                        {request.sender.firstName.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">
                        {request.sender.firstName}
                      </h3>
                      <span className="text-sm text-gray-500">sent you a Meet request</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-gray-600 text-sm">
                        <span className="font-semibold">Home Country:</span> {request.sender.homeCountry}
                      </p>
                      <p className="text-gray-600 text-sm">
                        <span className="font-semibold">Living in:</span>{' '}
                        {request.sender.currentProvince}, {request.sender.currentCountry}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-sm font-semibold">Speaks:</span>
                        <div className="flex flex-wrap gap-1">
                          {request.sender.languages.map((lang, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-sm font-semibold">Looking For:</span>
                        <div className="flex flex-wrap gap-1">
                          {request.sender.lookingFor.map((item, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
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
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Accept
                      </button>
                      <button
                        onClick={() => handleIgnore(request._id)}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center"
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

