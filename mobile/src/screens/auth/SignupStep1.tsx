import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { FormField } from '../../components/common/FormField';
import { PasswordField } from '../../components/common/PasswordField';
import { EMAIL_PATTERN, PASSWORD_HINT, PASSWORD_REGEX } from '../../constants/validation';
import { useUsernameAvailability } from '../../hooks/useUsernameAvailability';
import { authAPI } from '../../services/api';
import { getErrorMessage } from '../../utils/error';
import type { SignupStepProps } from './signupForm';

export const DUPLICATE_EMAIL_MESSAGE = 'This email is already registered. Please log in instead.';

type SignupStep1Props = SignupStepProps & {
  onNext: () => void;
};

const USERNAME_STATUS_CLASS = {
  available: 'text-green-700',
  checking: 'text-kin-stone-500',
} as const;

export const SignupStep1 = ({ form, onChange, setError, onNext }: SignupStep1Props) => {
  const [isChecking, setIsChecking] = useState(false);
  // Live availability check; an empty username is fine (one is generated).
  const { status: usernameStatus, message: usernameMessage, confirm: confirmUsername } =
    useUsernameAvailability(form.username);

  const validate = (): boolean => {
    const email = form.email.trim();
    if (!email) {
      setError('Please enter your email address.');
      return false;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!form.password) {
      setError('Please enter your password.');
      return false;
    }
    if (!form.confirmPassword) {
      setError('Please confirm your password.');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!PASSWORD_REGEX.test(form.password)) {
      setError(PASSWORD_HINT);
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    setError('');
    if (!validate()) return;

    setIsChecking(true);
    try {
      // Blocks Next on an invalid or taken username; re-checks if a check is pending or failed.
      const usernameProblem = await confirmUsername();
      if (usernameProblem) {
        setError(usernameProblem);
        return;
      }

      const result = await authAPI.checkEmail(form.email);
      if (!result.success || result.available === undefined) {
        setError('Unable to verify email. Please try again.');
        return;
      }
      if (!result.available) {
        setError(DUPLICATE_EMAIL_MESSAGE);
        return;
      }
      onNext();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Unable to verify email. Please try again.'));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View className="w-full">
      <Text className="mb-4 text-xl font-bold text-kin-navy">Create account</Text>

      <FormField
        label="Email"
        value={form.email}
        onChangeText={(email) => onChange({ email })}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
      />

      <FormField
        label="Username"
        helperText="Optional. 3-30 lowercase letters, numbers, or underscores. We'll create one for you if you leave this blank."
        value={form.username}
        onChangeText={(username) => onChange({ username: username.toLowerCase() })}
        placeholder="e.g., jane_doe"
        maxLength={30}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
      />
      {usernameMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          className={`-mt-3 mb-4 text-sm ${
            usernameStatus === 'available' || usernameStatus === 'checking'
              ? USERNAME_STATUS_CLASS[usernameStatus]
              : 'text-kin-coral-700'
          }`}
        >
          {usernameMessage}
        </Text>
      ) : null}

      <PasswordField
        label="Password"
        helperText="Must be at least 8 characters with uppercase, lowercase, and number"
        value={form.password}
        onChangeText={(password) => onChange({ password })}
        autoComplete="new-password"
      />

      <PasswordField
        label="Confirm password"
        value={form.confirmPassword}
        onChangeText={(confirmPassword) => onChange({ confirmPassword })}
      />

      <Button
        label="Next"
        onPress={handleNext}
        isLoading={isChecking}
        loadingLabel="Checking..."
        className="mt-2"
      />
    </View>
  );
};
