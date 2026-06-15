import React, { useEffect, useState } from 'react';
import { matchingAPI, getPhotoUrl } from '../../services/api';
import { getErrorMessage } from '../../utils/error';

interface Match {
  _id: string;
  firstName: string;
  about?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  educationLevel?: string;
  graduationYear?: number;
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to send Meet request'));
    }
  };

  const handlePass = async () => {
    try {
      await matchingAPI.passUser();
      moveToNext();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to pass'));
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
      <div className="h-full flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4"></div>
          <p className="text-kin-navy font-inter">Loading matches...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0 || currentIndex >= matches.length) {
    return (
      <div className="h-full flex items-center justify-center bg-kin-beige px-4">
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
  const remaining = matches.length - currentIndex;

  return (
    <div className="h-full flex flex-col bg-kin-beige overflow-hidden">
      <div className="shrink-0 px-4 pt-3 pb-2 md:pt-5 md:pb-3 text-center">
        <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-kin-navy">
          Discover
        </h1>
        <p className="text-xs md:text-sm text-kin-teal font-inter">
          {remaining} match{remaining !== 1 ? 'es' : ''} available
        </p>
      </div>

      {error && (
        <div className="shrink-0 mx-auto w-full max-w-4xl px-4 mb-2">
          <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-2 rounded-kin font-inter text-sm">
            {error}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 px-3 pb-3 md:px-6 md:pb-4 flex justify-center">
        <div className="mx-auto w-full max-w-lg bg-white rounded-kin-xl shadow-kin-strong overflow-hidden flex flex-col">
          {/* Profile Photo/Avatar */}
          <div className="relative flex-1 min-h-32 bg-gradient-to-br from-kin-coral to-kin-teal flex items-center justify-center">
            {currentMatch.photo ? (
              <img
                src={getPhotoUrl(currentMatch.photo)}
                alt={currentMatch.firstName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-5xl md:text-7xl text-white font-bold font-montserrat">
                {currentMatch.firstName.charAt(0)}
              </div>
            )}
          </div>

          {/* Info + Buttons */}
          <div className="flex flex-col">
            <div className="overflow-hidden p-4 md:p-5 flex flex-col gap-2">
              <div>
                <h2 className="text-xl md:text-2xl font-bold font-montserrat text-kin-navy leading-tight">
                  {currentMatch.firstName}
                </h2>

                {(currentMatch.jobTitle || currentMatch.company) && (
                  <p className="text-kin-teal font-inter text-xs md:text-sm line-clamp-1">
                    {currentMatch.jobTitle}
                    {currentMatch.jobTitle && currentMatch.company && ' at '}
                    {currentMatch.company}
                  </p>
                )}

                {currentMatch.industry && !currentMatch.jobTitle && !currentMatch.company && (
                  <p className="text-kin-teal font-inter text-xs md:text-sm line-clamp-1">
                    {currentMatch.industry}
                  </p>
                )}
              </div>

              {currentMatch.about && (
                <p className="text-kin-navy font-inter text-sm leading-snug line-clamp-3 md:line-clamp-5">
                  {currentMatch.about}
                </p>
              )}

              <div className="space-y-1 text-xs md:text-sm font-inter">
                {(currentMatch.educationLevel || currentMatch.graduationYear) && (
                  <div className="flex items-center text-kin-teal">
                    <svg className="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zM12 14v7" />
                    </svg>
                    <span className="truncate">
                      {currentMatch.educationLevel}
                      {currentMatch.educationLevel && currentMatch.graduationYear && ' · '}
                      {currentMatch.graduationYear && `Class of ${currentMatch.graduationYear}`}
                    </span>
                  </div>
                )}

                <div className="flex items-center text-kin-teal">
                  <svg className="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">
                    <strong className="text-kin-navy">{currentMatch.homeCountry}</strong>
                    <span className="mx-1.5 text-kin-stone-400">·</span>
                    <span>Lives in </span>
                    <strong className="text-kin-navy">{currentMatch.currentProvince}, {currentMatch.currentCountry}</strong>
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div>
                  <h3 className="text-[10px] md:text-xs font-semibold font-inter text-kin-navy mb-1 uppercase tracking-wide">
                    Languages
                  </h3>
                  <div className="flex flex-wrap gap-1.5 max-h-[3.75rem] overflow-hidden">
                    {currentMatch.languages.map((lang, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-0.5 bg-kin-teal-100 text-kin-teal-700 rounded-full text-xs font-medium font-inter"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                {currentMatch.interests.length > 0 && (
                  <div>
                    <h3 className="text-[10px] md:text-xs font-semibold font-inter text-kin-navy mb-1 uppercase tracking-wide">
                      Interests
                    </h3>
                    <div className="flex flex-wrap gap-1.5 max-h-[3.75rem] overflow-hidden">
                      {currentMatch.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-0.5 bg-kin-teal-200 text-kin-teal-800 rounded-full text-xs font-medium font-inter"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-[10px] md:text-xs font-semibold font-inter text-kin-navy mb-1 uppercase tracking-wide">
                    Looking For
                  </h3>
                  <div className="flex flex-wrap gap-1.5 max-h-[3.75rem] overflow-hidden">
                    {currentMatch.lookingFor.map((item, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-0.5 bg-kin-coral-100 text-kin-coral-700 rounded-full text-xs font-medium font-inter"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex gap-3 p-3 md:p-4 border-t border-kin-stone-200 bg-white">
              <button
                onClick={handlePass}
                className="flex-1 bg-kin-stone-200 text-kin-navy py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 shadow-kin-soft hover:shadow-kin-medium transition flex items-center justify-center"
                aria-label="Pass on this match"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Pass
              </button>
              <button
                onClick={handleMeet}
                className="flex-1 bg-kin-coral text-white py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 shadow-kin-soft hover:shadow-kin-medium transition flex items-center justify-center"
                aria-label="Send meet request"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

