import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { FormField } from '../../components/common/FormField';
import { EMAIL_PATTERN } from '../../constants/validation';
import type { AuthStackParamList } from '../../navigation/types';
import { authAPI } from '../../services/api';
import { getErrorMessage } from '../../utils/error';

const kinmeetLogo = require('../../../assets/KinmeetLogo.png');

type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

/** Port of the web ForgotPassword page: sends a reset link; the link opens the web reset page. */
export const ForgotPasswordScreen = ({ navigation }: ForgotPasswordScreenProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccessMessage('');

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authAPI.forgotPassword(trimmed);
      setSuccessMessage(result.message || 'Password reset link sent. Please check your email.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-kin-beige"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-grow justify-center px-4 py-8"
      >
        <View className="rounded-3xl bg-white px-6 py-8">
          {/* Header */}
          <View className="mb-8 items-center">
            <Image
              source={kinmeetLogo}
              accessibilityLabel="KinMeet logo"
              className="mb-4 h-16 w-16"
              resizeMode="contain"
            />
            <Text accessibilityRole="header" className="text-3xl font-bold text-kin-navy">
              Forgot password?
            </Text>
            <Text className="mt-2 text-center text-sm text-kin-teal">
              Enter your registered email and we'll send you a reset link.
            </Text>
          </View>

          {successMessage ? (
            <>
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {successMessage}
              </Text>
              <Button label="Back to sign in" onPress={handleBackToLogin} />
            </>
          ) : (
            <>
              {error ? (
                <Text
                  accessibilityRole="alert"
                  className="mb-6 rounded-xl border border-kin-coral-200 bg-kin-coral-50 px-4 py-3 text-sm text-kin-coral-700"
                >
                  {error}
                </Text>
              ) : null}

              <FormField
                label="Email address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />

              <Button
                label="Send reset link"
                loadingLabel="Sending..."
                isLoading={isLoading}
                onPress={handleSubmit}
                className="mt-2"
              />
            </>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back to sign in page"
            hitSlop={8}
            onPress={handleBackToLogin}
            className="mt-6 self-center active:opacity-70"
          >
            <Text className="text-sm text-kin-stone-500">← Back to sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
