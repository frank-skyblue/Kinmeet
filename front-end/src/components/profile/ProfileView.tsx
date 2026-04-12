import React from 'react';
import { getPhotoUrl } from '../../services/api';
import type { UserProfile } from '../../types';

const genderLabel = (value: string | undefined) => {
  if (value === 'female') return 'Female';
  if (value === 'male') return 'Male';
  return null;
};

const birthdayDisplay = (value: string | undefined) => {
  if (!value) return null;
  const d = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  try {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  } catch {
    /* ignore */
  }
  return null;
};

interface ProfileViewProps {
  profile: UserProfile;
  onEdit: () => void;
  onOpenDeleteConfirm: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, onEdit, onOpenDeleteConfirm }) => {
  return (
    <div className="bg-kin-beige py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-kin-xl shadow-kin-strong overflow-hidden">
          <div className="bg-gradient-to-br from-kin-coral to-kin-teal h-32"></div>

          <div className="px-8 pb-8">
            <div className="-mt-16 mb-6">
              {profile.photo ? (
                <img
                  src={getPhotoUrl(profile.photo)}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-kin-medium"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-kin-coral to-kin-teal flex items-center justify-center text-white text-5xl font-bold font-montserrat shadow-kin-medium">
                  {profile.firstName.charAt(0)}
                </div>
              )}
            </div>

            <div className="mb-6">
              <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-kin-teal font-inter">{profile.email}</p>
            </div>

            <div className="space-y-6 mb-6">
              <div>
                <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">Gender</h3>
                <p className="text-lg text-kin-navy font-montserrat">
                  {genderLabel(profile.gender) ?? '—'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">Birthday</h3>
                <p className="text-lg text-kin-navy font-montserrat">
                  {birthdayDisplay(profile.dateOfBirth) ?? '—'}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {profile.about && (
                <div>
                  <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">About</h3>
                  <p className="text-kin-navy font-inter leading-relaxed">{profile.about}</p>
                </div>
              )}

              {(profile.jobTitle || profile.company) && (
                <div>
                  <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">Work</h3>
                  <p className="text-lg text-kin-navy font-montserrat">
                    {profile.jobTitle}
                    {profile.jobTitle && profile.company && ' at '}
                    {profile.company}
                  </p>
                </div>
              )}

              {(profile.institution || profile.graduationYear) && (
                <div>
                  <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">Education</h3>
                  <p className="text-lg text-kin-navy font-montserrat">
                    {profile.institution}
                    {profile.institution && profile.graduationYear && ' · '}
                    {profile.graduationYear && `Class of ${profile.graduationYear}`}
                  </p>
                </div>
              )}

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

            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={onEdit}
                className="w-full bg-kin-teal text-white py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-teal-600 shadow-kin-soft hover:shadow-kin-medium transition"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={onOpenDeleteConfirm}
                className="w-full bg-kin-stone-200 text-kin-coral-700 py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-kin-lg shadow-kin-medium p-6">
          <h2 className="text-xl font-bold font-montserrat text-kin-navy mb-4">Community Guidelines</h2>
          <div className="space-y-3 text-kin-navy font-inter">
            <p>• Treat all members with respect and kindness</p>
            <p>• Celebrate cultural diversity and inclusivity</p>
            <p>• Be mindful of cultural sensitivities</p>
            <p>• Report inappropriate behavior or content</p>
            <p>• Last names are only visible to accepted kins</p>
            <p>• City-level details are not shared for privacy</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
