import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectionsAPI } from '../../services/api';

interface Connection {
  _id: string;
  firstName: string;
  lastName: string;
  homeCountry: string;
  currentProvince: string;
  currentCountry: string;
  languages: string[];
  interests: string[];
  lookingFor: string[];
  photo?: string;
}

const ConnectionsList: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const response = await connectionsAPI.getConnections();
      if (response.success) {
        setConnections(response.connections);
      }
    } catch (err: any) {
      setError('Failed to load connections');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChat = (connectionId: string) => {
    navigate(`/chat/${connectionId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4"></div>
          <p className="text-kin-navy font-inter">Loading connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kin-beige py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">My Connections</h1>
          <p className="text-kin-teal font-inter">
            {connections.length} connection{connections.length !== 1 ? 's' : ''}
          </p>
        </div>

        {error && (
          <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter mb-6">
            {error}
          </div>
        )}

        {connections.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🤝</div>
            <h2 className="text-2xl font-bold font-montserrat text-kin-navy mb-2">No Connections Yet</h2>
            <p className="text-kin-teal font-inter mb-6">
              Start discovering people from your homeland and send Meet requests!
            </p>
            <button
              onClick={() => navigate('/discover')}
              className="bg-kin-coral text-white px-6 py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 shadow-kin-soft hover:shadow-kin-medium transition"
            >
              Discover People
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {connections.map((connection) => (
              <div
                key={connection._id}
                className="bg-white rounded-kin-lg shadow-kin-medium p-6 hover:shadow-kin-strong transition"
              >
                <div className="flex items-start gap-4 mb-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {connection.photo ? (
                      <img
                        src={connection.photo}
                        alt={`${connection.firstName} ${connection.lastName}`}
                        className="w-16 h-16 rounded-full object-cover shadow-kin-soft"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-kin-coral to-kin-teal flex items-center justify-center text-white text-2xl font-bold font-montserrat shadow-kin-soft">
                        {connection.firstName.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold font-montserrat text-kin-navy mb-1">
                      {connection.firstName} {connection.lastName}
                    </h3>
                    <p className="text-sm text-kin-teal font-inter mb-2">
                      Living in {connection.currentProvince}, {connection.currentCountry}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs font-semibold font-inter text-kin-navy mb-1">Languages</p>
                    <div className="flex flex-wrap gap-1">
                      {connection.languages.map((lang, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-kin-teal-100 text-kin-teal-700 rounded-full text-xs font-inter"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>

                  {connection.interests.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold font-inter text-kin-navy mb-1">Interests</p>
                      <div className="flex flex-wrap gap-1">
                        {connection.interests.slice(0, 3).map((interest, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-kin-teal-200 text-kin-teal-800 rounded-full text-xs font-inter"
                          >
                            {interest}
                          </span>
                        ))}
                        {connection.interests.length > 3 && (
                          <span className="px-2 py-1 bg-kin-stone-200 text-kin-navy rounded-full text-xs font-inter">
                            +{connection.interests.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold font-inter text-kin-navy mb-1">Looking For</p>
                    <div className="flex flex-wrap gap-1">
                      {connection.lookingFor.map((item, index) => (
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

                <button
                  onClick={() => handleOpenChat(connection._id)}
                  className="w-full bg-kin-coral text-white py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 shadow-kin-soft hover:shadow-kin-medium transition flex items-center justify-center"
                  aria-label={`Send message to ${connection.firstName}`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Send Message
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionsList;

