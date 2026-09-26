import React from 'react';
import { getPhotoUrl } from '../../services/api';

type ProfilePhotoEditorProps = {
  firstName: string;
  existingPhoto?: string;
  photoPreview: string | null;
  pendingPhotoFile: File | null;
  pendingPhotoRemoval: boolean;
  isSaving: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
};

const ProfilePhotoEditor: React.FC<ProfilePhotoEditorProps> = ({
  firstName,
  existingPhoto,
  photoPreview,
  pendingPhotoFile,
  pendingPhotoRemoval,
  isSaving,
  fileInputRef,
  onPhotoSelect,
  onRemovePhoto,
}) => {
  const hasVisiblePhoto = Boolean(photoPreview || (!pendingPhotoRemoval && existingPhoto));

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        {hasVisiblePhoto ? (
          <img
            src={
              photoPreview ||
              (!pendingPhotoRemoval && existingPhoto ? getPhotoUrl(existingPhoto) : '')
            }
            alt="Profile"
            className="w-28 h-28 rounded-full object-cover border-4 border-kin-stone-200"
          />
        ) : (
          <div className="w-28 h-28 rounded-full border-4 border-kin-stone-200 bg-gradient-to-br from-kin-coral to-kin-teal flex items-center justify-center text-white text-4xl font-bold font-montserrat">
            {firstName.charAt(0)}
          </div>
        )}
        {isSaving && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-semibold font-inter text-kin-teal border border-kin-teal rounded-kin-sm hover:bg-kin-teal hover:text-white cursor-pointer transition disabled:opacity-50"
          aria-label="Upload profile photo"
        >
          {hasVisiblePhoto ? 'Change Photo' : 'Upload Photo'}
        </button>
        {(pendingPhotoFile || (existingPhoto && !pendingPhotoRemoval)) && (
          <button
            type="button"
            onClick={onRemovePhoto}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold font-inter text-kin-coral-700 border border-kin-coral-200 rounded-kin-sm hover:bg-kin-coral-50 cursor-pointer transition disabled:opacity-50"
            aria-label="Remove profile photo"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onPhotoSelect}
        className="hidden"
        aria-hidden="true"
      />
      <p className="text-xs text-kin-teal font-inter text-center">
        JPEG, PNG, WebP, or GIF. Max 5 MB. Photo updates apply when you save.
      </p>
    </div>
  );
};

export default ProfilePhotoEditor;
