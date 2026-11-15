import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS, type ReportReason } from '../../constants/reportOptions';
import { blockAPI } from '../../services/api';
import { getErrorMessage } from '../../utils/error';

type ReportUserModalProps = {
  isOpen: boolean;
  userId: string;
  displayName: string;
  onClose: () => void;
  /** Called after the user chooses to block from the confirmation step. */
  onBlocked?: () => void;
};

/** Report a user, then offer to block them (port of the web ReportUserModal). */
export const ReportUserModal = ({
  isOpen,
  userId,
  displayName,
  onClose,
  onBlocked,
}: ReportUserModalProps) => {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const detailsRequired = reason === 'Other';
  const isBusy = isSubmitting || isBlocking;

  const resetAndClose = () => {
    setReason('');
    setDetails('');
    setReasonError('');
    setDetailsError('');
    setFormError('');
    setIsSubmitted(false);
    onClose();
  };

  /** Cancel / swipe down: ignored while a request is in flight. */
  const handleClose = () => {
    if (isBusy) return;
    resetAndClose();
  };

  const handleSubmit = async () => {
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
      // Not handleClose(): this render's isBusy is still true, so it would refuse to close.
      resetAndClose();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, `Unable to block ${displayName}`));
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-6 pt-6"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {isSubmitted ? (
            <>
              <Text accessibilityRole="header" className="mb-3 text-xl font-bold text-kin-navy">
                Report received
              </Text>
              <View
                accessibilityRole="alert"
                className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-5 py-4"
              >
                <Text className="font-semibold text-green-800">Thanks for letting us know.</Text>
                <Text className="mt-1 text-sm text-green-800">
                  Our team will review your report. {displayName} has not been notified.
                </Text>
              </View>
              <Text className="mb-4 text-kin-navy">
                Would you also like to block {displayName}? They won’t be able to message you or see
                you in Discover.
              </Text>
              {formError ? (
                <Text accessibilityRole="alert" className="mb-4 text-sm text-kin-coral-700">
                  {formError}
                </Text>
              ) : null}
              <View className="flex-row gap-3">
                <ModalButton label="No, thanks" onPress={handleClose} disabled={isBlocking} />
                <ModalButton
                  label={`Block ${displayName}`}
                  loadingLabel="Blocking…"
                  onPress={() => void handleBlock()}
                  isLoading={isBlocking}
                  destructive
                />
              </View>
            </>
          ) : (
            <>
              <Text accessibilityRole="header" className="mb-2 text-xl font-bold text-kin-navy">
                Report {displayName}
              </Text>
              <Text className="mb-5 text-sm text-kin-navy">
                Tell us what’s wrong. {displayName} won’t be notified, and reporting doesn’t block them.
              </Text>

              <Text className="mb-2 text-sm font-semibold text-kin-navy">
                Reason<Text className="text-red-600"> *</Text>
              </Text>
              <View accessibilityRole="radiogroup" className="gap-2">
                {REPORT_REASONS.map((option) => {
                  const isSelected = reason === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityLabel={option}
                      accessibilityState={{ checked: isSelected }}
                      onPress={() => {
                        setReason(option);
                        setReasonError('');
                        if (option !== 'Other') setDetailsError('');
                      }}
                      className={`min-h-12 flex-row items-center rounded-xl border px-4 py-3 active:opacity-80 ${
                        isSelected ? 'border-kin-coral bg-kin-coral-50' : 'border-kin-stone-300'
                      }`}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                          isSelected ? 'border-kin-coral' : 'border-kin-stone-500'
                        }`}
                      >
                        {isSelected ? <View className="h-2.5 w-2.5 rounded-full bg-kin-coral" /> : null}
                      </View>
                      <Text className="ml-3 flex-1 text-[16px] text-kin-navy">{option}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {reasonError ? (
                <Text accessibilityRole="alert" className="mt-2 text-sm text-kin-coral-700">
                  {reasonError}
                </Text>
              ) : null}

              <Text className="mb-2 mt-5 text-sm font-semibold text-kin-navy">
                Additional details
                {detailsRequired ? (
                  <Text className="text-red-600"> *</Text>
                ) : (
                  <Text className="font-normal text-kin-stone-500"> (optional)</Text>
                )}
              </Text>
              <TextInput
                accessibilityLabel="Additional details"
                value={details}
                onChangeText={(text) => {
                  setDetails(text);
                  if (text.trim()) setDetailsError('');
                }}
                multiline
                textAlignVertical="top"
                maxLength={REPORT_DETAILS_MAX_LENGTH}
                className="h-28 rounded-xl border border-kin-stone-300 px-4 py-3 text-[16px] text-kin-navy"
              />
              <Text
                className={`mt-1 self-end text-xs ${
                  details.length >= REPORT_DETAILS_MAX_LENGTH ? 'text-kin-coral-700' : 'text-kin-stone-500'
                }`}
              >
                {details.length} / {REPORT_DETAILS_MAX_LENGTH}
              </Text>
              {detailsError ? (
                <Text accessibilityRole="alert" className="mt-1 text-sm text-kin-coral-700">
                  {detailsError}
                </Text>
              ) : null}

              {formError ? (
                <Text accessibilityRole="alert" className="mt-4 text-sm text-kin-coral-700">
                  {formError}
                </Text>
              ) : null}

              <View className="mt-6 flex-row gap-3">
                <ModalButton label="Cancel" onPress={handleClose} disabled={isSubmitting} />
                <ModalButton
                  label="Submit report"
                  loadingLabel="Submitting…"
                  onPress={() => void handleSubmit()}
                  isLoading={isSubmitting}
                  destructive
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

type ModalButtonProps = {
  label: string;
  onPress: () => void;
  loadingLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  destructive?: boolean;
};

const ModalButton = ({ label, onPress, loadingLabel, isLoading, disabled, destructive }: ModalButtonProps) => {
  const isDisabled = Boolean(disabled || isLoading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      disabled={isDisabled}
      onPress={onPress}
      className={`h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl active:opacity-80 ${
        destructive ? 'bg-kin-coral-700' : 'border border-kin-stone-300 bg-white'
      } ${isDisabled ? 'opacity-50' : ''}`}
    >
      {isLoading ? <ActivityIndicator color="#FFFFFF" /> : null}
      <Text className={`font-semibold ${destructive ? 'text-white' : 'text-kin-navy'}`}>
        {isLoading && loadingLabel ? loadingLabel : label}
      </Text>
    </Pressable>
  );
};
