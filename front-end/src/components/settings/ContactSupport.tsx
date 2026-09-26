import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SUPPORT_ISSUE_TYPES,
  SUPPORT_MESSAGE_MAX_LENGTH,
  SUPPORT_SUBJECT_MAX_LENGTH,
} from '../../constants/supportOptions';
import { supportAPI } from '../../services/api';
import type { SupportIssueType } from '../../types';
import { getErrorMessage } from '../../utils/error';
import SearchableSelect from '../common/SearchableSelect';
import ScreenshotDropzone from '../common/ScreenshotDropzone';

const supportIssueTypeOptions = SUPPORT_ISSUE_TYPES.map((option) => ({
  value: option,
  label: option,
}));

const fieldErrorClassName = 'text-kin-coral text-sm font-inter mt-3';

const ContactSupport: React.FC = () => {
  const [issueType, setIssueType] = useState<SupportIssueType | ''>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [followUp, setFollowUp] = useState(false);
  const [issueTypeError, setIssueTypeError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [screenshotError, setScreenshotError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleIssueTypeChange = (value: string) => {
    setIssueType(value as SupportIssueType);
    if (value) {
      setIssueTypeError('');
    }
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubject(e.target.value);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      setMessageError('');
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) return;

    setFormError('');

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!issueType) {
      setIssueTypeError('Issue type is required');
    }
    if (!trimmedMessage) {
      setMessageError('Message is required');
    }
    if (!issueType || !trimmedMessage) {
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      await supportAPI.submitSupportRequest({
        issueType,
        subject: trimmedSubject || undefined,
        message: trimmedMessage,
        followUp,
        screenshots,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Unable to submit support request'));
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

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
              Contact Support
            </h1>
            <p className="text-kin-navy font-inter mb-8">
              Need help with something? Send us a message and we’ll get back to you as soon as
              possible.
            </p>

            {success ? (
              <div
                role="status"
                className="border border-green-200 bg-green-50 rounded-kin-lg px-5 py-4 text-green-800 font-inter"
              >
                <p className="font-semibold">Request submitted successfully.</p>
                <p className="text-sm mt-1">
                  Thanks for reaching out. We’ve received your request and will get back to you
                  soon.
                </p>
              </div>
            ) : (
              <form noValidate onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <SearchableSelect
                    id="support-issue-type"
                    label="Issue type"
                    options={supportIssueTypeOptions}
                    value={issueType}
                    onChange={handleIssueTypeChange}
                    placeholder="Select an issue type"
                    required
                  />
                  {issueTypeError && (
                    <p role="alert" className={fieldErrorClassName}>
                      {issueTypeError}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="support-subject"
                    className="block text-sm font-semibold font-inter text-kin-navy mb-2"
                  >
                    Subject{' '}
                    <span className="font-normal text-kin-navy/50">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="support-subject"
                      type="text"
                      value={subject}
                      onChange={handleSubjectChange}
                      className="w-full px-4 py-3 pr-16 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent font-inter text-kin-navy"
                      maxLength={SUPPORT_SUBJECT_MAX_LENGTH}
                      aria-describedby="support-subject-count"
                    />
                    <span
                      id="support-subject-count"
                      className={`pointer-events-none absolute bottom-3 right-3 text-xs font-inter ${
                        subject.length >= SUPPORT_SUBJECT_MAX_LENGTH
                          ? 'text-kin-coral'
                          : 'text-kin-navy/50'
                      }`}
                    >
                      {subject.length} / {SUPPORT_SUBJECT_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="support-message"
                    className="block text-sm font-semibold font-inter text-kin-navy mb-2"
                  >
                    Message
                    <span className="text-kin-coral ml-1">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="support-message"
                      value={message}
                      onChange={handleMessageChange}
                      className="w-full px-4 pt-3 pb-8 pr-16 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent font-inter text-kin-navy"
                      rows={6}
                      maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
                      aria-describedby="support-message-count"
                      required
                    />
                    <span
                      id="support-message-count"
                      className={`pointer-events-none absolute bottom-3 right-3 text-xs font-inter ${
                        message.length >= SUPPORT_MESSAGE_MAX_LENGTH
                          ? 'text-kin-coral'
                          : 'text-kin-navy/50'
                      }`}
                    >
                      {message.length} / {SUPPORT_MESSAGE_MAX_LENGTH}
                    </span>
                  </div>
                  {messageError && (
                    <p role="alert" className={fieldErrorClassName}>
                      {messageError}
                    </p>
                  )}
                </div>

                <ScreenshotDropzone
                  files={screenshots}
                  onChange={setScreenshots}
                  error={screenshotError}
                  onError={setScreenshotError}
                  disabled={loading}
                  inputId="support-screenshot"
                  labelId="support-screenshots-label"
                />

                <label className="flex items-center gap-3 text-sm font-inter text-kin-navy hover:cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followUp}
                    onChange={(e) => setFollowUp(e.target.checked)}
                    className="h-5 w-5 shrink-0 rounded border-kin-stone-300 text-kin-coral focus:ring-kin-coral hover:cursor-pointer"
                  />
                  <span>Allow KinMeet to contact me about this support request.</span>
                </label>

                {formError && (
                  <p role="alert" className="text-kin-coral text-sm font-inter">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-3 bg-kin-teal text-white rounded-kin-sm font-semibold font-inter hover:bg-kin-teal-700 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Support Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSupport;
