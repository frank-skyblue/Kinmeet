import React, { useState } from 'react';
import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS } from '../../constants/reportOptions';
import type { ReportReason } from '../../constants/reportOptions';
import { blockAPI } from '../../services/api';
import { getErrorMessage } from '../../utils/error';
import SearchableSelect from './SearchableSelect';

const reasonOptions = REPORT_REASONS.map((option) => ({ value: option, label: option }));

export type ReportUserModalProps = {
  isOpen: boolean;
  userId: string;
  displayName: string;
  onClose: () => void;
  /** Called after the user chooses to block from the confirmation step. */
  onBlocked?: () => void;
};

const ReportUserModal: React.FC<ReportUserModalProps> = ({
  isOpen,
  userId,
  displayName,
  onClose,
  onBlocked,
}) => {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const detailsRequired = reason === 'Other';

  if (!isOpen) return null;

  const handleClose = () => {
    setReason('');
    setDetails('');
    setReasonError('');
    setDetailsError('');
    setFormError('');
    setIsSubmitted(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!reason) {
      setReasonError('Please choose a reason');
      return;
    }

    const trimmed = details.trim();
    if (reason === 'Other' && !trimmed) {
      setDetailsError('Please describe the issue when choosing Other');
      return;
    }

    setReasonError('');
    setDetailsError('');
    setFormError('');
    setIsSubmitting(true);
    try {
      await blockAPI.reportUser(userId, reason, trimmed || undefined);
      setIsSubmitted(true);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Unable to submit report'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    setFormError('');
    setIsBlocking(true);
    try {
      await blockAPI.blockUser(userId);
      onBlocked?.();
      handleClose();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, `Unable to block ${displayName}`));
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-kin-xl shadow-kin-strong max-w-md w-full p-6">
        {isSubmitted ? (
          <>
            <h2 className="text-xl font-bold font-montserrat text-kin-navy mb-2">
              Report received
            </h2>
            <div
              role="status"
              className="border border-green-200 bg-green-50 rounded-kin-lg px-5 py-4 text-green-800 font-inter mb-4"
            >
              <p className="font-semibold">Thanks for letting us know.</p>
              <p className="text-sm mt-1">
                Our team will review your report. {displayName} has not been notified.
              </p>
            </div>

            <p className="text-kin-navy font-inter mb-4">
              Would you also like to block {displayName}? They won’t be able to message you or
              see you in Discover.
            </p>

            {formError && (
              <p role="alert" className="text-kin-coral text-sm font-inter mb-4">
                {formError}
              </p>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isBlocking}
                className="flex-1 bg-kin-stone-200 text-kin-navy py-3 rounded-kin-sm font-semibold font-montserrat cursor-pointer hover:bg-kin-stone-300 transition disabled:opacity-50"
              >
                No, thanks
              </button>
              <button
                type="button"
                onClick={() => void handleBlock()}
                disabled={isBlocking}
                className="flex-1 bg-kin-coral-700 text-white py-3 rounded-kin-sm font-semibold font-montserrat cursor-pointer hover:bg-kin-coral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBlocking ? 'Blocking…' : `Block ${displayName}`}
              </button>
            </div>
          </>
        ) : (
          <form noValidate onSubmit={handleSubmit}>
            <h2 className="text-xl font-bold font-montserrat text-kin-navy mb-2">
              Report {displayName}
            </h2>
            <p className="text-kin-navy font-inter text-sm mb-5">
              Tell us what’s wrong. {displayName} won’t be notified, and reporting doesn’t block
              them.
            </p>

            <div className="mb-5">
              <SearchableSelect
                id="report-reason"
                label="Reason"
                options={reasonOptions}
                value={reason}
                onChange={(value) => {
                  setReason(value as ReportReason);
                  if (value) setReasonError('');
                  if (value !== 'Other') setDetailsError('');
                }}
                placeholder="Select a reason"
                required
              />
              {reasonError && (
                <p role="alert" className="text-kin-coral text-sm font-inter mt-3">
                  {reasonError}
                </p>
              )}
            </div>

            <div className="mb-5">
              <label
                htmlFor="report-details"
                className="block text-sm font-semibold font-inter text-kin-navy mb-2"
              >
                Additional details
                {detailsRequired ? (
                  <span className="text-kin-coral ml-1">*</span>
                ) : (
                  <span className="font-normal text-kin-navy/50"> (optional)</span>
                )}
              </label>
              <div className="relative">
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(e) => {
                    setDetails(e.target.value);
                    if (e.target.value.trim()) setDetailsError('');
                  }}
                  rows={4}
                  maxLength={REPORT_DETAILS_MAX_LENGTH}
                  required={detailsRequired}
                  aria-describedby="report-details-count"
                  className="w-full px-4 pt-3 pb-8 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent font-inter text-kin-navy"
                />
                <span
                  id="report-details-count"
                  className={`pointer-events-none absolute bottom-3 right-3 text-xs font-inter ${
                    details.length >= REPORT_DETAILS_MAX_LENGTH
                      ? 'text-kin-coral'
                      : 'text-kin-navy/50'
                  }`}
                >
                  {details.length} / {REPORT_DETAILS_MAX_LENGTH}
                </span>
              </div>
              {detailsError && (
                <p role="alert" className="text-kin-coral text-sm font-inter mt-3">
                  {detailsError}
                </p>
              )}
            </div>

            {formError && (
              <p role="alert" className="text-kin-coral text-sm font-inter mb-4">
                {formError}
              </p>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 bg-kin-stone-200 text-kin-navy py-3 rounded-kin-sm font-semibold font-montserrat cursor-pointer hover:bg-kin-stone-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-kin-coral-700 text-white py-3 rounded-kin-sm font-semibold font-montserrat cursor-pointer hover:bg-kin-coral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportUserModal;
