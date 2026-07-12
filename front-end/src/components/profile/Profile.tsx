import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { profileAPI } from '../../services/api';
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
      <ProfileView
        profile={profile}
        onEdit={() => setIsEditing(true)}
        showManageActions={showManageActions}
      />
    </>
  );
};

export default Profile;
