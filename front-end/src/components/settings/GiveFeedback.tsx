import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FEEDBACK_CATEGORIES, FEEDBACK_MESSAGE_MAX_LENGTH } from '../../constants/feedbackOptions';
import { ALLOWED_IMAGE_TYPES, validatePhotoFile } from '../../constants/validation';
import { feedbackAPI } from '../../services/api';
import type { FeedbackCategory } from '../../types';
import { getErrorMessage } from '../../utils/error';
import SearchableSelect from '../common/SearchableSelect';

const MAX_SCREENSHOTS = 3;
const feedbackCategoryOptions = FEEDBACK_CATEGORIES.map((option) => ({
  value: option,
  label: option,
}));

const fieldErrorClassName = 'text-kin-coral text-sm font-inter mt-3';

const dataTransferHasFiles = (dataTransfer: DataTransfer) =>
  Array.from(dataTransfer.types).includes('Files');

const GiveFeedback: React.FC = () => {
  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [message, setMessage] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [followUp, setFollowUp] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [screenshotError, setScreenshotError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const screenshotsRef = useRef(screenshots);
  screenshotsRef.current = screenshots;

  const isAtScreenshotLimit = screenshots.length >= MAX_SCREENSHOTS;
  const isDropzoneDisabled = isAtScreenshotLimit || loading;

  const addScreenshots = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    const currentScreenshots = screenshotsRef.current;
    if (currentScreenshots.length + selectedFiles.length > MAX_SCREENSHOTS) {
      setScreenshotError('Up to 3 screenshots are allowed');
      return;
    }

    for (const file of selectedFiles) {
      const validationError = validatePhotoFile(file);
      if (validationError) {
        setScreenshotError(validationError);
        return;
      }
    }

    setScreenshotError('');
    setScreenshots((prev) => [...prev, ...selectedFiles]);
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
    setScreenshotError('');
    resetDragState();
    setScreenshots((prev) => prev.filter((_file, index) => index !== indexToRemove));
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value as FeedbackCategory);
    if (value) {
      setCategoryError('');
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      setMessageError('');
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');

    const trimmedMessage = message.trim();

    if (!category) {
      setCategoryError('Feedback category is required');
    }
    if (!trimmedMessage) {
      setMessageError('Message is required');
    }
    if (!category || !trimmedMessage) {
      return;
    }

    setLoading(true);
    try {
      await feedbackAPI.submitFeedback({
        category,
        message: trimmedMessage,
        followUp,
        screenshots,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Unable to submit feedback'));
    } finally {
      setLoading(false);
    }
  };

  const dropzoneLabel = isAtScreenshotLimit
    ? 'Maximum of 3 screenshots'
    : isDragActive
      ? 'Drop screenshots here'
      : screenshots.length === 0
        ? 'Add screenshots or drag and drop'
        : 'Add more or drag and drop';

  return (
    <div className="bg-kin-beige py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-kin-xl shadow-kin-strong overflow-hidden">
          <div className="px-8 py-8">
            <Link
              to="/settings/support"
              className="inline-flex items-center gap-1 text-sm font-inter text-kin-teal hover:text-kin-teal-700 transition mb-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
              aria-label="Back to Support"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Support
            </Link>

            <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">
              Give Feedback
            </h1>
            <p className="text-kin-navy font-inter mb-8">
              Share feedback about your KinMeet experience.
            </p>

            {success ? (
              <div
                role="status"
                className="border border-green-200 bg-green-50 rounded-kin-lg px-5 py-4 text-green-800 font-inter"
              >
                <p className="font-semibold">Feedback submitted successfully.</p>
                <p className="text-sm mt-1">Thanks for helping us improve KinMeet.</p>
              </div>
            ) : (
              <form noValidate onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <SearchableSelect
                    id="feedback-category"
                    label="Feedback category"
                    options={feedbackCategoryOptions}
                    value={category}
                    onChange={handleCategoryChange}
                    placeholder="Select a category"
                    required
                  />
                  {categoryError && (
                    <p role="alert" className={fieldErrorClassName}>
                      {categoryError}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="feedback-message"
                    className="block text-sm font-semibold font-inter text-kin-navy mb-2"
                  >
                    Message
                    <span className="text-kin-coral ml-1">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="feedback-message"
                      value={message}
                      onChange={handleMessageChange}
                      className="w-full px-4 pt-3 pb-8 pr-16 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent font-inter text-kin-navy"
                      rows={6}
                      maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
                      aria-describedby="feedback-message-count"
                      required
                    />
                    <span
                      id="feedback-message-count"
                      className={`pointer-events-none absolute bottom-3 right-3 text-xs font-inter ${
                        message.length >= FEEDBACK_MESSAGE_MAX_LENGTH
                          ? 'text-kin-coral'
                          : 'text-kin-navy/50'
                      }`}
                    >
                      {message.length} / {FEEDBACK_MESSAGE_MAX_LENGTH}
                    </span>
                  </div>
                  {messageError && (
                    <p role="alert" className={fieldErrorClassName}>
                      {messageError}
                    </p>
                  )}
                </div>

                <div>
                  <p
                    id="feedback-screenshots-label"
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
                          : 'border-kin-stone-300 bg-kin-stone-100 hover:border-kin-teal hover:bg-kin-beige'
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
                    id="feedback-screenshot"
                    type="file"
                    multiple
                    accept={ALLOWED_IMAGE_TYPES.join(',')}
                    onChange={handleScreenshotChange}
                    className="hidden"
                    aria-hidden="true"
                    disabled={isDropzoneDisabled}
                  />

                  {screenshots.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-inter text-kin-navy/60 mb-2">
                        {screenshots.length}/{MAX_SCREENSHOTS} selected
                      </p>
                      <ul className="space-y-2" aria-label="Selected screenshots">
                        {screenshots.map((file, index) => (
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
                              disabled={loading}
                              className="shrink-0 text-sm font-semibold font-inter text-kin-coral-700 hover:text-kin-coral transition disabled:opacity-50"
                              aria-label={`Remove ${file.name}`}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {screenshotError && (
                    <p role="alert" className={fieldErrorClassName}>
                      {screenshotError}
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-3 text-sm font-inter text-kin-navy">
                  <input
                    type="checkbox"
                    checked={followUp}
                    onChange={(e) => setFollowUp(e.target.checked)}
                    className="h-5 w-5 shrink-0 rounded border-kin-stone-300 text-kin-coral focus:ring-kin-coral"
                  />
                  <span>Allow KinMeet to follow up about this feedback</span>
                </label>

                {formError && (
                  <p role="alert" className="text-kin-coral text-sm font-inter">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-3 bg-kin-teal text-white rounded-kin-sm font-semibold font-inter hover:bg-kin-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiveFeedback;
