import React, { useEffect, useState } from 'react';
import { profileAPI } from '../../services/api';

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  homeCountry: string;
  currentProvince: string;
  currentCountry: string;
  languages: string[];
  interests: string[];
  lookingFor: string[];
  photo?: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await profileAPI.getProfile();
      if (response.success) {
        setProfile(response.user);
      }
    } catch (err: any) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-32"></div>
          
          {/* Profile Content */}
          <div className="px-8 pb-8">
            {/* Avatar */}
            <div className="-mt-16 mb-6">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold shadow-lg">
                  {profile.firstName.charAt(0)}
                </div>
              )}
            </div>

            {/* Name & Email */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-gray-600">{profile.email}</p>
            </div>

            {/* Profile Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Home Country</h3>
                <p className="text-lg text-gray-800">{profile.homeCountry}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Current Location</h3>
                <p className="text-lg text-gray-800">
                  {profile.currentProvince}, {profile.currentCountry}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((lang, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              {profile.interests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Looking For</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.lookingFor.map((item, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Edit Profile Button (placeholder for future feature) */}
            <div className="mt-8">
              <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
                Edit Profile (Coming Soon)
              </button>
            </div>
          </div>
        </div>

        {/* Community Guidelines */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Community Guidelines</h2>
          <div className="space-y-3 text-gray-600">
            <p>• Treat all members with respect and kindness</p>
            <p>• Celebrate cultural diversity and inclusivity</p>
            <p>• Be mindful of cultural sensitivities</p>
            <p>• Report inappropriate behavior or content</p>
            <p>• Last names are only visible to accepted connections</p>
            <p>• City-level details are not shared for privacy</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

