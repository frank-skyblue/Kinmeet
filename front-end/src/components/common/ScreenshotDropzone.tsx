import React, { useRef, useState } from 'react';
import { ALLOWED_IMAGE_TYPES, validatePhotoFile } from '../../constants/validation';

const MAX_SCREENSHOTS = 3;
const fieldErrorClassName = 'text-kin-coral text-sm font-inter mt-3';

const dataTransferHasFiles = (dataTransfer: DataTransfer) =>
  Array.from(dataTransfer.types).includes('Files');

type ScreenshotDropzoneProps = {
  files: File[];
  onChange: (files: File[]) => void;
  error: string;
  onError: (message: string) => void;
  disabled?: boolean;
  inputId: string;
  labelId: string;
};

const ScreenshotDropzone: React.FC<ScreenshotDropzoneProps> = ({
  files,
  onChange,
  error,
  onError,
  disabled = false,
  inputId,
  labelId,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const filesRef = useRef(files);
  filesRef.current = files;

  const isAtScreenshotLimit = files.length >= MAX_SCREENSHOTS;
  const isDropzoneDisabled = isAtScreenshotLimit || disabled;

  const addScreenshots = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    const currentFiles = filesRef.current;
    if (currentFiles.length + selectedFiles.length > MAX_SCREENSHOTS) {
      onError('Up to 3 screenshots are allowed');
      return;
    }

    for (const file of selectedFiles) {
      const validationError = validatePhotoFile(file);
      if (validationError) {
        onError(validationError);
        return;
      }
    }

    onError('');
    onChange([...currentFiles, ...selectedFiles]);
  };

  const resetDragState = () => {
    dragDepthRef.current = 0;
    setIsDragActive(false);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    e.target.value = '';
    addScreenshots(selectedFiles);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDropzoneDisabled || !dataTransferHasFiles(e.dataTransfer)) return;

    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDropzoneDisabled || !dataTransferHasFiles(e.dataTransfer)) return;
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDropzoneDisabled) return;

    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      resetDragState();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    resetDragState();
    if (isDropzoneDisabled) return;

    addScreenshots(Array.from(e.dataTransfer.files));
  };

  const handleRemoveScreenshot = (indexToRemove: number) => {
    onError('');
    resetDragState();
    onChange(files.filter((_file, index) => index !== indexToRemove));
  };

  const dropzoneLabel = isAtScreenshotLimit
    ? 'Maximum of 3 screenshots'
    : isDragActive
      ? 'Drop screenshots here'
      : files.length === 0
        ? 'Add screenshots or drag and drop'
        : 'Add more or drag and drop';

  return (
    <div>
      <p
        id={labelId}
        className="block text-sm font-semibold font-inter text-kin-navy mb-2"
      >
        Screenshots{' '}
        <span className="font-normal text-kin-navy/50">(optional)</span>
      </p>

      <button
        type="button"
        onClick={() => {
          if (!isDropzoneDisabled) {
            screenshotInputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={isDropzoneDisabled}
        aria-disabled={isDropzoneDisabled}
        aria-label={dropzoneLabel}
        className={`w-full rounded-kin-sm border border-dashed px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral ${
          isDropzoneDisabled
            ? 'cursor-not-allowed border-kin-stone-300 bg-kin-stone-100 opacity-50'
            : isDragActive
              ? 'border-kin-teal bg-kin-beige'
              : 'border-kin-stone-300 bg-kin-stone-100 hover:border-kin-teal hover:bg-kin-beige cursor-pointer'
        }`}
      >
        <span
          className={`inline-flex items-center gap-2 text-sm font-semibold font-inter ${
            isDropzoneDisabled ? 'text-kin-navy/50' : 'text-kin-teal'
          }`}
        >
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          {dropzoneLabel}
        </span>
        <span className="mt-1 block text-xs font-inter text-kin-navy/60">
          JPG, PNG, WebP or GIF · Up to 3 files · 5 MB each
        </span>
      </button>

      <input
        ref={screenshotInputRef}
        id={inputId}
        type="file"
        multiple
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        onChange={handleScreenshotChange}
        className="hidden"
        aria-hidden="true"
        disabled={isDropzoneDisabled}
      />

      {files.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-inter text-kin-navy/60 mb-2">
            {files.length}/{MAX_SCREENSHOTS} selected
          </p>
          <ul className="space-y-2" aria-label="Selected screenshots">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.lastModified}-${index}`}
                className="flex items-center justify-between gap-3 rounded-kin-sm border border-kin-stone-200 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm font-inter text-kin-navy">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveScreenshot(index)}
                  disabled={disabled}
                  className="shrink-0 text-sm font-semibold font-inter text-kin-coral-700 hover:text-kin-coral cursor-pointer transition disabled:opacity-50"
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className={fieldErrorClassName}>
          {error}
        </p>
      )}
    </div>
  );
};

export default ScreenshotDropzone;
