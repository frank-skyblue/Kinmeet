import React, { useEffect, useState } from 'react';
import { matchingAPI } from '../../services/api';

interface Match {
  _id: string;
  firstName: string;
  homeCountry: string;
  currentProvince: string;
  currentCountry: string;
  languages: string[];
  interests: string[];
  lookingFor: string[];
  photo?: string;
}

const Discover: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      const response = await matchingAPI.getMatches();
      if (response.success) {
        setMatches(response.matches);
      }
    } catch (err: any) {
      setError('Failed to load matches');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMeet = async () => {
    const currentMatch = matches[currentIndex];
    try {
      await matchingAPI.sendMeetRequest(currentMatch._id);
      moveToNext();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send Meet request');
    }
  };

  const handlePass = async () => {
    try {
      await matchingAPI.passUser();
      moveToNext();
    } catch (err: any) {
      console.error('Pass error:', err);
      moveToNext();
    }
  };

  const moveToNext = () => {
    if (currentIndex < matches.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // No more matches
      setCurrentIndex(matches.length);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4"></div>
          <p className="text-kin-navy font-inter">Loading matches...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0 || currentIndex >= matches.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kin-beige px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🌍</div>
          <h2 className="text-2xl font-bold font-montserrat text-kin-navy mb-2">No More Matches</h2>
          <p className="text-kin-teal font-inter mb-6">
            Check back later for more people from your homeland!
          </p>
          <button
            onClick={loadMatches}
            className="bg-kin-coral text-white px-6 py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 shadow-kin-soft hover:shadow-kin-medium transition"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const currentMatch = matches[currentIndex];

  return (
    <div className="min-h-screen bg-kin-beige py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">Discover</h1>
          <p className="text-kin-teal font-inter">
            {matches.length - currentIndex} match{matches.length - currentIndex !== 1 ? 'es' : ''} available
          </p>
        </div>

        {error && (
          <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-kin-xl shadow-kin-strong overflow-hidden">
          {/* Profile Photo/Avatar */}
          <div className="bg-gradient-to-br from-kin-coral to-kin-teal h-64 flex items-center justify-center">
            {currentMatch.photo ? (
              <img 
                src={currentMatch.photo} 
                alt={currentMatch.firstName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-8xl text-white font-bold font-montserrat">
                {currentMatch.firstName.charAt(0)}
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="p-6">
            <h2 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">
              {currentMatch.firstName}
            </h2>
            
            <div className="flex items-center text-kin-teal mb-4 font-inter">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>
                Home Country: <strong className="text-kin-navy">{currentMatch.homeCountry}</strong>
              </span>
            </div>

            <div className="flex items-center text-kin-teal mb-4 font-inter">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>
                Living in: <strong className="text-kin-navy">{currentMatch.currentProvince}, {currentMatch.currentCountry}</strong>
              </span>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {currentMatch.languages.map((lang, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-kin-teal-100 text-kin-teal-700 rounded-full text-sm font-medium font-inter"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {currentMatch.interests.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {currentMatch.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-kin-teal-200 text-kin-teal-800 rounded-full text-sm font-medium font-inter"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">Looking For</h3>
              <div className="flex flex-wrap gap-2">
                {currentMatch.lookingFor.map((item, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-kin-coral-100 text-kin-coral-700 rounded-full text-sm font-medium font-inter"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handlePass}
                className="flex-1 bg-kin-stone-200 text-kin-navy py-4 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 shadow-kin-soft hover:shadow-kin-medium transition flex items-center justify-center"
                aria-label="Pass on this match"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Pass
              </button>
              <button
                onClick={handleMeet}
                className="flex-1 bg-kin-coral text-white py-4 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 shadow-kin-soft hover:shadow-kin-medium transition flex items-center justify-center"
                aria-label="Send meet request"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                Meet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Discover;

