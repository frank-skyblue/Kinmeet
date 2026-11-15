import React from 'react';
import { getPhotoUrl } from '../../services/api';

type ProfilePhotoEditorProps = {
  /** Shown in the circle when there is no photo, e.g. "LM". */
  initials: string;
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
  initials,
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
  const canRemove = Boolean(pendingPhotoFile || (existingPhoto && !pendingPhotoRemoval));

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <div className="relative shrink-0">
        {hasVisiblePhoto ? (
          <img
            src={
              photoPreview ||
              (!pendingPhotoRemoval && existingPhoto ? getPhotoUrl(existingPhoto) : '')
            }
            alt="Profile"
            className="h-20 w-20 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-kin-coral to-kin-teal font-montserrat text-2xl font-bold text-white"
            aria-hidden
          >
            {initials}
          </div>
        )}
        {isSaving && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-white" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
            className="cursor-pointer rounded-kin-sm border border-border px-4 py-2 font-inter text-sm font-medium text-foreground transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hasVisiblePhoto ? 'Change Photo' : 'Upload Photo'}
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemovePhoto}
              disabled={isSaving}
              className="cursor-pointer font-inter text-sm font-medium text-foreground underline decoration-primary underline-offset-4 transition hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
        <p className="mt-2 font-inter text-xs text-muted">
          JPEG, PNG, WebP or GIF · Up to 5 MB
          <br />
          Photo changes apply when you save.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onPhotoSelect}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};

export default ProfilePhotoEditor;
