import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { blockAPI, profileAPI } from '../../services/api';
import { useAuth } from '../../contexts/useAuth';
import { getErrorMessage } from '../../utils/error';
import type { UserProfile } from '../../types';
import ProfileView from './ProfileView';
import ProfileEditForm from './ProfileEditForm';

const Profile: React.FC = () => {
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const showManageActions =
    routeUserId === undefined || (user?.id !== undefined && routeUserId === user.id);

  useEffect(() => {
    setIsEditing(false);
  }, [routeUserId]);

  useEffect(() => {
    if (authLoading) return;
    void loadProfile();
  }, [authLoading, routeUserId, user?.id]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError('');
      const loadOwn =
        routeUserId === undefined || (user?.id !== undefined && routeUserId === user.id);
      const response = loadOwn
        ? await profileAPI.getProfile()
        : await profileAPI.getUserProfile(routeUserId!);
      if (response.success) {
        setProfile(response.user);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load profile'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!profile) return;

    const ok = window.confirm(
      `Block ${profile.firstName}? They won’t be able to message you or see you in Discover, ` +
        'and they’ll be removed from your kins. You can unblock them in Settings & Privacy.',
    );
    if (!ok) return;

    setError('');
    try {
      await blockAPI.blockUser(profile._id);
      navigate('/discover');
    } catch (err: unknown) {
      setError(getErrorMessage(err, `Failed to block ${profile.firstName}`));
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4"></div>
          <p className="text-kin-navy font-inter">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="h-full flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <p className="text-kin-coral-700 font-inter">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  if (isEditing && showManageActions) {
    return (
      <ProfileEditForm
        profile={profile}
        onSave={(updated) => {
          setProfile(updated);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <>
      {error && (
        <div className="bg-kin-beige px-4 pt-4">
          <div className="max-w-3xl mx-auto">
            <p
              role="alert"
              className="rounded-kin border border-kin-coral-200 bg-kin-coral-50 px-4 py-2 font-inter text-sm text-kin-coral-700"
            >
              {error}
            </p>
          </div>
        </div>
      )}

      <ProfileView
        profile={profile}
        onEdit={() => setIsEditing(true)}
        showManageActions={showManageActions}
        onBlock={showManageActions ? undefined : () => void handleBlock()}
      />
    </>
  );
};

export default Profile;
