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
      <div className="min-h-screen flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4"></div>
          <p className="text-kin-navy font-inter">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <p className="text-kin-coral-700 font-inter">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kin-beige py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-kin-xl shadow-kin-strong overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-kin-coral to-kin-teal h-32"></div>
          
          {/* Profile Content */}
          <div className="px-8 pb-8">
            {/* Avatar */}
            <div className="-mt-16 mb-6">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-kin-medium"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-kin-coral to-kin-teal flex items-center justify-center text-white text-5xl font-bold font-montserrat shadow-kin-medium">
                  {profile.firstName.charAt(0)}
                </div>
              )}
            </div>

            {/* Name & Email */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-kin-teal font-inter">{profile.email}</p>
            </div>

            {/* Profile Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">Home Country</h3>
                <p className="text-lg text-kin-navy font-montserrat">{profile.homeCountry}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">Current Location</h3>
                <p className="text-lg text-kin-navy font-montserrat">
                  {profile.currentProvince}, {profile.currentCountry}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold font-inter text-kin-navy mb-3">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((lang, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-kin-teal-100 text-kin-teal-700 rounded-kin-sm font-medium font-inter"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              {profile.interests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold font-inter text-kin-navy mb-3">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-kin-teal-200 text-kin-teal-800 rounded-kin-sm font-medium font-inter"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold font-inter text-kin-navy mb-3">Looking For</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.lookingFor.map((item, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-kin-coral-100 text-kin-coral-700 rounded-kin-sm font-medium font-inter"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Edit Profile Button (placeholder for future feature) */}
            <div className="mt-8">
              <button className="w-full bg-kin-teal text-white py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-teal-600 shadow-kin-soft hover:shadow-kin-medium transition">
                Edit Profile (Coming Soon)
              </button>
            </div>
          </div>
        </div>

        {/* Community Guidelines */}
        <div className="mt-8 bg-white rounded-kin-lg shadow-kin-medium p-6">
          <h2 className="text-xl font-bold font-montserrat text-kin-navy mb-4">Community Guidelines</h2>
          <div className="space-y-3 text-kin-navy font-inter">
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

